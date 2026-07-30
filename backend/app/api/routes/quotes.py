from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, Request, status
from sqlalchemy import func, select

from app.core import audit
from app.core.config import settings
from app.core.deps import AdminUser, CurrentUser, DbSession, get_current_user
from app.core.email import build_quote_answered_email, build_quote_notification, send_email
from app.core.notify import notificar
from app.core.ratelimit import LoginRateLimiter
from app.models.notification import NotificationType
from app.models.quote import Quote, QuoteStatus
from app.models.user import User
from app.schemas.quote import QuoteCreate, QuoteList, QuoteRead, QuoteStatusUpdate

router = APIRouter()

# Rate limiter for public quote submissions, keyed by (ip, email).
_quote_limiter = LoginRateLimiter(
    max_attempts=settings.QUOTE_RATE_LIMIT,
    window_seconds=settings.QUOTE_RATE_WINDOW,
    lockout_seconds=settings.QUOTE_RATE_WINDOW,
)

# Second limiter keyed by IP alone (sentinel "*" as the email part).
# Without this, rotating the customer_email on every request creates a fresh
# (ip, email) key each time and the limiter above never triggers — unlimited
# quote spam (and admin-notification emails) from a single IP.
_quote_ip_limiter = LoginRateLimiter(
    max_attempts=settings.QUOTE_RATE_LIMIT * 3,
    window_seconds=settings.QUOTE_RATE_WINDOW,
    lockout_seconds=settings.QUOTE_RATE_WINDOW,
)


# ---------------------------------------------------------------------------
# Public endpoint
# ---------------------------------------------------------------------------

@router.post("", response_model=QuoteRead, status_code=status.HTTP_201_CREATED)
def create_quote(data: QuoteCreate, db: DbSession, request: Request, background_tasks: BackgroundTasks) -> Quote:
    """Public endpoint — anyone can request a quote. Rate-limited by IP."""
    ip = audit.client_ip(request)
    locked_for = _quote_limiter.check(ip, data.customer_email or "anonymous") or _quote_ip_limiter.check(ip, "*")
    if locked_for:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Demasiadas solicitudes. Reintentá en {int(locked_for)} segundos.",
        )

    quote = Quote(**data.model_dump())
    db.add(quote)
    db.flush()
    db.refresh(quote)
    _quote_limiter.register_failure(ip, data.customer_email or "anonymous")
    _quote_ip_limiter.register_failure(ip, "*")
    audit.record(
        db,
        action="quote.create_public",
        actor_email=data.customer_email,
        entity="quote",
        entity_id=quote.id,
        request=request,
    )

    # Notify admin — runs after response is sent, never blocks the client
    background_tasks.add_task(
        send_email,
        **build_quote_notification(
            quote_id=quote.id,
            customer_name=data.customer_name,
            customer_email=data.customer_email,
            customer_phone=data.customer_phone,
            vehicle=data.vehicle,
            message=data.message,
        ),
    )
    return quote


# ---------------------------------------------------------------------------
# Authenticated user endpoints
# ---------------------------------------------------------------------------

@router.get("/me", response_model=QuoteList)
def my_quotes(
    current_user: CurrentUser,
    db: DbSession,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
) -> QuoteList:
    base = select(Quote).where(Quote.user_id == current_user.id)
    total = db.scalar(select(func.count()).select_from(base.subquery())) or 0
    items = list(db.scalars(base.order_by(Quote.created_at.desc()).offset(skip).limit(limit)).all())
    return QuoteList(items=items, total=total)


@router.post("/me", response_model=QuoteRead, status_code=status.HTTP_201_CREATED)
def create_my_quote(
    data: QuoteCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: DbSession,
) -> Quote:
    """Authenticated quote — automatically linked to the logged-in user."""
    quote = Quote(**data.model_dump(), user_id=current_user.id)
    db.add(quote)
    db.flush()
    db.refresh(quote)
    audit.record(db, action="quote.create_auth", actor=current_user, entity="quote", entity_id=quote.id)
    return quote


# ---------------------------------------------------------------------------
# Admin only
# ---------------------------------------------------------------------------

@router.get("", response_model=QuoteList)
def list_quotes(
    db: DbSession,
    _: AdminUser,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
    status_filter: str | None = Query(default=None, alias="status"),
) -> QuoteList:
    stmt = select(Quote)
    if status_filter:
        stmt = stmt.where(Quote.status == status_filter)
    stmt = stmt.order_by(Quote.created_at.desc())
    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    items = list(db.scalars(stmt.offset(skip).limit(limit)).all())
    return QuoteList(items=items, total=total)


@router.patch("/{quote_id}/status", response_model=QuoteRead)
def update_quote_status(
    quote_id: int,
    data: QuoteStatusUpdate,
    db: DbSession,
    admin: AdminUser,
    request: Request,
    background: BackgroundTasks,
) -> Quote:
    quote = db.get(Quote, quote_id)
    if not quote:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cotización no encontrada")
    anterior = quote.status
    quote.status = data.status
    db.add(quote)
    db.flush()
    db.refresh(quote)
    audit.record(
        db,
        action="quote.status_update",
        actor=admin,
        entity="quote",
        entity_id=quote.id,
        detail=data.status.value,
        request=request,
    )

    # Solo al pasar a Respondida. "En revisión" y "Finalizada" son estados del
    # flujo interno: al cliente no le cambian nada.
    if data.status == QuoteStatus.RESPONDIDA and anterior != QuoteStatus.RESPONDIDA:
        _avisar_cotizacion_respondida(db, quote, background)

    return quote


def _avisar_cotizacion_respondida(db: DbSession, quote: Quote, background: BackgroundTasks) -> None:
    """Avisa que la cotización fue respondida, con lo que haya disponible.

    Una cotización puede venir del formulario público, así que `user_id` y
    `customer_email` son los dos opcionales. Eso deja tres casos:

      * con cuenta y con mail  → campana + correo
      * anónima con mail       → solo correo (no hay a quién ponerle la campana)
      * anónima sin mail       → nada, y **no es un error**: alguien dejó su
                                 consulta con un teléfono y el contacto va a ser
                                 por WhatsApp

    Lo único inaceptable sería que el cambio de estado falle por no tener a
    quién avisarle. De ahí que este helper no valide nada: decide y sale.
    """
    nombre = (quote.customer_name or "").split()[0] or "Hola"

    email = None
    if quote.customer_email:
        email = build_quote_answered_email(
            to=quote.customer_email,
            name=nombre,
            quote_id=quote.id,
            vehicle=quote.vehicle,
        )

    if quote.user_id:
        notificar(
            db,
            user_id=quote.user_id,
            tipo=NotificationType.QUOTE_ANSWERED,
            titulo="Respondimos tu consulta",
            cuerpo=f"Consulta N.º {quote.id:05d}" + (f" · {quote.vehicle}" if quote.vehicle else ""),
            enlace="/cuenta/cotizaciones",
            email=email,
            background=background,
        )
        return

    # Anónima: no hay campana posible, pero el correo sí puede salir.
    if email:
        background.add_task(send_email, **email)
