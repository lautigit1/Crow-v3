"""Importación de facturas de proveedor.

El flujo tiene tres pasos y un freno en el medio:

    subir  →  REVISAR  →  confirmar

Subir parsea el archivo y guarda un lote en BORRADOR. Nada toca `products` ni
el stock todavía. Recién al confirmar se crean los productos (siempre en
borrador, ver `is_active`), se actualizan los costos y se generan los
movimientos de stock.

Ese orden es lo que hace que un parseo equivocado no se convierta en
inventario equivocado. El control cruzado -- la suma de las líneas contra el
total declarado de la factura -- es lo que hace que un error no pueda pasar
en silencio.
"""

import hashlib
from datetime import datetime, timezone
from decimal import Decimal

from fastapi import APIRouter, File, Form, HTTPException, Query, Request, Response, UploadFile
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from app.core import audit
from app.core.deps import AdminUser, DbSession
from app.core.excel_import import (
    CAMPOS,
    ExcelInvalido,
    leer_filas,
    normalizar,
    parsear,
    sugerir_mapeo,
)
from app.core.pdf_import import extraer_filas
from app.core.stock import mover_stock
from app.models.import_batch import ImportBatch, ImportLine, ImportStatus, LineResolution
from app.models.product import Product
from app.models.stock_movement import StockMovement, StockReason
from app.models.supplier import Supplier
from app.schemas.import_batch import (
    DuplicateCheck,
    ImportBatchList,
    ImportBatchRead,
    ImportConfirmResult,
    ImportLineCreate,
    ImportLineUpdate,
    ImportPreview,
)

router = APIRouter()

# 5 MB: una factura de proveedor son decenas de filas, no un catálogo. El
# tope frena tanto un archivo equivocado como una subida maliciosa antes de
# que openpyxl intente parsearlo.
_MAX_BYTES = 5 * 1024 * 1024


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _lote_o_404(batch_id: int, db: DbSession) -> ImportBatch:
    batch = db.scalar(
        select(ImportBatch)
        .options(selectinload(ImportBatch.lines), selectinload(ImportBatch.supplier))
        .where(ImportBatch.id == batch_id)
    )
    if batch is None:
        raise HTTPException(status_code=404, detail="Importación no encontrada")
    return batch


def _resolver_sku(db: DbSession, sku: str, supplier_id: int) -> tuple[LineResolution, int | None]:
    """Decide qué hacer con una línea según a quién pertenezca el SKU.

    Que un SKU ya exista NO siempre es un conflicto: si el producto es de
    este mismo proveedor, es simplemente una reposición y no hace falta
    molestar al usuario. Solo se marca cuando el SKU pertenece a otro
    proveedor (o a ninguno), que es cuando puede ser la misma pieza comprada
    a otro lado o una coincidencia de código -- y eso no lo puede decidir el
    sistema.
    """
    existente = db.scalar(select(Product).where(func.lower(Product.sku) == sku.lower()))
    if existente is None:
        return LineResolution.NUEVO, None
    if existente.supplier_id == supplier_id:
        return LineResolution.REPOSICION, existente.id
    return LineResolution.CONFLICTO, existente.id


def _hash(contenido: bytes) -> str:
    """SHA-256 del archivo. Tiene que coincidir con lo que calcula el
    navegador con `crypto.subtle.digest("SHA-256", ...)` -- si no, el aviso
    de duplicado no se dispararía nunca y nadie se daría cuenta."""
    return hashlib.sha256(contenido).hexdigest()


def _serializar(batch: ImportBatch) -> ImportBatchRead:
    """Agrega los totales calculados, que dependen del estado actual de las
    líneas y por eso no se guardan en la base."""
    lineas = [ln for ln in batch.lines if ln.resolution != LineResolution.IGNORAR]
    total = sum((ln.subtotal for ln in lineas), Decimal(0))
    data = ImportBatchRead.model_validate(batch, from_attributes=True)
    data.lines_total = total
    # Sin total declarado no hay control cruzado posible: se considera que no
    # coincide, y la confirmación va a exigir cargarlo.
    data.totals_match = batch.declared_total is not None and abs(total - batch.declared_total) < Decimal("0.01")
    # `content_type` alcanza para saber si hay archivo sin traer los bytes:
    # `file_content` es deferred justamente para no cargarlos en cada lectura.
    data.has_file = batch.content_type is not None
    if batch.supplier is not None:
        data.supplier_name = batch.supplier.name
    return data


