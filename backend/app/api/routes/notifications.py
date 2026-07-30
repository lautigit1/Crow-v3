"""
Notificaciones de la persona autenticada.

**Ningún endpoint acepta un `user_id`.** Todos operan sobre `current_user`, así
que no hay permiso que validar y por lo tanto no hay permiso que se pueda
validar mal. Es más barato que verificar bien.
"""

from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import func, select, update

from app.core.deps import CurrentUser, DbSession
from app.models.notification import Notification
from app.schemas.notification import NotificationList, NotificationRead, UnreadCount

router = APIRouter()


def _contar_no_leidas(db: DbSession, user_id: int) -> int:
    return db.scalar(
        select(func.count())
        .select_from(Notification)
        .where(Notification.user_id == user_id, Notification.read_at.is_(None))
    ) or 0


@router.get("", response_model=NotificationList)
def listar(
    current_user: CurrentUser,
    db: DbSession,
    unread_only: bool = Query(False),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=50),
) -> NotificationList:
    """Las notificaciones propias, más recientes primero."""
    base = select(Notification).where(Notification.user_id == current_user.id)
    if unread_only:
        base = base.where(Notification.read_at.is_(None))

    total = db.scalar(select(func.count()).select_from(base.subquery())) or 0
    filas = db.scalars(
        base.order_by(Notification.created_at.desc()).offset(skip).limit(limit)
    ).all()

    # `unread` viaja siempre, también cuando se pidió la lista completa: es lo
    # que el badge necesita, y devolverlo acá evita una segunda request cuando
    # alguien abre el panel.
    return NotificationList(
        items=[NotificationRead.model_validate(f) for f in filas],
        total=total,
        unread=_contar_no_leidas(db, current_user.id),
    )


@router.get("/unread-count", response_model=UnreadCount)
def contador(current_user: CurrentUser, db: DbSession) -> UnreadCount:
    return UnreadCount(unread=_contar_no_leidas(db, current_user.id))


@router.patch("/{notification_id}/read", response_model=NotificationRead)
def marcar_leida(
    notification_id: int, current_user: CurrentUser, db: DbSession
) -> Notification:
    notificacion = db.get(Notification, notification_id)
    # Un 404 y no un 403 cuando es de otra persona: distinguirlos le confirmaría
    # a quien prueba IDs al azar que ese registro existe.
    if notificacion is None or notificacion.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No encontrada")

    # Idempotente: marcar dos veces no mueve la fecha original, que es el dato
    # que dice cuánto tardó en verla.
    if notificacion.read_at is None:
        notificacion.read_at = datetime.now(timezone.utc)
        db.add(notificacion)
        db.flush()
    return notificacion


@router.patch("/read-all", response_model=UnreadCount)
def marcar_todas(current_user: CurrentUser, db: DbSession) -> UnreadCount:
    """Marca todas las propias como leídas.

    Un solo UPDATE en vez de traer las filas y recorrerlas: con el índice
    `(user_id, read_at)` es una operación puntual, sin importar cuántas haya
    acumuladas.
    """
    db.execute(
        update(Notification)
        .where(Notification.user_id == current_user.id, Notification.read_at.is_(None))
        .values(read_at=datetime.now(timezone.utc))
    )
    db.flush()
    return UnreadCount(unread=0)
