import ipaddress
import logging

from fastapi import Request
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import SessionLocal
from app.models.audit import AuditLog
from app.models.user import User

_logger = logging.getLogger("crow.audit")


def _peer_is_trusted_proxy(peer: str) -> bool:
    """True si el peer directo cae dentro de alguna red de TRUSTED_PROXIES.

    Acepta IPs sueltas y rangos CIDR (ej. la subnet fija del compose,
    172.28.0.0/16) — así recrear el contenedor nginx no rompe nada.
    """
    try:
        addr = ipaddress.ip_address(peer)
    except ValueError:
        return False  # peer no es una IP (ej. "testclient" en tests)
    return any(addr in network for network in settings.trusted_proxy_networks)


def client_ip(request: Request) -> str | None:
    """
    Devuelve la IP real del cliente.

    Solo mira `X-Forwarded-For` si el peer directo está dentro de
    `TRUSTED_PROXIES`; si no, cualquiera podría inventar el header. En dev
    (`TRUSTED_PROXIES` vacío) cae a `request.client.host`, así el rate limiting
    funciona sin configurar nada.

    **Se recorre de derecha a izquierda, y esa es la parte que importa.**

    Cada proxy AGREGA su entrada al final, así que la cadena que llega es
    `<lo que mandó el cliente>, <lo que vio Caddy>, <lo que vio nginx>`. La
    primera entrada no la escribió ningún proxy: la escribió quien hizo la
    petición, y por lo tanto vale exactamente lo que valga su palabra.

    Tomar la primera era la versión anterior de esta función, y hacía que:

      - los limitadores por IP fueran evadibles mandando un
        `X-Forwarded-For` distinto en cada intento. Los de registro, reset de
        contraseña y cotizaciones se llavean SOLO por IP, así que quedaban
        anulados por completo;
      - la columna `ip` del log de auditoría fuera de escritura libre: se podía
        firmar cualquier acción con la IP de otro, que es peor que no guardarla,
        porque parece evidencia.

    Yendo desde el final y descartando los proxies conocidos se llega a la
    última entrada que un tercero NO pudo elegir: la que agregó nuestro propio
    borde al ver la conexión de verdad. Es el mismo criterio que ya usa nginx
    acá al lado con `real_ip_recursive on` (ver `frontend/nginx.conf`), y
    conviene que las dos capas cuenten la misma historia.

    Si TODAS las entradas caen en `TRUSTED_PROXIES` -- caso raro, tráfico
    interno -- no queda ninguna IP de cliente que reportar y se devuelve el peer.
    """
    peer = request.client.host if request.client else None
    if peer and _peer_is_trusted_proxy(peer):
        fwd = request.headers.get("x-forwarded-for")
        if fwd:
            for entrada in reversed(fwd.split(",")):
                candidata = entrada.strip()
                if candidata and not _peer_is_trusted_proxy(candidata):
                    return candidata
    return peer


def record(
    db: Session,
    *,
    action: str,
    actor: User | None = None,
    actor_email: str | None = None,
    entity: str | None = None,
    entity_id: str | int | None = None,
    detail: str | None = None,
    request: Request | None = None,
) -> None:
    """
    Append an audit entry inside the current Unit of Work.

    Uses a nested SAVEPOINT so that an audit failure (e.g. a constraint error or
    a bug in the log model) never rolls back the main business operation.
    The audit row is silently skipped and an error is logged instead.
    """
    entry = AuditLog(
        actor_id=actor.id if actor else None,
        actor_email=actor_email or (actor.email if actor else None),
        action=action,
        entity=entity,
        entity_id=str(entity_id) if entity_id is not None else None,
        detail=detail,
        ip_address=client_ip(request) if request else None,
    )
    # Nested transaction (SAVEPOINT) — rolls back only the audit row on failure,
    # leaving the outer transaction intact.
    try:
        with db.begin_nested():
            db.add(entry)
    except Exception as exc:
        _logger.error(
            "Failed to write audit log — skipping (main transaction preserved)",
            extra={"action": action, "error": str(exc)},
        )


def record_standalone(**kwargs) -> None:
    """
    Persist an audit entry in its own committed transaction. Used for events
    that end in an HTTP error (e.g. failed logins), where the request's Unit of
    Work will roll back and would otherwise discard the entry.
    """
    db = SessionLocal()
    try:
        record(db, **kwargs)
        db.commit()
    except Exception:
        db.rollback()
    finally:
        db.close()
