from datetime import datetime

from sqlalchemy import JSON, Boolean, DateTime, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Supplier(Base):
    """A product supplier / vendor."""

    __tablename__ = "suppliers"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120), unique=True)
    contact_name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(40), nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    city: Mapped[str | None] = mapped_column(String(80), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    # Qué columna del Excel de ESTE proveedor es el SKU, cuál la descripción,
    # etc. Ej: {"sku": "Código", "name": "Detalle", "quantity": "Cant.",
    # "unit_cost": "P. Unit"}. Se guarda la primera vez que se importa una
    # factura suya y se reusa en las siguientes, así el mapeo se hace una vez
    # por proveedor y no una vez por factura (decisión D1).
    #
    # `with_variant` porque la suite de tests corre sobre SQLite, que no tiene
    # JSONB: en Postgres es JSONB (indexable), en SQLite JSON común.
    column_mapping: Mapped[dict] = mapped_column(
        JSONB().with_variant(JSON, "sqlite"), default=dict, server_default="{}", nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # back-ref so we can count products per supplier
    products: Mapped[list["Product"]] = relationship("Product", back_populates="supplier")  # type: ignore[name-defined]  # noqa: F821 -- forward ref resuelta por el mapper registry de SQLAlchemy en runtime
