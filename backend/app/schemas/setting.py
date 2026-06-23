from pydantic import BaseModel

# Default site configuration (Argentina). Stored rows override these.
DEFAULT_SETTINGS: dict[str, str] = {
    "company_name": "Crow Repuestos",
    "phone_display": "+54 11 2345-6789",
    "whatsapp_number": "5491123456789",
    "email": "ventas@crowrepuestos.com.ar",
    "address": "Av. Corrientes 1234 · CABA, Argentina",
    "hours": "Lun–Sáb · 8:00–18:00",
    "instagram": "https://instagram.com/crowrepuestos",
    "facebook": "https://facebook.com/crowrepuestos",
    "tiktok": "https://tiktok.com/@crowrepuestos",
}


class SiteSettings(BaseModel):
    company_name: str
    phone_display: str
    whatsapp_number: str
    email: str
    address: str
    hours: str
    instagram: str
    facebook: str
    tiktok: str


class SiteSettingsUpdate(BaseModel):
    company_name: str | None = None
    phone_display: str | None = None
    whatsapp_number: str | None = None
    email: str | None = None
    address: str | None = None
    hours: str | None = None
    instagram: str | None = None
    facebook: str | None = None
    tiktok: str | None = None
