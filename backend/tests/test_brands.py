"""
Tests for brand endpoints:
  - Public list (only non-deleted, cache header)
  - Get by ID (public)
  - Admin: create, update, delete
  - Non-admin cannot mutate
"""
from app.models.brand import Brand

BASE = "/api/brands"


# ---------------------------------------------------------------------------
# Public listing
# ---------------------------------------------------------------------------

class TestListBrands:
    def test_list_returns_200(self, client):
        r = client.get(BASE)
        assert r.status_code == 200
        data = r.json()
        assert "items" in data and "total" in data

    def test_list_excludes_deleted(self, client, db):
        alive = Brand(name="NGK", slug="ngk", is_deleted=False)
        dead = Brand(name="OldBrand", slug="old-brand", is_deleted=True)
        db.add_all([alive, dead])
        db.flush()
        r = client.get(BASE)
        slugs = [b["slug"] for b in r.json()["items"]]
        assert "ngk" in slugs
        assert "old-brand" not in slugs

    def test_list_cache_control(self, client):
        r = client.get(BASE)
        cc = r.headers.get("cache-control", "")
        assert "public" in cc and "max-age" in cc

    def test_list_pagination(self, client, db):
        for i in range(5):
            db.add(Brand(name=f"Marca {i}", slug=f"marca-{i}", is_deleted=False))
        db.flush()
        r = client.get(BASE, params={"limit": 3, "skip": 0})
        assert len(r.json()["items"]) == 3


# ---------------------------------------------------------------------------
# Get by ID
# ---------------------------------------------------------------------------

class TestGetBrand:
    def test_get_existing(self, client, brand):
        r = client.get(f"{BASE}/{brand.id}")
        assert r.status_code == 200
        assert r.json()["slug"] == brand.slug

    def test_get_nonexistent(self, client):
        r = client.get(f"{BASE}/99999")
        assert r.status_code == 404


# ---------------------------------------------------------------------------
# Admin: create
# ---------------------------------------------------------------------------

class TestCreateBrand:
    def test_admin_can_create(self, admin_client):
        r = admin_client.post(BASE, json={"name": "Monroe", "slug": "monroe"})
        assert r.status_code == 201
        assert r.json()["name"] == "Monroe"

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

class TestUpdateBrand:
    def test_admin_can_update(self, admin_client, brand):
        r = admin_client.patch(f"{BASE}/{brand.id}", json={"name": "Bosch Pro"})
        assert r.status_code == 200
        assert r.json()["name"] == "Bosch Pro"

    def test_update_nonexistent(self, admin_client):
        r = admin_client.patch(f"{BASE}/99999", json={"name": "X"})
        assert r.status_code == 404

    def test_update_requires_admin(self, user_client, brand):
        r = user_client.patch(f"{BASE}/{brand.id}", json={"name": "X"})
        assert r.status_code == 403


# ---------------------------------------------------------------------------
# Admin: delete (soft)
# ---------------------------------------------------------------------------

class TestDeleteBrand:
    def test_admin_can_delete(self, admin_client, db):
        b = Brand(name="Temporal", slug="temporal-b", is_deleted=False)
        db.add(b)
        db.flush()
        r = admin_client.delete(f"{BASE}/{b.id}")
        assert r.status_code == 204
        db.expire(b)
        assert b.is_deleted is True

    def test_delete_nonexistent(self, admin_client):
        r = admin_client.delete(f"{BASE}/99999")
        assert r.status_code == 404

    def test_delete_requires_admin(self, user_client, brand):
        r = user_client.delete(f"{BASE}/{brand.id}")
        assert r.status_code == 403