# ---------------------------------------------------------------------------
# Subida
# ---------------------------------------------------------------------------

@router.get("/imports/by-hash/{file_hash}", response_model=DuplicateCheck)
def check_duplicate(file_hash: str, db: DbSession, _: AdminUser) -> DuplicateCheck:
    """¿Este archivo ya se importó?

    Se consulta ANTES de subir: el navegador calcula el SHA-256 con
    `crypto.subtle` y pregunta por él. Así el aviso llega antes de crear
    nada, en vez de después de haber procesado la factura.

    La búsqueda es global, no por proveedor: el mismo archivo cargado por
    error contra dos proveedores distintos también es un problema, y
    justamente uno más difícil de notar.
    """
    batch = db.scalar(
        select(ImportBatch)
        .options(selectinload(ImportBatch.supplier))
        .where(ImportBatch.file_hash == file_hash)
        .order_by(ImportBatch.created_at.desc())
    )
    if batch is None:
        return DuplicateCheck(found=False)
    return DuplicateCheck(
        found=True,
        batch_id=batch.id,
        filename=batch.filename,
        supplier_name=batch.supplier.name if batch.supplier else None,
        status=batch.status.value,
        created_at=batch.created_at,
    )


@router.post("/suppliers/{supplier_id}/imports/preview", response_model=ImportPreview)
async def preview_import(
    supplier_id: int,
    db: DbSession,
    _: AdminUser,
    file: UploadFile = File(...),
) -> ImportPreview:
    """Devuelve los encabezados del archivo y una sugerencia de mapeo.

    Existe como paso aparte para que la primera importación de un proveedor
    pueda mostrar el formulario de mapeo ya pre-completado, en vez de fallar
    pidiendo datos que el usuario todavía no sabe que hacen falta.
    """
    supplier = db.get(Supplier, supplier_id)
    if supplier is None:
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")

    contenido = await file.read()
    if len(contenido) > _MAX_BYTES:
        raise HTTPException(status_code=413, detail="El archivo supera los 5 MB.")

    try:
        encabezados, _, _ = leer_filas(contenido)
    except ExcelInvalido as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    guardado = supplier.column_mapping or {}
    sugerido = sugerir_mapeo(encabezados)
    presentes = {normalizar(h) for h in encabezados}

    # Un mapeo guardado solo sirve si sus columnas siguen estando. Si el
    # proveedor cambió el formato, decirlo ACÁ -- con los encabezados a la
    # vista para corregir -- es mucho mejor que dejar que falle el parseo
    # después con un error críptico.
    if guardado and all(normalizar(v) in presentes for v in guardado.values()):
        origen = "guardado"
    elif guardado:
        origen = "cambiado"
    elif all(k in sugerido for k in ("sku", "name", "quantity")):
        origen = "sugerido"
    else:
        origen = "ninguno"

    return ImportPreview(
        headers=[h for h in encabezados if h],
        suggested_mapping=sugerido,
        saved_mapping=guardado,
        mapping_source=origen,
    )


