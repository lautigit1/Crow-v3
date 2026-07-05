# Tasks: audit-pending-fixes

## Implementation tasks

- [x] **T1** — Migración `011_supplier_unique_product_index_quote_check.py`: `UNIQUE` en `suppliers.name`
- [x] **T2** — Migración 011: índice parcial `products(category_id, stock)`
- [x] **T3** — Migración 011: `CHECK` en `quotes.message` (no vacío/no solo-espacios)
- [x] **T4** — `unique=True` en `app/models/supplier.py`
- [x] **T5** — `_assert_name_available()` en `suppliers.py` (chequeo previo, 409 en create/update)
- [x] **T6** — Tests nuevos en `test_suppliers.py` (duplicado, duplicado case-insensitive, update sin conflicto)
- [x] **T7** — Cuatro templates Jinja2 en `app/templates/emails/`
- [x] **T8** — Reescribir `build_quote_notification` / `build_reset_email` en `email.py` para usar `_render()`
- [x] **T9** — Agregar `jinja2==3.1.4` a `requirements.txt`
- [x] **T10** — Tests nuevos en `test_email.py` (contenido esperado + regresión de escape XSS)
- [x] **T11** — Verificar cambios (ver nota de verificación en `design.md`/`apply.md`)
