# Apply: audit-pending-fixes

## Archivos modificados / creados

### Backend — DB
- `backend/alembic/versions/011_supplier_unique_product_index_quote_check.py`
  (nueva migración, `down_revision = "010"`): `UNIQUE` en `suppliers.name`,
  índice parcial `ix_products_active_category_stock` en
  `products(category_id, stock)`, `CHECK ck_quotes_message_not_blank` en
  `quotes.message`.
- `backend/app/models/supplier.py` — `name` ahora `unique=True`.

### Backend — Suppliers API
- `backend/app/api/routes/suppliers.py` — nueva `_assert_name_available()`,
  llamada desde `create_supplier()` y `update_supplier()` (esta última solo
  si el nombre cambia). Devuelve 409 con "Ya existe un proveedor con ese
  nombre".
- `backend/tests/test_suppliers.py` — 4 tests nuevos: crear duplicado
  (409), crear duplicado con mayúsculas distintas (409), actualizar a un
  nombre ya usado por otro proveedor (409), actualizar manteniendo el mismo
  nombre (200, no debe chocar consigo mismo).

### Backend — Email
- `backend/app/templates/emails/quote_notification.html.jinja` (nuevo)
- `backend/app/templates/emails/quote_notification.txt.jinja` (nuevo)
- `backend/app/templates/emails/reset_password.html.jinja` (nuevo)
- `backend/app/templates/emails/reset_password.txt.jinja` (nuevo)
- `backend/app/core/email.py` — `Environment` de Jinja2 con autoescape
  condicionado a `.html.jinja`; `build_quote_notification()` y
  `build_reset_email()` arman un dict de contexto y renderizan vía
  `_render()` en vez de f-strings.
- `backend/requirements.txt` — agregado `jinja2==3.1.4`.
- `backend/tests/test_email.py` (nuevo) — contenido esperado de ambos
  emails, fallback de "—" en campos opcionales, y dos tests de regresión
  XSS (HTML escapa `<script>`, texto plano no lo escapa).

## Verificación

- No se pudo correr el `pytest` real del proyecto en este sandbox (venv
  Windows-only: `pydantic-core` y `cryptography` son extensiones nativas que
  no cargan en Linux). Adicional a eso, hubo desfasajes puntuales de
  sincronización de OneDrive: en un momento `bash cat`/`cp` devolvió una
  versión truncada de `email.py` que ya estaba corregida según la
  herramienta de lectura de archivos — se resolvió copiando el contenido
  confirmado por esa herramienta a una ubicación aislada antes de ejecutar.
- **Suppliers**: se revisó `conftest.py` y `test_suppliers.py` existentes
  para confirmar que ningún fixture usa nombres duplicados entre sí (todos
  los tests preexistentes usan nombres distintos: "Distribuidora ABC",
  "Distribuidora Sur", "Activo SA", "Inactivo SA", "Para Borrar"), así que el
  nuevo constraint no rompe nada existente.
- **Email / Jinja2**: se ejecutó la lógica real de `app/core/email.py` +
  templates (copiados verbatim, confirmados con la herramienta de lectura de
  archivos, no con `bash cat`) usando el Jinja2 del sistema del sandbox
  (3.0.3, disponible vía apt — el Jinja2 declarado en `requirements.txt` es
  3.1.4, API compatible para lo usado acá). Se confirmó:
  - Los campos esperados aparecen en asunto/HTML/texto de ambos emails.
  - Campos opcionales ausentes muestran "—".
  - Un payload `<script>alert(1)</script>` como `customer_name` o `message`
    aparece escapado (`&lt;script&gt;`) en el HTML y sin escapar en el texto
    plano.
  - **Bug encontrado y corregido durante esta verificación**: el helper
    `_render(name, **context)` colisionaba con la variable de contexto
    `name` (nombre del usuario) que usa `build_reset_email()`, causando
    `TypeError: _render() got multiple values for argument 'name'`. Se
    renombró el parámetro a `template_name`. Sin este paso de verificación
    el bug hubiera llegado a producción y roto el email de reset de
    contraseña.
- Recomendado: correr `pytest backend/tests/test_suppliers.py
  backend/tests/test_email.py` y `alembic upgrade head` (para aplicar la
  migración 011 contra Postgres real) en un entorno con las dependencias
  instaladas, antes de mergear.

## Desviaciones del plan

- Ninguna respecto a lo planeado en `design.md`, más allá del fix del bug
  `_render`/`name` descubierto en la verificación (no estaba en el diseño
  original porque no era un problema conocido de antemano).

## Nota

Este change se implementó a pedido explícito del usuario ("hace eso
pendiente", refiriéndose a los 4 puntos que quedaron listados como
pendientes tras `auth-hardening`).
