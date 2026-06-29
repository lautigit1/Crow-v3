import logging

from fastapi import Request
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import SessionLocal
from app.models.audit import AuditLog
from app.models.user import User

_logger = logging.getLogger("crow.audit")


def client_ip(request: Request) -> str | None:
    """
    Returns the real client IP.

    Only trusts X-Forwarded-For when the direct peer (request.client.host)
    is in settings.TRUSTED_PROXIES — prevents IP spoofing via forged headers.

    In local dev (TRUSTED_PROXIES is empty), falls back to request.client.host
    directly so rate limiting still works without any extra configuration.
    """
    peer = request.client.host if request.client else None
    if peer and peer in settings.trusted_proxy_set:
        fwd = request.headers.get("x-forwarded-for")
        if fwd:
            return fwd.split(",")[0].strip()
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
