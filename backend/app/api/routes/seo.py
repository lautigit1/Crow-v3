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
from app.core.database import get_db
from app.models.category import Category

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
def sitemap() -> str:
    base = settings.FRONTEND_URL.rstrip("/")
    today = str(date.today())
    entries: list[str] = []

    # Static routes
    for path, lastmod, changefreq in _STATIC_ROUTES:
        priority = "1.0" if path == "/" else "0.8"
        entries.append(_url_entry(f"{base}{path}", lastmod, changefreq, priority))

    # Dynamic category filter pages — /catalogo?cat=<name>
    db = next(get_db())
    try:
        categories = list(db.scalars(
            select(Category.name)
            .where(Category.is_deleted.is_(False))
            .order_by(Category.name)
        ).all())
    finally:
        db.close()

    for cat_name in categories:
        from urllib.parse import quote
        encoded = quote(cat_name, safe="")
        entries.append(_url_entry(
            f"{base}/catalogo?cat={encoded}",
            today,
            "daily",
            "0.7",
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
