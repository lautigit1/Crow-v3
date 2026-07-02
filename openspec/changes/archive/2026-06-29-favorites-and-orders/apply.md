# Apply: favorites-and-orders

## Archivos creados — Backend

- `app/models/favorite.py` — `UserFavorite` con `UniqueConstraint(user_id, product_id)`
- `app/models/order.py` — `Order`, `OrderItem`, `OrderStatus` enum
- `app/schemas/favorite.py` — `FavoriteList`
- `app/schemas/order.py` — `OrderItemCreate`, `OrderCreate`, `OrderItemRead`,
  `OrderRead`, `OrderList`, `OrderStatusUpdate`
- `app/api/routes/favorites.py` — GET/POST/DELETE `/favorites`
- `app/api/routes/orders.py` — endpoints user + admin
- `alembic/versions/007_favorites_and_orders.py` — crea `user_favorites`,
  `orders`, `order_items` y el ENUM `orderstatus`

## Archivos modificados — Backend

- `app/models/__init__.py` — imports `UserFavorite`, `Order`, `OrderItem`, `OrderStatus`
- `app/api/__init__.py` — routers `favorites` y `orders` registrados

## Archivos creados — Frontend

- `frontend/src/entities/favorite/index.ts` — `favoriteApi` (list/add/remove)
- `frontend/src/entities/order/index.ts` — `orderApi`, tipos, `ORDER_STATUS_COLOR`
- `frontend/src/pages/account/MyOrdersPage.tsx` — implementación completa

## Archivos modificados — Frontend

- `frontend/src/shared/lib/useFavorites.ts` — migrado de localStorage a API,
  optimistic updates con revert en error

## Desviaciones del plan

Ninguna.
