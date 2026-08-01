import secrets
from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, Request, status
from sqlalchemy import func, select

from app.core import audit, events
from app.core.config import settings
from app.core.deps import AdminUser, CurrentUser, DbSession, get_current_user
from app.core.email import (
    build_account_created_email,
    build_order_update_email,
    build_quote_answered_email,
    build_quote_notification,
    send_email,
)
from app.core.notify import notificar
from app.core.ratelimit import LoginRateLimiter
from app.core.security import create_reset_token, hash_password
from app.models.notification import NotificationType
from app.models.order import Order, OrderItem
from app.models.quote import Quote, QuoteOption, QuoteStatus
from app.models.user import User
from app.schemas.order import OrderRead
from app.schemas.quote import (
    QuoteConvertRequest,
    QuoteCreate,
    QuoteList,
    QuoteOptionCreate,
    QuoteOptionUpdate,
    QuoteRead,
    QuoteStatusUpdate,
)

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


# ---------------------------------------------------------------------------
# Opciones cotizadas (admin)
# ---------------------------------------------------------------------------

def _get_quote_or_404(quote_id: int, db: DbSession) -> Quote:
    quote = db.get(Quote, quote_id)
    if not quote:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cotización no encontrada")
    return quote


@router.post(
    "/{quote_id}/options",
    response_model=QuoteRead,
    status_code=status.HTTP_201_CREATED,
)
def add_quote_option(
    quote_id: int,
    data: QuoteOptionCreate,
    db: DbSession,
    admin: AdminUser,
    request: Request,
    background: BackgroundTasks,
) -> Quote:
    """Agrega una alternativa cotizada y, si es la primera, responde la cotización.

    **El estado pasa a "Respondida" solo**, al cargar la primera opción. Que
    dependa de que alguien se acuerde de cambiarlo a mano es la forma segura de
    que el cliente nunca se entere de que ya lo cotizaste.
    """
    quote = _get_quote_or_404(quote_id, db)

    quote.options.append(QuoteOption(**data.model_dump()))

    primera_respuesta = quote.answered_at is None
    if primera_respuesta:
        quote.answered_at = datetime.now(timezone.utc)
        quote.status = QuoteStatus.RESPONDIDA

    db.add(quote)
    db.flush()
    db.refresh(quote)

    audit.record(
        db,
        action="quote.option_add",
        actor=admin,
        entity="quote",
        entity_id=quote.id,
        detail=f"{data.title} — {data.unit_price}",
        request=request,
    )

    # El aviso sale una sola vez: al responder. Cargar una segunda opción cinco
    # minutos después no es una novedad para el cliente, es la misma respuesta
    # terminándose de escribir.
    if primera_respuesta:
        _avisar_cotizacion_respondida(db, quote, background)

    return quote


@router.patch("/{quote_id}/options/{option_id}", response_model=QuoteRead)
def update_quote_option(
    quote_id: int,
    option_id: int,
    data: QuoteOptionUpdate,
    db: DbSession,
    _admin: AdminUser,
) -> Quote:
    quote = _get_quote_or_404(quote_id, db)
    opcion = next((o for o in quote.options if o.id == option_id), None)
    if opcion is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Opción no encontrada")

    for campo, valor in data.model_dump(exclude_unset=True).items():
        setattr(opcion, campo, valor)

    db.add(opcion)
    db.flush()
    db.refresh(quote)
    return quote


@router.delete("/{quote_id}/options/{option_id}", response_model=QuoteRead)
def delete_quote_option(
    quote_id: int, option_id: int, db: DbSession, _admin: AdminUser
) -> Quote:
    quote = _get_quote_or_404(quote_id, db)
    opcion = next((o for o in quote.options if o.id == option_id), None)
    if opcion is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Opción no encontrada")

    # Borrar la última opción NO vuelve la cotización a "Nueva" ni borra
    # `answered_at`: el cliente ya recibió el aviso de que estaba respondida, y
    # deshacer eso del lado del sistema no deshace el correo que ya salió.
    quote.options.remove(opcion)
    db.flush()
    db.refresh(quote)
    return quote


