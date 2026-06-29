# favorites-and-orders — Tasks

- [x] `app/models/favorite.py` — UserFavorite model
- [x] `app/models/order.py` — Order + OrderItem models + OrderStatus enum
- [x] `app/models/__init__.py` — registrar nuevos modelos
- [x] `app/schemas/favorite.py` — FavoriteList
- [x] `app/schemas/order.py` — OrderCreate, OrderRead, OrderList, OrderStatusUpdate
- [x] `app/api/routes/favorites.py` — GET/POST/DELETE /favorites
- [x] `app/api/routes/orders.py` — endpoints user + admin
- [x] `app/api/__init__.py` — registrar routers
- [x] `alembic/versions/007_favorites_and_orders.py` — migración
- [x] `frontend/src/entities/favorite/index.ts` — favoriteApi
- [x] `frontend/src/entities/order/index.ts` — orderApi + tipos + colores
- [x] `frontend/src/shared/lib/useFavorites.ts` — migrar a API
- [x] `frontend/src/pages/account/MyOrdersPage.tsx` — implementación completa
