"""
Tests for category endpoints:
  - Public list (only non-deleted, cache header)
  - Get by ID (public)
  - Admin: create, update, delete
  - Non-admin cannot mutate
"""
from app.models.category import Category

BASE = "/api/categories"


# ---------------------------------------------------------------------------
# Public listing
# ---------------------------------------------------------------------------

class TestListCategories:
    def test_list_returns_200(self, client):
        r = client.get(BASE)
        assert r.status_code == 200
        data = r.json()
        assert "items" in data and "total" in data

    def test_list_excludes_deleted(self, client, db):
        alive = Category(name="Frenos", slug="frenos", is_deleted=False)
        dead = Category(name="Obsoleta", slug="obsoleta", is_deleted=True)
        db.add_all([alive, dead])
        db.flush()
        r = client.get(BASE)
        slugs = [c["slug"] for c in r.json()["items"]]
        assert "frenos" in slugs
        assert "obsoleta" not in slugs

    def test_list_cache_control(self, client):
        r = client.get(BASE)
        cc = r.headers.get("cache-control", "")
        assert "public" in cc and "max-age" in cc

    def test_list_pagination(self, client, db):
        for i in range(5):
            db.add(Category(name=f"Cat {i}", slug=f"cat-{i}", is_deleted=False))
        db.flush()
        r = client.get(BASE, params={"limit": 2, "skip": 0})
        assert len(r.json()["items"]) == 2


# ---------------------------------------------------------------------------
# Get by ID
# ---------------------------------------------------------------------------

class TestGetCategory:
    def test_get_existing(self, client, category):
        r = client.get(f"{BASE}/{category.id}")
        assert r.status_code == 200
        assert r.json()["slug"] == category.slug

    def test_get_nonexistent(self, client):
        r = client.get(f"{BASE}/99999")
        assert r.status_code == 404


# ---------------------------------------------------------------------------
# Admin: create
# ---------------------------------------------------------------------------

class TestCreateCategory:
    def test_admin_can_create(self, admin_client):
        r = admin_client.post(BASE, json={"name": "Suspensión", "slug": "suspension"})
        assert r.status_code == 201
        assert r.json()["name"] == "Suspensión"

    def test_create_requires_admin(self, user_client):
        r = user_client.post(BASE, json={"name": "X", "slug": "x"})
        assert r.status_code == 403

    def test_create_requires_auth(self, client):
        r = client.post(BASE, json={"name": "X", "slug": "x"})
        assert r.status_code == 401

    def test_create_validates_name(self, admin_client):
        r = admin_client.post(BASE, json={"name": "", "slug": "empty"})
        assert r.status_code == 422


# ---------------------------------------------------------------------------
# Admin: update
# ---------------------------------------------------------------------------

class TestUpdateCategory:
    def test_admin_can_update(self, admin_client, category):
        r = admin_client.patch(f"{BASE}/{category.id}", json={"name": "Filtros Pro"})
        assert r.status_code == 200
        assert r.json()["name"] == "Filtros Pro"

    def test_update_nonexistent(self, admin_client):
        r = admin_client.patch(f"{BASE}/99999", json={"name": "X"})
        assert r.status_code == 404

    def test_update_requires_admin(self, user_client, category):
        r = user_client.patch(f"{BASE}/{category.id}", json={"name": "X"})
        assert r.status_code == 403


# ---------------------------------------------------------------------------
# Admin: delete
# ---------------------------------------------------------------------------

class TestDeleteCategory:
    def test_admin_can_delete(self, admin_client, db):
        c = Category(name="Temporal", slug="temporal", is_deleted=False)
        db.add(c)
        db.flush()
        r = admin_client.delete(f"{BASE}/{c.id}")
        assert r.status_code == 204
        db.expire(c)
        assert c.is_deleted is True

    def test_delete_nonexistent(self, admin_client):
        r = admin_client.delete(f"{BASE}/99999")
        assert r.status_code == 404

    def test_delete_requires_admin(self, user_client, category):
        r = user_client.delete(f"{BASE}/{category.id}")
        assert r.status_code == 403
