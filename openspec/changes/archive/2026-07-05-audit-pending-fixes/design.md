# Design: audit-pending-fixes

## Fix 1 — `UNIQUE` en `suppliers.name`

**Archivos:** `backend/alembic/versions/011_supplier_unique_product_index_quote_check.py`,
`backend/app/models/supplier.py`, `backend/app/api/routes/suppliers.py`

**Enfoque:** `unique=True` en el modelo + `op.create_unique_constraint()` en
la migración. Como el `UNIQUE` de DB tiraría un `IntegrityError` feo en
`create`/`update`, se sigue el mismo patrón ya usado en `favorites.py`
("chequeo previo en vez de insert-y-atrapar-IntegrityError", justificado ahí
porque `get_db()` maneja un único commit por request y no queremos hacer
rollback manual a mitad de un handler): `_assert_name_available()` consulta
antes de escribir y devuelve 409 con mensaje legible. Case-insensitive
(`func.lower(...)`), y en `update` se excluye el propio registro para permitir
guardar sin cambiar el nombre.

```python
def _assert_name_available(db, name, *, exclude_id=None):
    stmt = select(Supplier.id).where(func.lower(Supplier.name) == name.lower())
    if exclude_id is not None:
        stmt = stmt.where(Supplier.id != exclude_id)
    if db.scalar(stmt) is not None:
        raise HTTPException(409, "Ya existe un proveedor con ese nombre")
```

## Fix 2 — Índice compuesto `products(category_id, stock)`

**Archivo:** migración 011

**Enfoque:** Mismo criterio que la migración 006 (partial index
`WHERE is_deleted = false`, más chico y rápido que uno completo).

```python
op.create_index(
    "ix_products_active_category_stock",
    "products",
    ["category_id", "stock"],
    postgresql_where=sa.text("is_deleted = false"),
)
```

## Fix 3 — `CHECK` en `quotes.message`

**Archivo:** migración 011

**Enfoque:** Rechazar vacío o solo espacios, alineado con la validación de
Pydantic (`min_length=1`) que ya existe en `schemas/quote.py`.

```python
op.create_check_constraint(
    "ck_quotes_message_not_blank",
    "quotes",
    "length(btrim(message)) > 0",
)
```

## Fix 4 — Email templates a Jinja2 (M9)

**Archivos:** `backend/app/core/email.py`,
`backend/app/templates/emails/*.jinja`, `backend/requirements.txt`

**Enfoque:** Cuatro templates (`quote_notification.html.jinja`,
`quote_notification.txt.jinja`, `reset_password.html.jinja`,
`reset_password.txt.jinja`) cargados con `jinja2.Environment` +
`FileSystemLoader`. Autoescape habilitado solo para `.html.jinja`:

```python
_env = Environment(
    loader=FileSystemLoader(_TEMPLATES_DIR),
    autoescape=select_autoescape(enabled_extensions=("html.jinja",), default_for_string=False),
    trim_blocks=True,
    lstrip_blocks=True,
)
```

Nota de implementación: `select_autoescape` compara el **sufijo completo**
del nombre de archivo (`template_name.endswith(pattern)`), así que con
nombres `algo.html.jinja` / `algo.txt.jinja` el patrón tiene que ser
`"html.jinja"` y no `"html"` — si no, autoescape nunca se activa para ningún
template y el fix de XSS sería un no-op silencioso. Se dejó un comentario en
el código señalando esto explícitamente porque no es obvio y es fácil de
romper en un cambio futuro.

Los builders (`build_quote_notification`, `build_reset_email`) arman un
dict de contexto y llaman `_render(template_name, **ctx)` en vez de armar el
HTML/texto con f-strings. `jinja2` se agrega a `requirements.txt`
(`jinja2==3.1.4`) — no requiere cambios de Docker (`COPY . .` ya incluye la
carpeta `templates/` nueva).

## Verificación

Mismo problema de entorno que en `auth-hardening`: el `.venv` de este
proyecto está compilado para Windows (`pydantic-core`, `cryptography`) y no
carga en el Linux del sandbox, así que no se pudo correr el `pytest` real
end-to-end. Adicionalmente hubo desfasajes de sincronización de OneDrive en
algunos archivos editados (bash veía una versión truncada momentáneamente).

Se verificó igual, de forma más directa que en `auth-hardening` porque
`jinja2` sí está disponible en el Python del sistema del sandbox (3.0.3, vía
`apt`): se copió el contenido exacto (confirmado carácter por carácter con
la herramienta de lectura de archivos, no vía `bash cat`) de
`app/core/email.py` y `app/templates/emails/*` a una ubicación aislada y se
ejecutó contra el código real (no una reproducción). Esto encontró y corrigió
un bug propio antes de darlo por bueno: colisión de nombre entre el parámetro
`name` del helper `_render()` y la variable de contexto `name` (nombre del
usuario) en `build_reset_email()`, que hubiera roto el email de reset en
producción. Ver detalle en `apply.md`.
