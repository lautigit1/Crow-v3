from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Integer, Numeric, String, Text, and_, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Product(Base):
    __tablename__ = "products"

    # Replican las CHECK constraints agregadas en la migración 005. Antes
    # solo existían a nivel de base de datos (Postgres) y no en el modelo,
    # por lo que create_all() (usado por la suite de tests con SQLite) no
    # las conocía y un bug que dejara stock negativo o precio <= 0 hubiera
    # pasado los tests silenciosamente sin tocar Postgres real.
    __table_args__ = (
        CheckConstraint("stock >= 0", name="ck_products_stock_nonnegative"),
        CheckConstraint("price IS NULL OR price > 0", name="ck_products_price_positive"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(160), index=True)
    sku: Mapped[str] = mapped_column(String(40), unique=True, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    price: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True)
    # Costo y margen -- solo para uso interno/admin, nunca se exponen a
    # público. `price` sigue siendo la única fuente de verdad para la venta;
    # estos dos campos son una ayuda para calcularlo, no se derivan solos.
    cost_price: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True)
    margin_pct: Mapped[float | None] = mapped_column(Numeric(6, 2), nullable=True)
    stock: Mapped[int] = mapped_column(Integer, default=0)
    image_url: Mapped[str | None] = mapped_column(String(255), nullable=True)
    vehicle_type: Mapped[str] = mapped_column(String(40), default="Universal")
    is_featured: Mapped[bool] = mapped_column(default=False)
    # Separa "cargado en el sistema" de "visible en el catálogo". Un producto
    # recién importado de una factura entra en False (borrador): tiene costo
    # pero todavía no precio de venta, así que publicarlo mostraría
    # "Consultar" y, con stock 0, ni siquiera se podría agregar al carrito.
    # Es independiente de `is_deleted`: borrado es irreversible-ish y lo saca
    # de todos lados, borrador es un estado de trabajo normal.
    is_active: Mapped[bool] = mapped_column(default=True, index=True)
    is_deleted: Mapped[bool] = mapped_column(default=False, index=True)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True, default=None)

    category_id: Mapped[int | None] = mapped_column(ForeignKey("categories.id", ondelete="SET NULL"), nullable=True)
    brand_id: Mapped[int | None] = mapped_column(ForeignKey("brands.id", ondelete="SET NULL"), nullable=True)
    supplier_id: Mapped[int | None] = mapped_column(ForeignKey("suppliers.id", ondelete="SET NULL"), nullable=True)

    category: Mapped["Category | None"] = relationship(back_populates="products")  # noqa: F821
    brand: Mapped["Brand | None"] = relationship(back_populates="products")  # noqa: F821
    supplier: Mapped["Supplier | None"] = relationship(back_populates="products")  # noqa: F821

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


# ---------------------------------------------------------------------------
# Visibilidad pública
# ---------------------------------------------------------------------------

def producto_publico():
    """Condición única para "este producto lo puede ver cualquiera".

    Existe como función y no como constante porque una expresión de
    SQLAlchemy construida a nivel de módulo se evalúa al importar; devolverla
    recién cuando se la pide evita cualquier sorpresa de orden de import
    entre modelos.

    La regla vive en un solo lugar a propósito. Hasta ahora era
    `Product.is_deleted.is_(False)` repetido en cinco endpoints; sumar una
    segunda condición a mano en los cinco es exactamente la clase de cambio
    donde alguien se olvida uno y un borrador termina indexado en Google.
    Con esto, un endpoint nuevo hereda la regla completa con un import.

    Los cinco consumidores son: listado y detalle de productos
    (`routes/products.py`), sitemap (`routes/seo.py`), alta de favorito
    (`routes/favorites.py`) y validación de ítems al crear un pedido
    (`routes/orders.py`).

    `routes/dashboard.py` NO lo usa, y es deliberado: son métricas de
    administración, donde el admin quiere contar todo lo que tiene cargado
    y no solo lo publicado.
    """
    return and_(Product.is_deleted.is_(False), Product.is_active.is_(True))
