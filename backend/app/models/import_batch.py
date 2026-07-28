import enum
from datetime import datetime
from decimal import Decimal

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, LargeBinary, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class ImportStatus(str, enum.Enum):
    BORRADOR = "Borrador"
    CONFIRMADO = "Confirmado"
    REVERTIDO = "Revertido"


class LineResolution(str, enum.Enum):
    """Qué se va a hacer con cada línea de la factura al confirmar."""

    NUEVO = "Producto nuevo"
    REPOSICION = "Reposición"
    # El SKU existe pero pertenece a otro proveedor (o a ninguno): puede ser la
    # misma pieza comprada a otro lado, o una coincidencia de código. Es el
    # único caso que exige una decisión humana.
    CONFLICTO = "Conflicto de SKU"
    IGNORAR = "Ignorar"


class ImportBatch(Base):
    """Una factura de proveedor subida al sistema.

    Nace en estado BORRADOR y no toca `products` ni el stock hasta que se
    confirma. Esa separación es la que permite revisar y corregir las líneas
    antes de que un parseo equivocado se convierta en inventario equivocado.
    """

    __tablename__ = "import_batches"

    id: Mapped[int] = mapped_column(primary_key=True)
    supplier_id: Mapped[int] = mapped_column(
        ForeignKey("suppliers.id", ondelete="CASCADE"), nullable=False, index=True
    )
    filename: Mapped[str] = mapped_column(String(255))

    # El archivo original. Se guarda para poder mostrarlo mientras se cargan
    # las líneas a mano (facturas en PDF) y para tener el comprobante junto
    # al asiento. Ver el razonamiento de por qué va en la base en la
    # migración 016. `deferred` para que no viaje en cada consulta del
    # listado: son bytes que solo hacen falta cuando se pide el archivo.
    file_content: Mapped[bytes | None] = mapped_column(LargeBinary, nullable=True, deferred=True)
    content_type: Mapped[str | None] = mapped_column(String(100), nullable=True)

    # SHA-256 del archivo. Permite avisar "esta factura ya la importaste"
    # antes de procesar nada. Detección exacta sobre los bytes: si el
    # proveedor reexporta el mismo comprobante, el hash cambia y no lo
    # detecta -- ver el comentario de la migración 018.
    file_hash: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)

    # Total que declara la factura. Es el control cruzado: si la suma de las
    # líneas no da esto, no se puede confirmar. Nullable porque la carga
    # asistida de PDF (fase 5) puede arrancar sin él y completarlo después.
    declared_total: Mapped[Decimal | None] = mapped_column(Numeric(14, 2), nullable=True)

    status: Mapped[ImportStatus] = mapped_column(
        Enum(ImportStatus), default=ImportStatus.BORRADOR, nullable=False
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_by_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    confirmed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    lines: Mapped[list["ImportLine"]] = relationship(
        "ImportLine", back_populates="batch", cascade="all, delete-orphan"
    )
    supplier: Mapped["Supplier"] = relationship("Supplier")  # type: ignore[name-defined]  # noqa: F821 -- forward ref resuelta por el mapper registry en runtime


class ImportLine(Base):
    """Una línea de la factura, tal como se parseó y como quedó tras revisarla.

    Vive separada de `products` a propósito: hasta que el lote se confirma
    esto es una propuesta editable, no un producto.
    """

    __tablename__ = "import_lines"

    id: Mapped[int] = mapped_column(primary_key=True)
    batch_id: Mapped[int] = mapped_column(
        ForeignKey("import_batches.id", ondelete="CASCADE"), nullable=False, index=True
    )

    # Fila del Excel de la que salió. Sirve para señalar el error en el
    # archivo original cuando algo no se pudo interpretar.
    row_number: Mapped[int] = mapped_column(Integer)

    sku: Mapped[str] = mapped_column(String(40))
    name: Mapped[str] = mapped_column(String(160))
    quantity: Mapped[int] = mapped_column(Integer)
    unit_cost: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)

    resolution: Mapped[LineResolution] = mapped_column(Enum(LineResolution), nullable=False)

    # Salió de una extracción automática de PDF, no de un Excel con mapeo
    # confirmado ni de alguien tipeando. La revisión la marca para que se
    # mire con más atención: es donde puede haber errores de lectura.
    is_auto: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false", nullable=False)
    # Producto al que apunta la línea: el existente en REPOSICION/CONFLICTO
    # resuelto por vinculación, o el recién creado después de confirmar.
    product_id: Mapped[int | None] = mapped_column(
        ForeignKey("products.id", ondelete="SET NULL"), nullable=True
    )

    batch: Mapped["ImportBatch"] = relationship("ImportBatch", back_populates="lines")

    @property
    def subtotal(self) -> Decimal:
        return (self.unit_cost or Decimal(0)) * self.quantity