@router.post("/suppliers/{supplier_id}/imports", response_model=ImportBatchRead, status_code=201)
async def create_import(
    supplier_id: int,
    db: DbSession,
    admin: AdminUser,
    request: Request,
    file: UploadFile = File(...),
    # El mapeo llega como campos sueltos del form (mapping_sku, mapping_name…)
    # en vez de un JSON: el request ya es multipart por el archivo, y meter un
    # JSON anidado adentro complica el cliente sin ganar nada.
    mapping_sku: str = Form(...),
    mapping_name: str = Form(...),
    mapping_quantity: str = Form(...),
    mapping_unit_cost: str | None = Form(default=None),
    declared_total: Decimal | None = Form(default=None),
    remember_mapping: bool = Form(default=True),
) -> ImportBatchRead:
    """Parsea la factura y crea el lote en BORRADOR. No toca stock ni productos."""
    supplier = db.get(Supplier, supplier_id)
    if supplier is None:
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")

    contenido = await file.read()
    if len(contenido) > _MAX_BYTES:
        raise HTTPException(status_code=413, detail="El archivo supera los 5 MB.")

    mapeo = {"sku": mapping_sku, "name": mapping_name, "quantity": mapping_quantity}
    if mapping_unit_cost:
        mapeo["unit_cost"] = mapping_unit_cost

    try:
        filas = parsear(contenido, mapeo)
    except ExcelInvalido as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    if remember_mapping:
        # Se guarda para que la próxima factura de este proveedor no vuelva a
        # pedirlo. Es toda la razón de ser de la decisión D1.
        supplier.column_mapping = {k: v for k, v in mapeo.items() if k in CAMPOS}
        db.add(supplier)

    batch = ImportBatch(
        supplier_id=supplier_id,
        filename=file.filename or "factura.xlsx",
        file_hash=_hash(contenido),
        # El Excel también se guarda: sirve para volver al original si algún
        # número no cierra semanas después.
        file_content=contenido,
        content_type=file.content_type or "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        declared_total=declared_total,
        status=ImportStatus.BORRADOR,
        created_by_id=admin.id,
    )
    db.add(batch)
    db.flush()

    for fila in filas:
        if fila.error:
            # Las filas ilegibles entran como IGNORAR con la descripción
            # pisada por el motivo: quedan visibles en la revisión para que
            # el usuario las corrija, pero no suman al total ni crean nada.
            resolucion, product_id = LineResolution.IGNORAR, None
            nombre = f"⚠ {fila.error} — {fila.name}"[:160]
        else:
            resolucion, product_id = _resolver_sku(db, fila.sku, supplier_id)
            nombre = fila.name

        db.add(ImportLine(
            batch_id=batch.id,
            row_number=fila.row_number,
            sku=fila.sku,
            name=nombre,
            quantity=fila.quantity,
            unit_cost=fila.unit_cost,
            resolution=resolucion,
            product_id=product_id,
        ))

    db.flush()
    db.refresh(batch)
    audit.record(
        db, action="import.create", actor=admin, entity="import_batch", entity_id=batch.id,
        detail=f"{supplier.name}: {len(filas)} líneas", request=request,
    )
    return _serializar(batch)


# ---------------------------------------------------------------------------
# Lectura y revisión
# ---------------------------------------------------------------------------

@router.post("/suppliers/{supplier_id}/imports/manual", response_model=ImportBatchRead, status_code=201)
async def create_manual_import(
    supplier_id: int,
    db: DbSession,
    admin: AdminUser,
    request: Request,
    file: UploadFile = File(...),
    declared_total: Decimal | None = Form(default=None),
) -> ImportBatchRead:
    """Crea el lote para un archivo que no es Excel -- típicamente un PDF.

    Si el PDF es digital y tiene una tabla reconocible, se intenta extraer las
    líneas con `pdfplumber` (local, determinístico, el archivo no sale del
    servidor). Lo que salga entra marcado como automático, para que la
    revisión lo mire con más atención.

    Si es un escaneo, o si la extracción no encuentra nada, el lote queda
    vacío y las líneas se cargan a mano con el documento al lado. Ese
    fallback no es un caso de error: es el camino previsto para los
    escaneados, y por eso acá nunca se propaga una excepción.

    En los dos casos rigen las mismas garantías que en el Excel: control
    cruzado contra el total declarado, productos en borrador, y movimientos
    de stock agrupados por lote (o sea, reversibles).
    """
    supplier = db.get(Supplier, supplier_id)
    if supplier is None:
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")

    contenido = await file.read()
    if len(contenido) > _MAX_BYTES:
        raise HTTPException(status_code=413, detail="El archivo supera los 5 MB.")

    batch = ImportBatch(
        supplier_id=supplier_id,
        filename=file.filename or "factura.pdf",
        file_hash=_hash(contenido),
        file_content=contenido,
        content_type=file.content_type or "application/octet-stream",
        declared_total=declared_total,
        status=ImportStatus.BORRADOR,
        created_by_id=admin.id,
    )
    db.add(batch)
    db.flush()

    extraidas = extraer_filas(contenido) if es_pdf(file, contenido) else []
    for fila in extraidas:
        if fila.error:
            continue  # en una extracción automática, lo dudoso no se propone
        resolucion, product_id = _resolver_sku(db, fila.sku, supplier_id)
        db.add(ImportLine(
            batch_id=batch.id,
            row_number=fila.row_number,
            sku=fila.sku,
            name=fila.name,
            quantity=fila.quantity,
            unit_cost=fila.unit_cost,
            resolution=resolucion,
            product_id=product_id,
            is_auto=True,
        ))

    db.flush()
    db.refresh(batch)
    audit.record(
        db, action="import.create_manual", actor=admin, entity="import_batch", entity_id=batch.id,
        detail=f"{supplier.name}: {batch.filename} ({len(extraidas)} líneas extraídas)", request=request,
    )
    return _serializar(batch)


