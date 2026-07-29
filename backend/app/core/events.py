"""
Canal de eventos del servidor al navegador (pub/sub).

Existe por una razón concreta: **la API corre con varios workers** (4 en
producción, 2 en desarrollo) y son procesos separados, sin memoria compartida.
El pedido entra por un worker y el admin puede estar conectado a otro:

                        ┌── worker 1 ──┐
    POST /orders  ──────┤              │   ← el pedido entra por acá
                        └──────────────┘
                        ┌── worker 2 ──┐
    GET /api/events ────┤              │   ← el admin está conectado acá
                        └──────────────┘

Una cola en memoria del proceso andaría perfecto con un solo worker, entregaría
el evento una de cada dos veces con dos, y sería un misterio en producción.
Por eso el evento viaja por Redis pub/sub, que ya está en el stack.

Lo que circula es una SEÑAL, no los datos:

    {"type": "order.created", "order_id": 412}

El navegador recibe eso y vuelve a pedir la lista por la API de siempre. Así el
canal nunca transporta nombres, teléfonos ni totales -- un error en el filtrado
de canales expone un número de pedido, no los datos de otro cliente -- y los
permisos siguen viviendo en un solo lugar.

Ver openspec/changes/live-order-events/design.md §1 y §2.
"""

from __future__ import annotations

import asyncio
import json
import logging
from collections.abc import AsyncIterator
from typing import Any

from app.core.config import settings
from app.core.redis_client import get_redis

logger = logging.getLogger(__name__)

# Prefijo de los canales en Redis. Evita chocar con las claves de rate limiting
# y de cache, que viven en la misma base.
_PREFIJO = "crow:eventos:"

# Canal que reciben todos los admins.
CANAL_ADMIN = "admin"


def canal_usuario(user_id: int) -> str:
    """Canal propio de una persona: solo los eventos de sus pedidos."""
    return f"user:{user_id}"


# ---------------------------------------------------------------------------
# Fallback en memoria (sin Redis)
# ---------------------------------------------------------------------------
# `REDIS_URL` vacía es un escenario real: los tests lo fuerzan (conftest.py) y
# alguien puede levantar la API sin Redis. Sin esto, en desarrollo no se vería
# ningún evento y la feature parecería rota.
#
# OJO con la parte sutil: las rutas que publican son `def` sync, así que FastAPI
# las corre en un hilo del threadpool, mientras que estas colas viven en el
# event loop. `asyncio.Queue.put_nowait` NO es thread-safe -- llamarlo desde el
# hilo del handler anda casi siempre y se rompe de forma intermitente, que es
# lo peor que puede pasar. Por eso se guarda el loop en el arranque y se publica
# con `call_soon_threadsafe`.
_colas: dict[str, set[asyncio.Queue[dict[str, Any]]]] = {}
_loop: asyncio.AbstractEventLoop | None = None


def registrar_loop(loop: asyncio.AbstractEventLoop) -> None:
    """Guarda el event loop del proceso. Se llama una vez, en el lifespan."""
    global _loop
    _loop = loop


def _publicar_en_memoria(canal: str, mensaje: dict[str, Any]) -> None:
    colas = _colas.get(canal)
    if not colas or _loop is None:
        return
    # Copia del set: el consumidor puede desuscribirse mientras iteramos.
    for cola in list(colas):
        _loop.call_soon_threadsafe(cola.put_nowait, mensaje)


# ---------------------------------------------------------------------------
# Publicar
# ---------------------------------------------------------------------------

def publicar(canales: list[str], tipo: str, **datos: Any) -> None:
    """Emite un evento a uno o más canales.

    **Nunca propaga una excepción.** Se llama desde el alta de un pedido y
    desde el PATCH de admin: que falle el aviso no puede voltear la operación
    que lo generó. Un pedido guardado y no avisado es un inconveniente; un
    pedido que no se guarda porque Redis estaba caído es un problema.
    """
    mensaje = {"type": tipo, **datos}
    try:
        cliente = get_redis()
        if cliente is not None:
            crudo = json.dumps(mensaje)
            for canal in canales:
                cliente.publish(_PREFIJO + canal, crudo)
            return
        for canal in canales:
            _publicar_en_memoria(canal, mensaje)
    except Exception as exc:  # noqa: BLE001 -- deliberado, ver docstring
        logger.warning("No se pudo publicar el evento %s: %s", tipo, exc)


# ---------------------------------------------------------------------------
# Suscribirse
# ---------------------------------------------------------------------------

async def suscribir(canales: list[str]) -> AsyncIterator[dict[str, Any]]:
    """Itera los eventos de esos canales hasta que quien consume se va.

    Usa un cliente `redis.asyncio` propio y no el sync que ya existe: una
    suscripción bloquea la conexión mientras espera, y el cliente sync lo
    comparten el rate limiter, la blocklist y el cache del dashboard. Colgarles
    la conexión esperando un evento dejaría media API sin Redis.
    """
    if settings.REDIS_URL:
        async for mensaje in _suscribir_redis(canales):
            yield mensaje
        return

    async for mensaje in _suscribir_memoria(canales):
        yield mensaje


async def _suscribir_redis(canales: list[str]) -> AsyncIterator[dict[str, Any]]:
    import redis.asyncio as aioredis

    cliente = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
    pubsub = cliente.pubsub()
    try:
        await pubsub.subscribe(*[_PREFIJO + c for c in canales])
        while True:
            # `timeout` para que el generador ceda el control con regularidad:
            # sin eso, cancelar la tarea cuando el navegador corta puede quedar
            # esperando indefinidamente a que llegue un mensaje.
            crudo = await pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)
            if crudo is None:
                continue
            try:
                yield json.loads(crudo["data"])
            except (ValueError, KeyError, TypeError):
                logger.warning("Evento con formato inesperado: %r", crudo)
    finally:
        # Cerrar SIEMPRE, también si el consumidor se fue: cada conexión
        # colgada es una conexión a Redis que no vuelve.
        try:
            await pubsub.aclose()
            await cliente.aclose()
        except Exception as exc:  # noqa: BLE001
            logger.warning("Error cerrando la suscripción a Redis: %s", exc)


async def _suscribir_memoria(canales: list[str]) -> AsyncIterator[dict[str, Any]]:
    cola: asyncio.Queue[dict[str, Any]] = asyncio.Queue()
    for canal in canales:
        _colas.setdefault(canal, set()).add(cola)
    try:
        while True:
            yield await cola.get()
    finally:
        for canal in canales:
            suscriptores = _colas.get(canal)
            if suscriptores:
                suscriptores.discard(cola)
                if not suscriptores:
                    del _colas[canal]


def _reset_memoria() -> None:
    """Limpia el estado en memoria. Solo para los tests."""
    _colas.clear()
