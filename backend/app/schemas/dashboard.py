from pydantic import BaseModel

from app.schemas.quote import QuoteRead


class DashboardStats(BaseModel):
    total_products: int
    out_of_stock: int
    pending_quotes: int
    registered_users: int
    total_categories: int
    total_brands: int
    total_suppliers: int
    active_suppliers: int
    recent_quotes: list[QuoteRead]


class NamedCount(BaseModel):
    label: str
    value: int


class StockSummary(BaseModel):
    in_stock: int
    low_stock: int
    out_of_stock: int


class Analytics(BaseModel):
    products_by_category: list[NamedCount]
    products_by_supplier: list[NamedCount]
    quotes_by_status: list[NamedCount]
    products_by_vehicle: list[NamedCount]
    stock_summary: StockSummary
    inventory_value: float


class TrendPoint(BaseModel):
    # `date` es el inicio del bucket en ISO (día para 7d/30d, lunes de la
    # semana para 90d, primero de mes para 12m). El frontend lo formatea.
    date: str
    revenue: float
    orders: int
    quotes: int


class Trends(BaseModel):
    period: str        # "7d" | "30d" | "90d" | "12m"
    granularity: str   # "day" | "week" | "month"
    points: list[TrendPoint]