# ---------------------------------------------------------------------------
# Convertir en pedido (admin)
# ---------------------------------------------------------------------------

@router.post("/{quote_id}/convert", response_model=OrderRead, status_code=status.HTTP_201_CREATED)
def convert_quote_to_order(
    quote_id: int,
    data: QuoteConvertRequest,
    db: DbSession,
    admin: AdminUser,
    request: Request,
    background: BackgroundTasks,
) -> Order:
    """Crea el pedido que sale de una opción cotizada.

    Endpoint propio y no un modo de `create_order` (design §5): aquel valida
    producto, stock y tope de pedidos por usuario, y **ninguna de esas reglas
    aplica acá**. No hay producto -- se está trayendo a pedido --, no hay stock
    que descontar, y el que crea el pedido es el admin, no el cliente.

    Devuelve el **pedido**, no la cotización: después de convertir, donde el
    admin quiere estar es en el pedido.
    """
    quote = _get_quote_or_404(quote_id, db)

    if quote.order_id is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Esta cotización ya generó el pedido N.º {quote.order_id:05d}.",
        )

    opcion = next((o for o in quote.options if o.id == data.option_id), None)
    if opcion is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Opción no encontrada")

    user, cuenta_nueva = _resolver_cliente(quote, db)

    # La cotización queda enganchada a la cuenta aunque haya entrado anónima:
    # sin esto el cliente entra a "Mis cotizaciones" y no ve la consulta que
    # originó su propio pedido.
    if quote.user_id is None:
        quote.user_id = user.id

    order = Order(user_id=user.id, notes=_notas_del_pedido(quote, opcion))
    db.add(order)
    db.flush()

    # Línea libre: `product_id = NULL` y todo en los snapshots que `OrderItem`
    # ya tiene. **No se toca stock** -- no hay producto que descontar (design
    # §4). Por lo mismo, cancelar este pedido no devuelve nada: `_restore_stock`
    # saltea las líneas sin `product_id`.
    db.add(
        OrderItem(
            order_id=order.id,
            product_id=None,
            # El SKU es obligatorio y acá no hay ninguno. En vez de un "-" que
            # no dice nada, la referencia a la cotización: es el dato que
            # permite volver de una línea de pedido a la consulta que la generó.
            sku_snapshot=f"COT-{quote.id:05d}",
            name_snapshot=opcion.title[:200],
            unit_price_snapshot=float(opcion.unit_price),
            quantity=opcion.quantity,
        )
    )

    quote.order_id = order.id
    quote.status = QuoteStatus.FINALIZADA

    db.flush()
    db.refresh(order)

    audit.record(
        db,
        action="quote.convert",
        actor=admin,
        entity="order",
        entity_id=order.id,
        detail=f"cotización {quote.id} · opción {opcion.id}",
        request=request,
    )

    _avisar_pedido_convertido(db, quote, order, opcion, user, cuenta_nueva, background)

    # Para el resto de los admins: el que convirtió ya está viendo el resultado,
    # pero el panel de al lado no se entera solo.
    background.add_task(
        events.publicar, [events.CANAL_ADMIN], "order.created", order_id=order.id
    )
    return order


def _notas_del_pedido(quote: Quote, opcion: QuoteOption) -> str:
    """De dónde salió el pedido, en el campo que el cliente también ve.

    El **plazo** va acá y no se pierde: es lo que se le prometió al cliente al
    cotizar, y `OrderItem` no tiene dónde guardarlo. Sin esto, la única parte de
    la cotización que sobrevive a la conversión sería el precio.
    """
    partes = [f"Generado desde la consulta N.º {quote.id:05d}"]
    if quote.vehicle:
        partes.append(quote.vehicle)
    if opcion.lead_time:
        partes.append(f"Plazo estimado: {opcion.lead_time}")
    if opcion.detail:
        partes.append(opcion.detail)
    return " · ".join(partes)