def es_pdf(file: UploadFile, contenido: bytes) -> bool:
    """PDF por content-type o por su firma en los primeros bytes.

    No se confía solo en el content-type: lo manda el navegador y no siempre
    es correcto. `%PDF` al principio del archivo sí lo es.
    """
    return (file.content_type == "application/pdf") or contenido[:4] == b"%PDF"


@router.get("/imports/{batch_id}/file")
def get_import_file(batch_id: int, db: DbSession, _: AdminUser) -> Response:
    """Devuelve el archivo original para mostrarlo en pantalla.

    `inline` y no `attachment`: el visor lo embebe en un iframe al lado de la
    grilla, no lo descarga. Solo admin -- una factura tiene precios de costo.
    """
    batch = db.get(ImportBatch, batch_id)
    if batch is None or batch.file_content is None:
        raise HTTPException(status_code=404, detail="No hay archivo guardado para esta importación")
    return Response(
        content=batch.file_content,
        media_type=batch.content_type or "application/octet-stream",
        headers={
            "Content-Disposition": f'inline; filename="{batch.filename}"',
            # Es un documento privado: que no quede en ninguna cache
            # intermedia ni en el disco del navegador.
            "Cache-Control": "no-store, private",
        },
    )


@router.post("/imports/{batch_id}/lines", response_model=ImportBatchRead, status_code=201)
def add_line(batch_id: int, data: ImportLineCreate, db: DbSession, _: AdminUser) -> ImportBatchRead:
    """Agrega una línea a mano, mirando la factura."""
    batch = _lote_o_404(batch_id, db)
    if batch.status != ImportStatus.BORRADOR:
        raise HTTPException(status_code=409, detail="La importación ya fue confirmada; no se puede editar.")

    resolucion, product_id = _resolver_sku(db, data.sku, batch.supplier_id)
    # El número de fila es correlativo dentro del lote: en una carga manual no
    # hay filas de un archivo a las que referirse.
    siguiente = max((ln.row_number for ln in batch.lines), default=0) + 1

    db.add(ImportLine(
        batch_id=batch.id,
        row_number=siguiente,
        sku=data.sku,
        name=data.name,
        quantity=data.quantity,
        unit_cost=data.unit_cost,
        resolution=resolucion,
        product_id=product_id,
    ))
    db.flush()
    db.refresh(batch)
    return _serializar(batch)


@router.delete("/imports/{batch_id}/lines/{line_id}", response_model=ImportBatchRead)
def delete_line(batch_id: int, line_id: int, db: DbSession, _: AdminUser) -> ImportBatchRead:
    batch = _lote_o_404(batch_id, db)
    if batch.status != ImportStatus.BORRADOR:
        raise HTTPException(status_code=409, detail="La importación ya fue confirmada; no se puede editar.")

    linea = next((ln for ln in batch.lines if ln.id == line_id), None)
    if linea is None:
        raise HTTPException(status_code=404, detail="Línea no encontrada")
    db.delete(linea)
    db.flush()
    db.refresh(batch)
    return _serializar(batch)


