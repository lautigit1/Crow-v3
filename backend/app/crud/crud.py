from app.crud.base import CRUDBase
from app.models.brand import Brand
from app.models.category import Category
from app.models.product import Product
from app.models.quote import Quote
from app.schemas.brand import BrandCreate, BrandUpdate
from app.schemas.category import CategoryCreate, CategoryUpdate
from app.schemas.product import ProductCreate, ProductUpdate
from app.schemas.quote import QuoteCreate

category = CRUDBase[Category, CategoryCreate, CategoryUpdate](Category, soft_delete=True)
brand    = CRUDBase[Brand, BrandCreate, BrandUpdate](Brand, soft_delete=True)
product  = CRUDBase[Product, ProductCreate, ProductUpdate](Product, soft_delete=True)
quote    = CRUDBase[Quote, QuoteCreate, QuoteCreate](Quote)
