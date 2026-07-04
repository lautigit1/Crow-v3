"""
Tests for the Cloudinary signed-upload endpoint:
  - Requires admin (401 sin sesion, 403 usuario normal)
  - 503 si CLOUDINARY_* no esta configurado
  - Firma correcta cuando si esta configurado (sin llamar a Cloudinary real)
"""
from app.core.cloudinary_sign import build_signature
from app.core.config import settings

BASE = "/api/uploads/cloudinary-signature"


class TestRequiresAuth:
    def test_requires_auth(self, client):
        r = client.get(BASE)
        assert r.status_code == 401

    def test_requires_admin(self, user_client):
        r = user_client.get(BASE)
        assert r.status_code == 403


class TestNotConfigured:
    def test_returns_503_when_not_configured(self, admin_client, monkeypatch):
        monkeypatch.setattr(settings, "CLOUDINARY_CLOUD_NAME", "")
        monkeypatch.setattr(settings, "CLOUDINARY_API_KEY", "")
        monkeypatch.setattr(settings, "CLOUDINARY_API_SECRET", "")
        r = admin_client.get(BASE)
        assert r.status_code == 503


class TestConfigured:
    def test_returns_signed_params(self, admin_client, monkeypatch):
        monkeypatch.setattr(settings, "CLOUDINARY_CLOUD_NAME", "demo-cloud")
        monkeypatch.setattr(settings, "CLOUDINARY_API_KEY", "demo-key")
        monkeypatch.setattr(settings, "CLOUDINARY_API_SECRET", "demo-secret")

        r = admin_client.get(BASE)
        assert r.status_code == 200
        body = r.json()

        assert body["cloud_name"] == "demo-cloud"
        assert body["api_key"] == "demo-key"
        assert body["folder"] == "crow-repuestos/products"
        assert body["timestamp"].isdigit()

        # La firma debe coincidir con el mismo algoritmo firmado a mano.
        expected = build_signature(
            {"timestamp": body["timestamp"], "folder": body["folder"]},
            "demo-secret",
        )
        assert body["signature"] == expected

        # El secreto nunca debe filtrarse en la respuesta.
        assert "demo-secret" not in r.text