@router.get("/imports", response_model=ImportBatchList)
def list_imports(
    db: DbSession,
    _: AdminUser,
    supplier_id: int | None = Query(default=None),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
) -> ImportBatchList:
    stmt = select(ImportBatch).options(selectinload(ImportBatch.lines), selectinload(ImportBatch.supplier))
    if supplier_id is not None:
        stmt = stmt.where(ImportBatch.supplier_id == supplier_id)
    total = db.scalar(select(func.count()).select_from(stmt.order_by(None).subquery())) or 0
    lotes = list(db.scalars(stmt.order_by(ImportBatch.created_at.desc()).offset(skip).limit(limit)).all())
    return ImportBatchList(items=[_serializar(b) for b in lotes], total=total)


@router.get("/imports/{batch_id}", response_model=ImportBatchRead)
def get_import(batch_id: int, db: DbSession, _: AdminUser) -> ImportBatchRead:
    return _serializar(_lote_o_404(batch_id, db))


@router.patch("/imports/{batch_id}/lines/{line_id}", response_model=ImportBatchRead)
def update_line(
    batch_id: int, line_id: int, data: ImportLineUpdate, db: DbSession, _: AdminUser
) -> ImportBatchRead:
    """Corrige una línea desde la pantalla de revisión."""
    batch = _lote_o_404(batch_id, db)
    if batch.status != ImportStatus.BORRADOR:
        raise HTTPException(status_code=409, detail="La importación ya fue confirmada; no se puede editar.")

    linea = next((ln for ln in batch.lines if ln.id == line_id), None)
    if linea is None:
        raise HTTPException(status_code=404, detail="Línea no encontrada")

    campos = data.model_dump(exclude_unset=True)
    sku_nuevo = campos.pop("sku", None)
    resolucion_pedida = campos.pop("resolution", None)
    for campo, valor in campos.items():
        setattr(linea, campo, valor)

    if sku_nuevo is not None and sku_nuevo != linea.sku:
        # Cambiar el SKU es la forma de resolver un conflicto creando un
        # producto nuevo, así que la resolución se recalcula sola contra el
        # SKU nuevo en vez de quedar pegada a la del parseo original.
        linea.sku = sku_nuevo
        linea.resolution, linea.product_id = _resolver_sku(db, sku_nuevo, batch.supplier_id)

    if resolucion_pedida is not None:
        try:
            linea.resolution = LineResolution[resolucion_pedida]
        except KeyError:
            raise HTTPException(status_code=422, detail=f"Resolución inválida: {resolucion_pedida}") from None

    db.add(linea)
    db.flush()
    db.refresh(batch)
    return _serializar(batch)


@router.patch("/imports/{batch_id}", response_model=ImportBatchRead)
def update_batch(
    batch_id: int, db: DbSession, _: AdminUser, declared_total: Decimal | None = None, notes: str | None = None
) -> ImportBatchRead:
    """Permite cargar o corregir el total declarado durante la revisión."""
    batch = _lote_o_404(batch_id, db)
    if batch.status != ImportStatus.BORRADOR:
        raise HTTPException(status_code=409, detail="La importación ya fue confirmada.")
    if declared_total is not None:
        batch.declared_total = declared_total
    if notes is not None:
        batch.notes = notes
    db.add(batch)
    db.flush()
    db.refresh(batch)
    return _serializar(batch)


# ---------------------------------------------------------------------------
# Confirmación y reversión
# ---------------------------------------------------------------------------

