from fastapi import APIRouter

from app.api.routes import audit, auth, brands, categories, dashboard, products, quotes, settings, suppliers, users

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(categories.router, prefix="/categories", tags=["categories"])
api_router.include_router(brands.router, prefix="/brands", tags=["brands"])
api_router.include_router(products.router, prefix="/products", tags=["products"])
api_router.include_router(quotes.router, prefix="/quotes", tags=["quotes"])
api_router.include_router(suppliers.router, prefix="/suppliers", tags=["suppliers"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
api_router.include_router(audit.router, prefix="/audit", tags=["audit"])
api_router.include_router(settings.router, prefix="/settings", tags=["settings"])
