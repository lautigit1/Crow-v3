"""
Canal SSE: el servidor le avisa al navegador cuando algo cambia.

Ver openspec/changes/live-order-events/design.md.
"""

import asyncio
import json
import logging
import time
from collections.abc import AsyncIterator
from typing import Annotated

import jwt
from fastapi import APIRouter, Cookie
from fastapi.responses import StreamingResponse

from app.core import events
from app.core.config import settings
from app.core.deps import CurrentUser
from app.core.redis_client import RedisCaido
from app.core.security import TOKEN_AUDIENCE
from app.core.token_blocklist import token_blocklist
from app.models.user import UserRole

logger = logging.getLogger(__name__)

router = APIRouter()

# Cada cuánto se manda un comentario SSE si no hubo eventos. Sin esto, nginx y
# cualquier proxy intermedio cortan una conexión que estuvo callada un minuto y
# el navegador queda reconectando en loop. 25s deja margen bajo el default de
# 60s de nginx.
_LATIDO_SEGUNDOS = 25.0

# Techo de vida de una conexión cuando no se pudo leer el `exp` del token.
# No debería pasar -- la ruta solo se alcanza con un access token válido --
# pero un stream sin fecha de corte es un stream para siempre.
_VIDA_MAXIMA_SEGUNDOS = 3600.0


def _sesion_sigue_viva(jti: str | None, vence_en: float) -> bool:
    """¿La sesión que abrió este stream sigue valiendo?

    La autenticación de una conexión SSE pasa UNA vez, al abrirla, y después
    la respuesta puede quedar abierta horas. Sin esto, cerrar sesión no cortaba
    el canal: el navegador seguía recibiendo eventos de los pedidos con una
    sesión ya revocada, y el access token vencido tampoco lo interrumpía. Era
    la única parte del sistema donde `token_version` y la blocklist no
    llegaban.

    Se mira en cada latido (~25 s), que es la resolución con la que se corta.
    No toca la base a propósito -- el generador corre en el event loop y una
    consulta sync lo bloquearía (ver la nota en `stream_de_eventos`) -- así que
    se queda con lo que se puede saber sin ella: vencimiento y revocación.
    Un cambio de rol o una baja de la cuenta se aplican cuando el navegador
    reconecta, o sea a más tardar al vencer el token.
    """
    if time.time() >= vence_en:
        return False
    if not jti:
        return True
    try:
        return not token_blocklist.is_blocked(jti)
    except RedisCaido:
        # Mismo criterio que en el resto del sistema: sin el store que dice
        # qué se revocó, no se sostiene una sesión abierta. Se corta y el
        # navegador reintenta -- si Redis volvió, reconecta y sigue; si no, se
        # come el 503 como cualquier otra request.
        logger.warning("Redis caído: se corta el stream de eventos")
        return False


async def _stream(canales: list[str], jti: str | None, vence_en: float) -> AsyncIterator[str]:
    suscripcion = events.suscribir(canales)

    # El primer evento se pide como Task y NO se cancela cuando vence el
    # latido.
    #
    # La forma obvia sería `asyncio.wait_for(anext(...), timeout=25)`, pero
    # `wait_for` cancela la corrutina al vencer, y volver a pedirle un elemento
    # al generador después de eso falla con "asynchronous generator is already
    # running". `asyncio.wait` espera sin cancelar: si no llegó nada, se manda
    # el latido y se sigue esperando la MISMA tarea.
    tarea = asyncio.create_task(anext(suscripcion))  # type: ignore[arg-type]
    try:
        # Un primer envío inmediato: hasta que no llega el primer byte, el
        # navegador no considera abierta la conexión y `onopen` no dispara.
        yield ": conectado\n\n"

        while True:
            listas, _ = await asyncio.wait({tarea}, timeout=_LATIDO_SEGUNDOS)

            # Antes de mandar nada, latido incluido: si la sesión dejó de valer
            # mientras esperábamos, este es el momento de irse. Va acá y no al
            # abrir porque el problema no es entrar, es quedarse.
            if not _sesion_sigue_viva(jti, vence_en):
                yield ": sesion terminada\n\n"
                return

            if not listas:
                yield ": ping\n\n"
                continue

            mensaje = tarea.result()
            yield f"data: {json.dumps(mensaje)}\n\n"
            tarea = asyncio.create_task(anext(suscripcion))  # type: ignore[arg-type]
    except asyncio.CancelledError:
        # El navegador cerró la pestaña o cortó. No es un error.
        raise
    finally:
        tarea.cancel()
        try:
            await tarea
        except (asyncio.CancelledError, StopAsyncIteration):
            pass
        except Exception as exc:  # noqa: BLE001
            logger.warning("Error cerrando el stream de eventos: %s", exc)
        await suscripcion.aclose()


@router.get("/events")
async def stream_de_eventos(
    current_user: CurrentUser,
    access_token: Annotated[str | None, Cookie()] = None,
) -> StreamingResponse:
    """Eventos en vivo para la sesión actual.

    Es `async def` por necesidad, no por estilo: si fuera `def`, FastAPI lo
    correría en un hilo del threadpool y **cada pestaña abierta ocuparía un
    hilo para siempre**. Con el pool por defecto, unas pocas conexiones dejarían
    la API sin hilos para atender requests normales.

    Por lo mismo, el generador no puede tocar la sesión sync de SQLAlchemy:
    bloquearía el event loop. La única consulta a la base pasa una vez acá, al
    resolver `CurrentUser`, antes de empezar a emitir.

    Los canales se eligen **del lado del servidor** según quién sea: una persona
    solo recibe los eventos de sus propios pedidos. El navegador no elige a qué
    se suscribe.
    """
    canales = [events.canal_usuario(current_user.id)]
    if current_user.role == UserRole.ADMIN:
        canales.append(events.CANAL_ADMIN)

    # El `jti` y el `exp` del token con el que se abrió, para poder cortar el
    # stream cuando esa sesión deje de valer (ver `_sesion_sigue_viva`).
    # `CurrentUser` ya validó el token, así que acá decodificar no puede
    # fallar; el except está por si algún día deja de ser cierto, y en ese
    # caso el stream vive el techo por defecto en vez de para siempre.
    jti: str | None = None
    vence_en = time.time() + _VIDA_MAXIMA_SEGUNDOS
    if access_token:
        try:
            claims = jwt.decode(
                access_token,
                settings.SECRET_KEY,
                algorithms=[settings.ALGORITHM],
                audience=TOKEN_AUDIENCE,
            )
            jti = claims.get("jti")
            vence_en = float(claims.get("exp", vence_en))
        except Exception:  # noqa: BLE001 -- ver comentario de arriba
            logger.warning("No se pudo leer el access token del stream de eventos")

    return StreamingResponse(
        _stream(canales, jti, vence_en),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            # Le dice a nginx que no bufferee esta respuesta. Está también en la
            # config de nginx; va acá además porque si algún día la API queda
            # detrás de otro proxy, esta cabecera viaja con la respuesta.
            "X-Accel-Buffering": "no",
        },
    )