@router.post("/imports/{batch_id}/confirm", response_model=ImportConfirmResult)
def confirm_import(batch_id: int, db: DbSession, admin: AdminUser, request: Request) -> ImportConfirmResult:
    """Aplica el lote: crea productos, actualiza costos y suma stock.

    Los productos nuevos entran SIEMPRE en borrador (`is_active=False`): una
    factura trae costo, no precio de venta, así que publicarlos en el momento
    los mostraría como "Consultar" en el catálogo.
    """
    batch = _lote_o_404(batch_id, db)
    if batch.status != ImportStatus.BORRADOR:
        raise HTTPException(status_code=409, detail="Esta importación ya fue procesada.")

    resumen = _serializar(batch)
    if not resumen.totals_match:
        # El control cruzado. Es lo que convierte un parseo falible en un
        # proceso que no puede fallar en silencio.
        declarado = batch.declared_total
        raise HTTPException(
            status_code=422,
            detail=(
                "El total de la factura no coincide con la suma de las líneas: "
                f"declarado {declarado if declarado is not None else '(sin cargar)'}, "
                f"líneas {resumen.lines_total}. Revisá las cantidades y los precios antes de confirmar."
            ),
        )

    creados = actualizados = ignorados = 0

    for linea in batch.lines:
        if linea.resolution == LineResolution.IGNORAR:
            ignorados += 1
            continue

        if linea.resolution == LineResolution.NUEVO:
            producto = Product(
                name=linea.name,
                sku=linea.sku,
                cost_price=linea.unit_cost,
                stock=0,
                supplier_id=batch.supplier_id,
                is_active=False,  # borrador: falta ponerle precio de venta
            )
            db.add(producto)
            db.flush()
            linea.product_id = producto.id
            creados += 1
        else:
            producto = db.get(Product, linea.product_id) if linea.product_id else None
            if producto is None:
                # El producto se borró entre la subida y la confirmación.
                ignorados += 1
                continue
            if linea.unit_cost is not None:
                producto.cost_price = linea.unit_cost
            db.add(producto)
            actualizados += 1

        mover_stock(
            db, producto, linea.quantity, StockReason.COMPRA,
            actor=admin, note=f"Factura {batch.filename}",
        )
        # `mover_stock` no conoce los lotes de importación (es anterior a
        # ellos); se completa acá para poder revertir el lote entero después.
        db.flush()
        movimiento = db.scalars(
            select(StockMovement)
            .where(StockMovement.product_id == producto.id)
            .order_by(StockMovement.id.desc())
            .limit(1)
        ).first()
        if movimiento is not None:
            movimiento.import_batch_id = batch.id

    batch.status = ImportStatus.CONFIRMADO
    batch.confirmed_at = datetime.now(timezone.utc)
    db.add(batch)
    db.flush()

    audit.record(
        db, action="import.confirm", actor=admin, entity="import_batch", entity_id=batch.id,
        detail=f"creados {creados}, actualizados {actualizados}, ignorados {ignorados}", request=request,
    )
    return ImportConfirmResult(batch_id=batch.id, created=creados, updated=actualizados, skipped=ignorados)


@router.post("/imports/{batch_id}/revert", response_model=ImportConfirmResult)
def revert_import(batch_id: int, db: DbSession, admin: AdminUser, request: Request) -> ImportConfirmResult:
    """Deshace una importación generando los movimientos inversos.

    No borra los productos creados: pueden haberse editado, publicado o
    incluso vendido desde entonces. Lo que se revierte es el stock, que es lo
    que la importación movió. Los productos que hayan quedado de más se
    borran a mano si hace falta.
    """
    batch = _lote_o_404(batch_id, db)
    if batch.status != ImportStatus.CONFIRMADO:
        raise HTTPException(status_code=409, detail="Solo se puede revertir una importación confirmada.")

    movimientos = list(db.scalars(
        select(StockMovement).where(StockMovement.import_batch_id == batch.id)
    ).all())

    revertidos = 0
    for movimiento in movimientos:
        producto = db.get(Product, movimiento.product_id)
        if producto is None:
            continue
        if producto.stock < movimiento.delta:
            raise HTTPException(
                status_code=409,
                detail=(
                    f"No se puede revertir: '{producto.name}' tiene {producto.stock} unidades y la "
                    f"importación sumó {movimiento.delta}. Ya se vendieron unidades de esta compra."
                ),
            )
        mover_stock(
            db, producto, -movimiento.delta, StockReason.AJUSTE,
            actor=admin, note=f"Reversión de la factura {batch.filename}",
        )
        revertidos += 1

    batch.status = ImportStatus.REVERTIDO
    db.add(batch)
    db.flush()
    audit.record(
        db, action="import.revert", actor=admin, entity="import_batch", entity_id=batch.id,
        detail=f"{revertidos} movimientos revertidos", request=request,
    )
    return ImportConfirmResult(batch_id=batch.id, created=0, updated=revertidos, skipped=0)