def _resolver_cliente(quote: Quote, db: DbSession) -> tuple[User, bool]:
    """A nombre de quién queda el pedido. Devuelve `(usuario, es_cuenta_nueva)`.

    `Order.user_id` es NO nullable y una cotización puede venir del formulario
    público sin ninguna cuenta detrás. Tres casos (design §3):

      * con `user_id`          → esa cuenta, directo
      * anónima **con** mail   → se busca por email y si no existe se crea
      * anónima **sin** mail   → 409, y el mensaje dice qué hacer

    El tercero **no es un error del sistema**: alguien dejó su consulta con un
    teléfono nada más, que es perfectamente razonable en un negocio donde el
    contacto es por WhatsApp. Por eso devuelve un 409 con instrucciones y no un
    500.
    """
    if quote.user_id is not None:
        user = db.get(User, quote.user_id)
        if user is not None and user.is_active:
            return user, False
        # La cuenta se dio de baja después de cotizar. Cae al camino por email.

    if not quote.customer_email:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Esta consulta no tiene email ni cuenta asociada, y un pedido "
                "necesita un cliente. Pedile el correo por WhatsApp y cargalo "
                "en la consulta, o creale la cuenta desde Clientes."
            ),
        )

    email = quote.customer_email.strip()
    # Comparación en minúsculas: el email es único en la base, pero si alguien
    # cotizó como "Juan@..." y se registró como "juan@...", una búsqueda exacta
    # no lo encuentra y el INSERT explota contra el índice único. Buscar así es
    # lo que evita la cuenta duplicada (design §9).
    existente = db.scalar(select(User).where(func.lower(User.email) == email.lower()))
    if existente is not None:
        if not existente.is_active:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"La cuenta de {existente.email} está desactivada. Reactivala para poder crearle el pedido.",
            )
        return existente, False

    user = User(
        full_name=quote.customer_name or email,
        email=email,
        phone=quote.customer_phone,
        # Nace SIN CONTRASEÑA UTILIZABLE: un hash de un secreto aleatorio que no
        # existe en ningún lado. Nadie puede entrar hasta que la persona defina
        # la suya con el enlace del correo. Es lo que hace que crear la cuenta
        # sin que la haya pedido no abra un acceso.
        hashed_password=hash_password(secrets.token_urlsafe(48)),
    )
    db.add(user)
    db.flush()
    return user, True


def _avisar_pedido_convertido(
    db: DbSession,
    quote: Quote,
    order: Order,
    opcion: QuoteOption,
    user: User,
    cuenta_nueva: bool,
    background: BackgroundTasks,
) -> None:
    """Un solo correo, y cuál depende de si la persona ya podía entrar.

    A quien **acaba de recibir una cuenta** no se le manda el aviso normal de
    pedido: lo invita a "ver tus pedidos" en una cuenta a la que todavía no
    puede entrar. Va el correo de cuenta creada, que lleva el detalle del pedido
    y además el enlace para definir la contraseña. Dos correos simultáneos
    diciendo lo mismo con dos llamados a la acción distintos es peor que uno.

    La campana se registra en los dos casos: cuando la persona entre, el aviso
    la está esperando.
    """
    nombre = (user.full_name or "").split()[0] or "Hola"

    if cuenta_nueva:
        token, _ = create_reset_token(user.id)
        email = build_account_created_email(
            to=user.email,
            name=nombre,
            reset_url=f"{settings.FRONTEND_URL}/reset-password?token={token}",
            order_id=order.id,
            item_titulo=opcion.title,
            vehicle=quote.vehicle,
            lead_time=opcion.lead_time,
        )
    else:
        email = build_order_update_email(
            to=user.email,
            name=nombre,
            order_id=order.id,
            titulo="Tomamos tu pedido",
            resumen=f"Convertimos tu consulta N.º {quote.id:05d} en el pedido N.º {order.id:05d}.",
            estado_entrega=order.status.value,
            detalle=opcion.title,
        )

    notificar(
        db,
        user_id=user.id,
        tipo=NotificationType.ORDER_STATUS,
        titulo="Tomamos tu pedido",
        cuerpo=f"Pedido N.º {order.id:05d} · {opcion.title}",
        enlace="/cuenta/pedidos",
        email=email,
        background=background,
    )


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
