# Proposal: audit-pending-fixes

## What

Cerrar los puntos sensibles restantes de la auditoría técnica (excluyendo
infraestructura de producción, ya cubierta por `prod-readiness-fixes`):

1. `suppliers.name` sin `UNIQUE` — permite proveedores duplicados.
2. Falta índice compuesto `products(category_id, stock)` para el filtro más
   común del catálogo.
3. `quotes.message` sin longitud mínima a nivel de base de datos (solo
   Pydantic la validaba).
4. Email templates (M9) como f-strings de Python en vez de templates reales.

## Why

- **Suppliers duplicados**: sin constraint, un typo o doble carga del admin
  deja dos filas de "el mismo" proveedor, ensuciando reportes y el selector
  de proveedor en el form de productos.
- **Índice faltante**: `GET /products?category_id=X&stock_gt=0` (el filtro
  más común del catálogo) hace table scan a medida que crece la tabla; ya
  existe el patrón de partial index (migración 006), agregar este es de bajo
  costo y alto beneficio.
- **`quotes.message` sin CHECK**: la garantía de "no vacío" depende
  enteramente de la capa de aplicación (Pydantic). Cualquier inserción que no
  pase por el endpoint (script, migración de datos, bug futuro) puede dejar
  mensajes vacíos.
- **Email templates como f-strings**: además del problema de mantenibilidad
  original (M9), al revisar el código se encontró que `customer_name` y
  `message` (datos provistos por el cliente, sin autenticar, en el form
  público de cotización) se interpolaban crudos en el HTML del mail al
  admin — un mensaje con `<script>` o `<img onerror=...>` se habría
  ejecutado en el cliente de correo del admin. Migrar a Jinja2 con
  autoescape cierra ese problema de paso.

## Non-goals

- No se tocan los índices/constraints ya resueltos en migraciones previas
  (005 CHECK de stock/price, 006 partial indexes, 008 quotes.user_id /
  audit_logs.created_at).
- No se agrega un sistema de plantillas de email más allá de lo necesario
  para reemplazar los dos emails existentes (quote notification, reset
  password).

## Success criteria

- `suppliers.name` tiene `UNIQUE` a nivel de DB; crear/actualizar un
  proveedor con nombre duplicado (case-insensitive) devuelve 409, no un
  `IntegrityError` sin manejar.
- Existe un índice `products(category_id, stock)` parcial
  (`WHERE is_deleted = false`).
- `quotes.message` tiene un `CHECK` que rechaza vacío/solo-espacios.
- Los dos emails (`build_quote_notification`, `build_reset_email`) se
  renderizan desde templates Jinja2 con autoescape en HTML; el texto plano
  no se ve afectado.
- Contenido provisto por el cliente (nombre, mensaje de cotización) queda
  HTML-escapado en el mail al admin.
- Tests de backend existentes sin regresiones; se agregan tests nuevos para
  cada uno de los cuatro puntos.
