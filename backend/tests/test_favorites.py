"""
Tests for favorites endpoints:
  - GET /api/favorites (propios, requiere auth)
  - POST/DELETE /api/favorites/{product_id} (agregar/quitar, idempotente)
  - Aislamiento por usuario, producto inexistente/eliminado
"""
BASE = "/api/favorites"


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------

class TestFavoritesAuth:
    def test_list_requires_auth(self, client):
        r = client.get(BASE)
        assert r.status_code == 401

    def test_add_requires_auth(self, client, product):
        r = client.post(f"{BASE}/{product.id}")
        assert r.status_code == 401

    def test_remove_requires_auth(self, client, product):
        r = client.delete(f"{BASE}/{product.id}")
        assert r.status_code == 401


# ---------------------------------------------------------------------------
# List
# ---------------------------------------------------------------------------

class TestListFavorites:
    def test_empty_by_default(self, user_client):
        r = user_client.get(BASE)
        assert r.status_code == 200
        data = r.json()
        assert data["product_ids"] == []
        assert data["total"] == 0


# ---------------------------------------------------------------------------
# Add
# ---------------------------------------------------------------------------

class TestAddFavorite:
    def test_add_favorite(self, user_client, product):
        r = user_client.post(f"{BASE}/{product.id}")
        assert r.status_code == 201
        assert r.json()["product_id"] == product.id

        listed = user_client.get(BASE).json()
        assert product.id in listed["product_ids"]
        assert listed["total"] == 1

    def test_add_favorite_idempotent(self, user_client, product):
        r1 = user_client.post(f"{BASE}/{product.id}")
        r2 = user_client.post(f"{BASE}/{product.id}")
        assert r1.status_code == 201
        assert r2.status_code == 201  # no rompe al repetir

        listed = user_client.get(BASE).json()
        assert listed["product_ids"].count(product.id) == 1  # sin duplicados
        assert listed["total"] == 1

    def test_add_favorite_nonexistent_product(self, user_client):
        r = user_client.post(f"{BASE}/99999")
        assert r.status_code == 404

    def test_add_favorite_deleted_product(self, user_client, deleted_product):
        r = user_client.post(f"{BASE}/{deleted_product.id}")
        assert r.status_code == 404

    def test_favorites_isolated_per_user(self, user_client, admin_client, product):
        user_client.post(f"{BASE}/{product.id}")
        admin_listed = admin_client.get(BASE).json()
        assert product.id not in admin_listed["product_ids"]


# ---------------------------------------------------------------------------
# Remove
# ---------------------------------------------------------------------------

class TestRemoveFavorite:
    def test_remove_favorite(self, user_client, product):
        user_client.post(f"{BASE}/{product.id}")
        r = user_client.delete(f"{BASE}/{product.id}")
        assert r.status_code == 204

        listed = user_client.get(BASE).json()
        assert product.id not in listed["product_ids"]

    def test_remove_not_favorited_is_noop(self, user_client, product):
        # Nunca se agregó -- no debería explotar
        r = user_client.delete(f"{BASE}/{product.id}")
        assert r.status_code == 204
