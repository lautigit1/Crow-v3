# favorites-and-orders — Design

## Problema
- Favoritos estaban en `localStorage`: se pierden al cambiar de dispositivo o navegador.
- "Mis pedidos" era una página placeholder sin backend.

## Solución

### Favoritos (backend)
- Nueva tabla `user_favorites (id, user_id FK, product_id FK, created_at)` con `UNIQUE(user_id, product_id)`.
- 3 endpoints bajo `/api/favorites`:
  - `GET /favorites` → lista de `product_ids` del usuario
  - `POST /favorites/{product_id}` → agrega (idempotente via IntegrityError catch)
  - `DELETE /favorites/{product_id}` → elimina (no-op si no existe)
- `useFavorites.ts` reemplazado: llama a la API con update optimista + revert en error.

### Pedidos (orders)
- Tabla `orders (id, user_id, status ENUM, notes, admin_notes, created_at, updated_at)`.
- Tabla `order_items (id, order_id, product_id nullable, sku_snapshot, name_snapshot, unit_price_snapshot, quantity)` — snapshot de producto al momento del pedido.
- Status: `Pendiente → Confirmado → En proceso → Enviado → Entregado / Cancelado`.
- Endpoints bajo `/api/orders`:
  - `GET /orders/me` — pedidos del usuario autenticado (paginado)
  - `GET /orders/me/{id}` — detalle
  - `POST /orders` — crear pedido con items
  - `GET /orders` (admin) — todos los pedidos, filtrable por `user_id`
  - `PATCH /orders/{id}` (admin) — actualizar status y notas

### Frontend
- `entities/favorite/index.ts` — `favoriteApi`
- `entities/order/index.ts` — `orderApi`, tipos, colores por status
- `MyOrdersPage.tsx` — lista paginada, drawer de detalle, modal de creación con búsqueda de productos
- `useFavorites.ts` — migrado de localStorage a API

## Migración
`007_favorites_and_orders.py` — crea ambas tablas y el ENUM `orderstatus`.
