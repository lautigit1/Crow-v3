"""
Tests for SEO endpoints:
  - GET /sitemap.xml (rutas estáticas + categorías activas)
  - GET /robots.txt
"""
from urllib.parse import quote

from app.models.category import Category

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
