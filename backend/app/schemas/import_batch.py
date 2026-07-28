from __future__ import annotations

from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class ImportLineRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    row_number: int
    sku: str
    name: str
    quantity: int
    unit_cost: Decimal | None = None
    resolution: str
    product_id: int | None = None
    subtotal: Decimal
    is_auto: bool = False


class ImportLineCreate(BaseModel):
    """Alta manual de una línea, tipeada mirando la factura."""

    sku: str = Field(min_length=1, max_length=40)
    name: str = Field(min_length=1, max_length=160)
    quantity: int = Field(ge=1)
    unit_cost: Decimal | None = Field(default=None, ge=0)


class ImportLineUpdate(BaseModel):
    """Correcciones desde la pantalla de revisión."""

    sku: str | None = Field(default=None, min_length=1, max_length=40)
    name: str | None = Field(default=None, min_length=1, max_length=160)
    quantity: int | None = Field(default=None, ge=0)
    unit_cost: Decimal | None = Field(default=None, ge=0)
    # "IGNORAR" para dejar la línea afuera, o "NUEVO"/"REPOSICION" al resolver
    # un conflicto de SKU. La resolución se recalcula sola si se cambia el
    # SKU, así que mandarla a mano solo hace falta para ignorar o vincular.
    resolution: str | None = None
    # Vincular la línea a un producto existente (resuelve un conflicto).
    product_id: int | None = None


class ImportBatchRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    supplier_id: int
    # Se resuelve en la ruta: el listado necesita mostrar de quién es cada
    # factura, y tener solo el id obliga a cruzarlo en el frontend.
    supplier_name: str = ""
    filename: str
    declared_total: Decimal | None = None
    status: str
    notes: str | None = None
    created_at: datetime
    confirmed_at: datetime | None = None
    lines: list[ImportLineRead] = []

    # Calculados en la ruta, no en la base: dependen del estado actual de las
    # líneas, que cambia con cada corrección de la revisión.
    lines_total: Decimal = Decimal(0)
    totals_match: bool = False
    # Si hay archivo guardado, la pantalla muestra el visor al lado de la
    # grilla. Es un booleano y no los bytes: el contenido se pide aparte por
    # `GET /imports/{id}/file`.
    has_file: bool = False


class ImportBatchList(BaseModel):
    items: list[ImportBatchRead]
    total: int


class DuplicateCheck(BaseModel):
    """Respuesta de "¿ya importé este archivo?", consultada por hash antes de
    subir nada. El frontend calcula el SHA-256 en el navegador, así no hace
    falta subir el archivo dos veces para saberlo."""

    found: bool
    batch_id: int | None = None
    filename: str | None = None
    supplier_name: str | None = None
    status: str | None = None
    created_at: datetime | None = None


class ImportPreview(BaseModel):
    """Respuesta de la subida cuando todavía no hay mapeo confirmado.

    En vez de fallar pidiendo el mapeo, se devuelven los encabezados
    encontrados y una sugerencia, para que la pantalla de revisión pueda
    mostrarlos ya pre-completados.
    """

    headers: list[str]
    suggested_mapping: dict[str, str]
    saved_mapping: dict[str, str]
    # De dónde salió el mapeo que se va a aplicar:
    #   "guardado"  → el de este proveedor, y sus columnas existen en el archivo
    #   "cambiado"  → hay mapeo guardado pero alguna columna ya no está
    #                 (el proveedor cambió el formato: hay que revisarlo)
    #   "sugerido"  → primera vez con este proveedor, adivinado por encabezado
    #   "ninguno"   → no se pudo adivinar; hay que asignarlo a mano
    mapping_source: str = "ninguno"


class ImportConfirmResult(BaseModel):
    batch_id: int
    created: int
    updated: int
    skipped: int
