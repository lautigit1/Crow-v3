"""
Tests for site settings endpoint:
  - GET /api/settings (público, defaults si no hay filas)
  - PUT /api/settings (admin-only, update parcial via exclude_unset)
"""
from app.models.setting import Setting
from app.schemas.setting import DEFAULT_SETTINGS

BASE = "/api/settings"


# ---------------------------------------------------------------------------
# GET (público)
# ---------------------------------------------------------------------------

class TestGetSettings:
    def test_get_defaults_without_rows(self, client):
        r = client.get(BASE)
        assert r.status_code == 200
        data = r.json()
        for key, value in DEFAULT_SETTINGS.items():
            assert data[key] == value

    def test_get_does_not_require_auth(self, client):
        r = client.get(BASE)
        assert r.status_code == 200

    def test_get_reflects_stored_rows(self, client, db):
        db.add(Setting(key="company_name", value="Crow Custom SRL"))
        db.flush()
        r = client.get(BASE)
        data = r.json()
        assert data["company_name"] == "Crow Custom SRL"
        # El resto de las claves sigue en su default
        assert data["email"] == DEFAULT_SETTINGS["email"]


# ---------------------------------------------------------------------------
# PUT (admin-only)
# ---------------------------------------------------------------------------

class TestUpdateSettings:
    def test_update_requires_auth(self, client):
        r = client.put(BASE, json={"company_name": "X"})
        assert r.status_code == 401

    def test_update_requires_admin(self, user_client):
        r = user_client.put(BASE, json={"company_name": "X"})
        assert r.status_code == 403

    def test_update_single_field(self, admin_client):
        r = admin_client.put(BASE, json={"company_name": "Crow Custom SRL"})
        assert r.status_code == 200
        data = r.json()
        assert data["company_name"] == "Crow Custom SRL"
        # Las demás claves no se pisan -- quedan en su default
        assert data["whatsapp_number"] == DEFAULT_SETTINGS["whatsapp_number"]
        assert data["email"] == DEFAULT_SETTINGS["email"]

    def test_partial_update_preserves_previous_changes(self, admin_client):
        admin_client.put(BASE, json={"company_name": "Crow Custom SRL"})
        r = admin_client.put(BASE, json={"phone_display": "+54 9 11 1111-1111"})
        data = r.json()
        # El segundo update (que no menciona company_name) no debe perder el primero
        assert data["company_name"] == "Crow Custom SRL"
        assert data["phone_display"] == "+54 9 11 1111-1111"

    def test_update_reflected_in_next_get(self, admin_client, client):
        admin_client.put(BASE, json={"instagram": "https://instagram.com/nuevo"})
        r = client.get(BASE)
        assert r.json()["instagram"] == "https://instagram.com/nuevo"

    def test_update_empty_payload_is_noop(self, admin_client):
        r = admin_client.put(BASE, json={})
        assert r.status_code == 200
        data = r.json()
        for key, value in DEFAULT_SETTINGS.items():
            assert data[key] == value
