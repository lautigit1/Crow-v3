import enum
from datetime import datetime

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class QuoteStatus(str, enum.Enum):
    NUEVA = "Nueva"
    EN_REVISION = "En revisión"
    RESPONDIDA = "Respondida"
    FINALIZADA = "Finalizada"


class Quote(Base):
    __tablename__ = "quotes"

    # Replica la CHECK constraint de la migración 011 -- ver comentario
    # equivalente en app/models/product.py. Usa trim() en vez de btrim()
    # (la función que usa la migración real en Postgres) porque este texto
    # también se ejecuta contra SQLite en los tests, que no tiene btrim();
    # trim() sin argumentos es SQL estándar y se comporta igual en ambos
    # motores (recorta espacios en blanco de los dos extremos).
    __table_args__ = (
        CheckConstraint("length(trim(message)) > 0", name="ck_quotes_message_not_blank"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    customer_name: Mapped[str] = mapped_column(String(120))
    customer_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    customer_phone: Mapped[str | None] = mapped_column(String(40), nullable=True)
    vehicle: Mapped[str | None] = mapped_column(String(160), nullable=True)
    message: Mapped[str] = mapped_column(Text)
    status: Mapped[QuoteStatus] = mapped_column(Enum(QuoteStatus), default=QuoteStatus.NUEVA, nullable=False)

    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    product_id: Mapped[int | None] = mapped_column(ForeignKey("products.id", ondelete="SET NULL"), nullable=True)

    # Cuándo se cargó la primera opción. Fecha y no booleano: responde además
    # cuánto se tardó en contestar, que es un número que se va a querer mirar.
    answered_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    # El pedido que salió de esta cotización, si se convirtió.
    #
    # El enlace vive acá y no en `orders` porque la cotización es la que tiene
    # vida más larga y la que se consulta. Y deja explícito que una cotización
    # genera como mucho UN pedido: si el cliente después pide otra cosa, es
    # otra cotización.
    order_id: Mapped[int | None] = mapped_column(
        ForeignKey("orders.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    options: Mapped[list["QuoteOption"]] = relationship(
        "QuoteOption",
        back_populates="quote",
        cascade="all, delete-orphan",
        order_by="QuoteOption.id",
    )


class QuoteOption(Base):
    """Una alternativa cotizada: original, alternativo, usado.

    Van como filas y no como columnas (`precio_1`, `precio_2`...) porque
    cotizar un repuesto casi siempre implica ofrecer varias, y no hay un
    número fijo. Con filas se pueden agregar, borrar y ordenar sin migración.
    """

    __tablename__ = "quote_options"

    __table_args__ = (
        # Espeja el índice de la migración 021: en desarrollo y en los tests
        # el esquema sale de `create_all()`, no de Alembic.
        Index("ix_quote_options_quote_id", "quote_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    quote_id: Mapped[int] = mapped_column(
        ForeignKey("quotes.id", ondelete="CASCADE"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(120), nullable=False)
    detail: Mapped[str | None] = mapped_column(String(400), nullable=True)
    unit_price: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=1, server_default="1")
    # Texto y no un entero de días: lo que se le dice al cliente es "3 a 5
    # días" o "depende del importador", y eso no entra en un número.
    lead_time: Mapped[str | None] = mapped_column(String(60), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    quote: Mapped["Quote"] = relationship("Quote", back_populates="options")
