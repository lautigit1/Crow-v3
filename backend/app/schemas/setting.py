from pydantic import BaseModel

# Default site configuration -- valores reales del negocio (antes vivían
# hardcodeados en frontend/src/shared/config/contact.ts). Sirven de valor
# efectivo cuando todavía no hay filas en la tabla `settings` (instalación
# nueva) y cualquier clave sin fila propia sigue cayendo acá. Se pueden
# editar desde el panel admin (Configuración) sin tocar código.
DEFAULT_SETTINGS: dict[str, str] = {
    "company_name": "Crow Repuestos",
    "phone_display": "261 660-0569",
    "whatsapp_number": "5492616600569",
    "email": "ventas@crowrepuestos.com.ar",
    "address": "Mendoza, Argentina",
    "hours": "Lun–Sáb · 8:00–18:00",
    "instagram": "https://instagram.com/crowrepuestos",
    "facebook": "https://facebook.com/crowrepuestos",
    "tiktok": "",
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
