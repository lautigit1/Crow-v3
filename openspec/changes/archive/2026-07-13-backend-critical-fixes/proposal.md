# Proposal: backend-critical-fixes

## What

Tres correcciones de backend que salen directamente del listado de hallazgos críticos de la auditoría del 2026-07-13 (`Auditoria_Tecnica_Crow_Repuestos_v3.docx`):

1. **N+1 en el listado de pedidos** (`GET /api/orders/me` y `GET /api/orders` admin) — cada pedido de la página disparaba una query extra para cargar sus items.
2. **`RegisterRequest` sin límites de longitud** — `full_name`/`phone` aceptaban cualquier tamaño en el registro público, mientras que el resto de los endpoints de usuario (`UserBase`) ya los limitaban.
3. **CHECK constraints invisibles para el ORM** — `stock >= 0`, `price > 0` y `quotes.message` no vacío existían solo como SQL crudo en las migraciones 005 y 011, sin reflejo en los modelos de SQLAlchemy.

## Why

- El N+1 de pedidos es un problema de escalabilidad real: con `limit=100` (el máximo permitido por la API), listar pedidos podía disparar hasta 101 queries en un solo request. A la carga de 1k-10k usuarios concurrentes que proyecta la auditoría, esto satura el pool de conexiones a Postgres mucho antes que cualquier otro cuello de botella del sistema.
- `RegisterRequest` sin `max_length` no es solo una inconsistencia de estilo: un `full_name` o `phone` de varios MB pasaba la validación de Pydantic y recién fallaba en el `INSERT` contra `VARCHAR(120)`/`VARCHAR(40)` de Postgres, devolviendo un 503 genérico ("error de base de datos") en vez de un 422 de validación — un caso de manejo de errores incorrecto que además permite gastar CPU parseando payloads grandes antes de rechazarlos.
- Las CHECK constraints solo en migraciones (no en los modelos) son invisibles para la suite de tests, que usa SQLite en memoria vía `Base.metadata.create_all()` y no corre las migraciones de Postgres. Un bug de código que dejara stock negativo o un precio en cero hubiera pasado todos los tests sin que ninguno lo detectara, aunque en producción real (Postgres, vía Alembic) sí hubiera fallado — una falsa sensación de cobertura.

## Non-goals

- No se agrega caché (Redis) a los listados de pedidos — el fix es específicamente la query N+1, no una optimización de performance más amplia.
- No se cambian los límites de longitud de otros schemas que no sean `RegisterRequest` (los demás ya estaban alineados con sus modelos).
- No se agregan constraints nuevas a nivel de base de datos — solo se reflejan en el ORM las que ya existen en Postgres desde las migraciones 005 y 011.

## Success criteria

- Listar pedidos (propios o admin) emite un número constante de queries SQL sin importar cuántos pedidos haya en la página — verificado con un test de regresión que cuenta queries reales, no solo que la respuesta sea correcta.
- Registrar un usuario con `full_name` o `phone` que excede los límites de `UserBase` devuelve 422, no 503.
- Intentar persistir un producto con stock negativo, precio ≤ 0, o un presupuesto con mensaje vacío/solo espacios falla con `IntegrityError` incluso contra la base SQLite de tests, sin necesidad de una base Postgres real para detectarlo.
- Suite completa de tests de backend (18 archivos, 249 tests) pasa sin regresiones.
