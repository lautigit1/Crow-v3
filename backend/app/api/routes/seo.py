"""
SEO endpoints — sitemap.xml and robots.txt.

Sitemap is generated dynamically so it always reflects current categories.
Both endpoints are intentionally outside the /api prefix so they resolve at
the root domain (https://crowrepuestos.com.ar/sitemap.xml).
"""
from datetime import date

from fastapi import APIRouter
from fastapi.responses import PlainTextResponse
from sqlalchemy import select

from app.core.config import settings
from app.core.deps import DbSession
from app.models.category import Category
from app.models.product import Product, producto_publico

router = APIRouter(tags=["seo"])

# Static public routes to include in every sitemap
_STATIC_ROUTES: list[tuple[str, str, str]] = [
    # (path, lastmod, changefreq)
    ("/",             str(date.today()), "weekly"),
    ("/catalogo",     str(date.today()), "daily"),
    ("/marcas",       str(date.today()), "weekly"),
    ("/contacto",     str(date.today()), "monthly"),
    ("/faq",          str(date.today()), "monthly"),
]


def _url_entry(loc: str, lastmod: str, changefreq: str, priority: str) -> str:
    return (
        f"  <url>\n"
        f"    <loc>{loc}</loc>\n"
        f"    <lastmod>{lastmod}</lastmod>\n"
        f"    <changefreq>{changefreq}</changefreq>\n"
        f"    <priority>{priority}</priority>\n"
        f"  </url>"
    )


@router.get("/sitemap.xml", response_class=PlainTextResponse)
def sitemap(db: DbSession) -> str:
    base = settings.FRONTEND_URL.rstrip("/")
    today = str(date.today())
    entries: list[str] = []

    # Static routes
    for path, lastmod, changefreq in _STATIC_ROUTES:
        priority = "1.0" if path == "/" else "0.8"
        entries.append(_url_entry(f"{base}{path}", lastmod, changefreq, priority))

    # Dynamic category filter pages — /catalogo?cat=<name>
    categories = list(db.scalars(
        select(Category.name)
        .where(Category.is_deleted.is_(False))
        .order_by(Category.name)
    ).all())

    for cat_name in categories:
        from urllib.parse import quote
        encoded = quote(cat_name, safe="")
        entries.append(_url_entry(
            f"{base}/catalogo?cat={encoded}",
            today,
            "daily",
            "0.7",
        ))

    # Dynamic product detail pages — /producto/<id>. Hallazgo "Alta" #17 de
    # la auditoría técnica del 2026-07-13: el sitemap no incluía ninguna URL
    # de producto individual, así que Google nunca las descubría por acá
    # (solo por links internos, mucho más lento e incompleto). Sin límite de
    # resultados a propósito -- a diferencia del endpoint público
    # GET /api/products (que sí pagina, `limit<=100`), acá se necesita el
    # catálogo completo en una sola pasada. Se incluyen todos los productos
    # no eliminados, sin filtrar por stock: GET /api/products/{id} sirve la
    # página de detalle igual esté agotado o no (ver products.py,
    # get_product no filtra por stock, solo por is_deleted), así que la URL
    # sigue siendo válida y vale la pena que Google la indexe.
    products = list(db.execute(
        select(Product.id, Product.updated_at)
        .where(producto_publico())
        .order_by(Product.id)
    ).all())

    for product_id, updated_at in products:
        lastmod = str(updated_at.date()) if updated_at else today
        entries.append(_url_entry(
            f"{base}/producto/{product_id}",
            lastmod,
            "weekly",
            "0.6",
        ))

    xml = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        + "\n".join(entries)
        + "\n</urlset>"
    )
    return PlainTextResponse(content=xml, media_type="application/xml")


@router.get("/robots.txt", response_class=PlainTextResponse)
def robots_txt() -> str:
    base = settings.FRONTEND_URL.rstrip("/")
    content = f"""\
User-agent: *
Allow: /
Disallow: /admin
Disallow: /cuenta
Disallow: /api/

Sitemap: {base}/sitemap.xml
"""
    return PlainTextResponse(content=content, media_type="text/plain")
