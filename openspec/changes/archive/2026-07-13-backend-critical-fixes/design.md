# Design: backend-critical-fixes

## Fix 1 — N+1 en listados de pedidos

**Archivo:** `backend/app/api/routes/orders.py`

**Problema:** `Order.items` (en `backend/app/models/order.py`) usa lazy loading por default (`lazy="select"`). `my_orders` (`GET /me`) y `admin_list_orders` (`GET ""`) devuelven `OrderRead`, cuyo schema serializa `items` para cada pedido — eso dispara una query SELECT adicional por pedido en la página, además de la query de conteo y la de la página en sí. Con `limit=100` (el máximo permitido), un solo request podía emitir hasta 102 queries.

**Fix:** agregar `.options(selectinload(Order.items))` a la query base en ambos endpoints, antes de `.offset().limit()`. `selectinload` emite una segunda query única (`WHERE order_id IN (...)`) para todos los items de todos los pedidos de la página, en vez de una por pedido — el número total de queries queda constante (2, más el conteo) sin importar cuántos pedidos haya en la página.

```python
rows = db.scalars(
    base.options(selectinload(Order.items)).order_by(Order.created_at.desc()).offset(skip).limit(limit)
).all()
```

**Test de regresión:** `backend/tests/test_orders.py::TestOrdersNPlusOne`. En vez de solo comprobar que la respuesta es correcta (lo cual no detecta un N+1), se usa `sqlalchemy.event.listen(engine, "before_cursor_execute", ...)` para contar las queries SQL reales emitidas por request, y se compara el conteo con 1 pedido vs. 6 pedidos — si el número de queries escala con la cantidad de pedidos, el test falla. Este patrón es el único que efectivamente prueba la ausencia de N+1; un test que solo valide el JSON de respuesta pasa igual con o sin `selectinload`.

## Fix 2 — Límites de longitud en `RegisterRequest`

**Archivo:** `backend/app/schemas/auth.py`

**Problema:** `RegisterRequest.full_name` y `.phone` eran `str`/`str | None` sin `Field(max_length=...)`, a diferencia de `UserBase` (`backend/app/schemas/user.py`), que sí los limita a 120 y 40 caracteres respectivamente — los mismos límites que `VARCHAR(120)`/`VARCHAR(40)` en la tabla `users`. Registrar con un `full_name` de, por ejemplo, 10.000 caracteres pasaba la validación de Pydantic sin problema y recién fallaba en el `INSERT` de Postgres, que Pydantic no puede traducir a un 422 — el usuario recibía un 503 genérico.

**Fix:** alinear `RegisterRequest` con `UserBase`:

```python
full_name: str = Field(min_length=1, max_length=120)
phone: str | None = Field(default=None, max_length=40)
```

**Tests de regresión:** `backend/tests/test_auth.py::TestRegister::test_register_oversized_full_name_rejected` y `::test_register_oversized_phone_rejected` — mandan 121 y 41 caracteres respectivamente y esperan 422.

## Fix 3 — CHECK constraints reflejadas en los modelos SQLAlchemy

**Archivos:** `backend/app/models/product.py`, `backend/app/models/quote.py`

**Problema:** las migraciones 005 (`ck_products_stock_nonnegative`, `ck_products_price_positive`) y 011 (`ck_quotes_message_not_blank`) agregan CHECK constraints directamente en Postgres vía `op.create_check_constraint(...)`, pero los modelos de SQLAlchemy no las declaran. La suite de tests de backend usa SQLite en memoria y crea el schema con `Base.metadata.create_all()` (ver `tests/conftest.py`) — un flujo que nunca corre las migraciones de Alembic. Resultado: esas constraints eran completamente invisibles para los tests, dando una falsa sensación de cobertura sobre reglas de negocio que sí se enforced en producción pero no en CI.

**Fix:** agregar `__table_args__` con `CheckConstraint` a ambos modelos, con el mismo texto SQL que las migraciones donde es portable, y adaptado donde no:

- `Product`: `CheckConstraint("stock >= 0", ...)`, `CheckConstraint("price IS NULL OR price > 0", ...)` — idénticas a la migración 005, válidas tanto en Postgres como en SQLite.
- `Quote`: `CheckConstraint("length(trim(message)) > 0", ...)` — la migración 011 usa `btrim()`, una función específica de Postgres que SQLite no tiene. Se usa `trim()` en su lugar, que es SQL estándar y se comporta igual en ambos motores (recorta espacios en blanco de los dos extremos por default sin argumentos). El nombre de la constraint (`ck_quotes_message_not_blank`) se mantiene igual al de la migración por trazabilidad, aunque el texto SQL difiere levemente.

**Nota de alcance:** estas constraints del modelo son redundantes con las de Postgres en producción (que siguen siendo la fuente de verdad real, aplicadas por Alembic) — su único propósito es que `create_all()` las reproduzca en SQLite para que la suite de tests las pueda ejercitar. No reemplazan ni modifican las migraciones existentes.

**Tests nuevos:** `backend/tests/test_model_constraints.py` (archivo nuevo) — `TestProductConstraints` (stock negativo, precio cero, precio negativo, precio nulo permitido, valores válidos permitidos) y `TestQuoteConstraints` (mensaje en blanco, mensaje vacío, mensaje válido). Los tests escriben directo contra la sesión de DB (`db.flush()`) en vez de pasar por la API, para aislar específicamente el comportamiento de la constraint del modelo, sin depender de la validación de Pydantic en la capa de rutas.

**Efecto colateral detectado, no corregido en este change:** `ProductBase.price` en `schemas/product.py` usa `Field(ge=0)` (permite 0), mientras que la CHECK constraint de Postgres exige `price > 0` estrictamente. Un `price: 0` explícito pasa la validación de Pydantic pero falla al persistir. Es una inconsistencia preexistente, no introducida por este fix, y queda fuera de alcance — se documenta acá para que quede trazada.
