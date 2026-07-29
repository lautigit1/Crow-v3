"""
Canal SSE: el servidor le avisa al navegador cuando algo cambia.

Ver openspec/changes/live-order-events/design.md.
"""

import asyncio
import json
import logging
from collections.abc import AsyncIterator

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from app.core import events
from app.core.deps import CurrentUser
from app.models.user import UserRole

logger = logging.getLogger(__name__)

router = APIRouter()

# Cada cuánto se manda un comentario SSE si no hubo eventos. Sin esto, nginx y
# cualquier proxy intermedio cortan una conexión que estuvo callada un minuto y
# el navegador queda reconectando en loop. 25s deja margen bajo el default de
# 60s de nginx.
_LATIDO_SEGUNDOS = 25.0


async def _stream(canales: list[str]) -> AsyncIterator[str]:
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
async def stream_de_eventos(current_user: CurrentUser) -> StreamingResponse:
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

    return StreamingResponse(
        _stream(canales),
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
