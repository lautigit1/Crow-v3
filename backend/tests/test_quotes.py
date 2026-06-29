"""
Tests for quote endpoints:
  - Public quote creation (success, rate limit)
  - Auth quote linked to user
  - User sees only own quotes
  - Admin sees all quotes
  - Admin can update status
  - Non-admin cannot list all or update status
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.quote import Quote, QuoteStatus


BASE = "/api/quotes"

_QUOTE_PAYLOAD = {
    "customer_name": "Juan Perez",
    "customer_email": "juan@test.com",
    "customer_phone": "261123456",
    "vehicle": "Ford Ranger 2020",
    "message": "Necesito filtro de aceite",
}


# ---------------------------------------------------------------------------
# Public quote creation
# ---------------------------------------------------------------------------

class TestPublicQuote:
    def test_create_quote(self, client):
        r = client.post(BASE, json=_QUOTE_PAYLOAD)
        assert r.status_code == 201
        data = r.json()
        assert data["customer_name"] == "Juan Perez"
        assert data["status"] == "Nueva"

    def test_quote_not_linked_to_user(self, client):
        r = client.post(BASE, json=_QUOTE_PAYLOAD)
        assert r.json()["user_id"] is None

    def test_create_quote_minimal(self, client):
        r = client.post(BASE, json={"customer_name": "Ana", "message": "Consulta"})
        assert r.status_code == 201

    def test_create_quote_missing_name(self, client):
        r = client.post(BASE, json={"message": "Sin nombre"})
        assert r.status_code == 422


# ---------------------------------------------------------------------------
# Authenticated quote
# ---------------------------------------------------------------------------

class TestAuthQuote:
    def test_auth_quote_linked_to_user(self, user_client, user):
        r = user_client.post(f"{BASE}/me", json=_QUOTE_PAYLOAD)
        assert r.status_code == 201
        assert r.json()["user_id"] == user.id

    def test_auth_quote_requires_login(self, client):
        r = client.post(f"{BASE}/me", json=_QUOTE_PAYLOAD)
        assert r.status_code == 401


# ---------------------------------------------------------------------------
# User: see own quotes
# ---------------------------------------------------------------------------

class TestUserQuotes:
    def test_user_sees_own_quotes(self, user_client, user):
        user_client.post(f"{BASE}/me", json=_QUOTE_PAYLOAD)
        r = user_client.get(f"{BASE}/me")
        assert r.status_code == 200
        data = r.json()
        assert "items" in data and "total" in data
        assert data["total"] == 1
        assert len(data["items"]) == 1

    def test_user_sees_only_own_quotes(self, user_client, user, admin, db):
        # Insert admin quote directly in DB (avoids cookie-jar conflict with shared client)
        db.add(Quote(customer_name="Other", message="Consulta", user_id=admin.id))
        db.flush()
        # User creates their own quote via the API
        user_client.post(f"{BASE}/me", json=_QUOTE_PAYLOAD)
        r = user_client.get(f"{BASE}/me")
        assert r.status_code == 200
        quotes = r.json()["items"]
        assert len(quotes) >= 1
        assert all(q["user_id"] == user.id for q in quotes)

    def test_user_me_requires_auth(self, client):
        r = client.get(f"{BASE}/me")
        assert r.status_code == 401


# ---------------------------------------------------------------------------
# Admin: list all quotes
# ---------------------------------------------------------------------------

class TestAdminQuotes:
    def test_admin_sees_all(self, admin_client, client, db, user):
        # Public quote
        client.post(BASE, json=_QUOTE_PAYLOAD)
        r = admin_client.get(BASE)
        assert r.status_code == 200
        assert r.json()["total"] >= 1

    def test_list_requires_admin(self, user_client):
        r = user_client.get(BASE)
        assert r.status_code == 403

    def test_list_requires_auth(self, client):
        r = client.get(BASE)
        assert r.status_code == 401

    def test_admin_filter_by_status(self, admin_client, db):
        q = Quote(customer_name="Test", message="Hola", status=QuoteStatus.RESPONDIDA)
        db.add(q)
        db.flush()
        r = admin_client.get(BASE, params={"status": "Respondida"})
        assert r.status_code == 200
        statuses = [item["status"] for item in r.json()["items"]]
        assert all(s == "Respondida" for s in statuses)


# ---------------------------------------------------------------------------
# Admin: update status
# ---------------------------------------------------------------------------

class TestQuoteStatus:
    def test_admin_updates_status(self, admin_client, db):
        q = Quote(customer_name="Test", message="Hola")
        db.add(q)
        db.flush()
        r = admin_client.patch(f"{BASE}/{q.id}/status", json={"status": "Respondida"})
        assert r.status_code == 200
        assert r.json()["status"] == "Respondida"

    def test_status_update_requires_admin(self, user_client, db):
        q = Quote(customer_name="Test", message="Hola")
        db.add(q)
        db.flush()
        r = user_client.patch(f"{BASE}/{q.id}/status", json={"status": "Respondida"})
        assert r.status_code == 403

    def test_status_update_nonexistent(self, admin_client):
        r = admin_client.patch(f"{BASE}/99999/status", json={"status": "Respondida"})
        assert r.status_code == 404
