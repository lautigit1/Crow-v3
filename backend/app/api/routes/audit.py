from fastapi import APIRouter, Query
from sqlalchemy import func, select

from app.core.deps import AdminUser, DbSession
from app.models.audit import AuditLog
from app.schemas.audit import AuditLogList

router = APIRouter()


@router.get("", response_model=AuditLogList)
def list_audit(
    db: DbSession,
    _: AdminUser,
    action: str | None = Query(default=None, description="Filtrar por nombre de acción (ej: login.failure, product.create)"),
    actor_id: int | None = Query(default=None),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
) -> AuditLogList:
    stmt = select(AuditLog)

    if action:
        # Support prefix matching: "login" matches "login.success", "login.failure"
        stmt = stmt.where(AuditLog.action.like(f"{action}%"))
    if actor_id is not None:
        stmt = stmt.where(AuditLog.actor_id == actor_id)

    total = db.scalar(select(func.count()).select_from(stmt.order_by(None).subquery())) or 0
    items = list(
        db.scalars(stmt.order_by(AuditLog.created_at.desc()).offset(skip).limit(limit)).all()
    )
    return AuditLogList(items=items, total=total)
