"""
Tests for SEO endpoints:
  - GET /sitemap.xml (rutas estáticas + categorías activas)
  - GET /robots.txt
"""
from urllib.parse import quote

from app.models.category import Category
from app.models.product import Product

BASE_SITEMAP = "/sitemap.xml"
BASE_ROBOTS = "/robots.txt"


class TestSitemap:
    def test_sitemap_status_and_content_type(self, client):
        r = client.get(BASE_SITEMAP)
        assert r.status_code == 200
        assert "xml" in r.headers["content-type"]

    def test_sitemap_includes_static_routes(self, client):
        r = client.get(BASE_SITEMAP)
        body = r.text
        for path in ("<loc>", "/catalogo", "/marcas", "/contacto", "/faq"):
            assert path in body

    def test_sitemap_includes_active_category(self, client, category):
        r = client.get(BASE_SITEMAP)
        encoded = quote(category.name, safe="")
        assert f"cat={encoded}" in r.text

    def test_sitemap_excludes_soft_deleted_category(self, client, db):
        cat = Category(name="Descontinuados", slug="descontinuados", is_deleted=True)
        db.add(cat)
        db.flush()
        r = client.get(BASE_SITEMAP)
        encoded = quote(cat.name, safe="")
        assert f"cat={encoded}" not in r.text

    def test_sitemap_does_not_require_auth(self, client):
        r = client.get(BASE_SITEMAP)
        assert r.status_code == 200

    # ── URLs de producto -- hallazgo "Alta" #17 de la auditoría técnica
    # del 2026-07-13: el sitemap no traía ninguna URL de producto
    # individual, así que Google solo podía descubrirlas por links
    # internos en vez de por acá. ──────────────────────────────────────
    def test_sitemap_includes_active_product_url(self, client, product: Product):
        r = client.get(BASE_SITEMAP)
        assert f"<loc>http://localhost:5173/producto/{product.id}</loc>" in r.text

    def test_sitemap_excludes_soft_deleted_product(self, client, deleted_product: Product):
        r = client.get(BASE_SITEMAP)
        assert f"/producto/{deleted_product.id}</loc>" not in r.text

    def test_sitemap_includes_out_of_stock_product(self, client, db, category, brand):
        # GET /api/products/{id} sirve el detalle igual esté agotado o no
        # (products.py: get_product solo filtra por is_deleted) -- la URL
        # sigue siendo válida y debe aparecer en el sitemap.
        p = Product(
            name="Sin stock", sku="NOSTOCK-001", stock=0,
            category_id=category.id, brand_id=brand.id, is_deleted=False,
        )
        db.add(p)
        db.flush()
        r = client.get(BASE_SITEMAP)
        assert f"<loc>http://localhost:5173/producto/{p.id}</loc>" in r.text

    def test_sitemap_product_url_has_lastmod(self, client, product: Product):
        r = client.get(BASE_SITEMAP)
        idx = r.text.index(f"/producto/{product.id}</loc>")
        chunk = r.text[idx:idx + 200]
        assert "<lastmod>" in chunk
        assert "<changefreq>weekly</changefreq>" in chunk


class TestRobots:
    def test_robots_status_and_content_type(self, client):
        r = client.get(BASE_ROBOTS)
        assert r.status_code == 200
        assert "text/plain" in r.headers["content-type"]

    def test_robots_disallows_admin_and_api(self, client):
        body = client.get(BASE_ROBOTS).text
        assert "Disallow: /admin" in body
        assert "Disallow: /api/" in body

    def test_robots_references_sitemap(self, client):
        body = client.get(BASE_ROBOTS).text
        assert "Sitemap:" in body
        assert "sitemap.xml" in body
