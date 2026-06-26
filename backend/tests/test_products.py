"""
Tests for product endpoints:
  - List returns only non-deleted products
  - Deleted product not returned by ID
  - Search by name and SKU
  - Category and in_stock filters
  - Cache-Control header present on public GETs
  - Admin can create, update, delete (soft)
  - Non-admin cannot mutate
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.category import Category
from app.models.product import Product


BASE = "/api/products"


# ---------------------------------------------------------------------------
# Public listing
# ---------------------------------------------------------------------------

class TestListProducts:
    def test_list_excludes_deleted(self, client, product, deleted_product):
        r = client.get(BASE)
        assert r.status_code == 200
        ids = [p["id"] for p in r.json()["items"]]
        assert product.id in ids
        assert deleted_product.id not in ids

    def test_list_total_excludes_deleted(self, client, product, deleted_product):
        r = client.get(BASE)
        assert r.json()["total"] == 1

    def test_cache_control_header(self, client, product):
        r = client.get(BASE)
        cc = r.headers.get("cache-control", "")
        assert "public" in cc
        assert "max-age" in cc

    def test_filter_in_stock(self, client, db, category):
        out = Product(name="Sin stock", sku="NO-STOCK", stock=0, category_id=category.id, is_deleted=False)
        db.add(out)
        db.flush()
        r = client.get(BASE, params={"in_stock": True})
        assert r.status_code == 200
        skus = [p["sku"] for p in r.json()["items"]]
        assert "NO-STOCK" not in skus

    def test_filter_by_category(self, client, product, db):
        other_cat = Category(name="Otros", slug="otros", is_deleted=False)
        db.add(other_cat)
        db.flush()
        other = Product(name="Otro producto", sku="OTHER-001", stock=1, category_id=other_cat.id, is_deleted=False)
        db.add(other)
        db.flush()

        r = client.get(BASE, params={"category_id": product.category_id})
        ids = [p["id"] for p in r.json()["items"]]
        assert product.id in ids
        assert other.id not in ids


# ---------------------------------------------------------------------------
# Search
# ---------------------------------------------------------------------------

class TestProductSearch:
    def test_search_by_name(self, client, product):
        r = client.get(BASE, params={"q": "Filtro"})
        assert r.status_code == 200
        assert any(p["id"] == product.id for p in r.json()["items"])

    def test_search_by_sku(self, client, product):
        r = client.get(BASE, params={"q": "FILT-001"})
        assert r.status_code == 200
        assert any(p["id"] == product.id for p in r.json()["items"])

    def test_search_no_match(self, client, product):
        r = client.get(BASE, params={"q": "xyznotexist"})
        assert r.json()["total"] == 0

    def test_search_excludes_deleted(self, client, deleted_product):
        r = client.get(BASE, params={"q": "borrado"})
        ids = [p["id"] for p in r.json()["items"]]
        assert deleted_product.id not in ids


# ---------------------------------------------------------------------------
# Get by ID
# ---------------------------------------------------------------------------

class TestGetProduct:
    def test_get_existing(self, client, product):
        r = client.get(f"{BASE}/{product.id}")
        assert r.status_code == 200
        assert r.json()["sku"] == product.sku

    def test_get_deleted_returns_404(self, client, deleted_product):
        r = client.get(f"{BASE}/{deleted_product.id}")
        assert r.status_code == 404

    def test_get_nonexistent_404(self, client):
        r = client.get(f"{BASE}/99999")
        assert r.status_code == 404

    def test_cache_control_on_detail(self, client, product):
        r = client.get(f"{BASE}/{product.id}")
        cc = r.headers.get("cache-control", "")
        assert "public" in cc


# ---------------------------------------------------------------------------
# Admin mutations
# ---------------------------------------------------------------------------

class TestProductAdmin:
    def test_create_product(self, admin_client, category, brand):
        payload = {
            "name": "Nuevo filtro",
            "sku": "NEW-001",
            "stock": 5,
            "price": 2000,
            "category_id": category.id,
            "brand_id": brand.id,
        }
        r = admin_client.post(BASE, json=payload)
        assert r.status_code == 201
        assert r.json()["sku"] == "NEW-001"

    def test_create_requires_admin(self, user_client, category):
        r = user_client.post(BASE, json={"name": "X", "sku": "X-001", "stock": 1})
        assert r.status_code == 403

    def test_create_requires_auth(self, client):
        r = client.post(BASE, json={"name": "X", "sku": "X-001", "stock": 1})
        assert r.status_code == 401

    def test_soft_delete(self, admin_client, client, product):
        r = admin_client.delete(f"{BASE}/{product.id}")
        assert r.status_code == 204
        # Product should no longer appear in listing
        r2 = client.get(BASE)
        ids = [p["id"] for p in r2.json()["items"]]
        assert product.id not in ids

    def test_soft_delete_requires_admin(self, user_client, product):
        r = user_client.delete(f"{BASE}/{product.id}")
        assert r.status_code == 403

    def test_update_product(self, admin_client, product):
        r = admin_client.patch(f"{BASE}/{product.id}", json={"name": "Filtro actualizado"})
        assert r.status_code == 200
        assert r.json()["name"] == "Filtro actualizado"
