"""
Tests for the Jinja2-based email templates (app/core/email.py).

Cubre:
  - Los builders devuelven el contenido esperado (asunto, cuerpo HTML/texto).
  - El template HTML escapa datos provistos por el cliente (mensaje de la
    cotización, nombre) -- regresión para el bug de inyección que tenía la
    versión anterior en f-strings, donde ese contenido se interpolaba crudo.
  - El template de texto plano NO escapa (no tiene sentido en texto plano).
"""
from app.core.email import build_quote_notification, build_reset_email

_XSS_PAYLOAD = "<script>alert(1)</script>"


class TestQuoteNotificationEmail:
    def test_builds_expected_fields(self):
        result = build_quote_notification(
            quote_id=42,
            customer_name="Juan Perez",
            customer_email="juan@test.com",
            customer_phone="2610000000",
            vehicle="Fiat Cronos",
            message="Necesito un filtro de aceite",
        )
        assert result["subject"] == "[Crow] Nueva cotización #42 — Juan Perez"
        assert "Juan Perez" in result["html"]
        assert "Necesito un filtro de aceite" in result["html"]
        assert "Fiat Cronos" in result["text"]
        assert "42" in result["text"]

    def test_missing_optional_fields_render_dash(self):
        result = build_quote_notification(
            quote_id=1,
            customer_name="Ana",
            customer_email=None,
            customer_phone=None,
            vehicle=None,
            message="Hola",
        )
        assert "—" in result["html"]
        assert "—" in result["text"]

    def test_html_escapes_customer_supplied_content(self):
        """Regression: the old f-string template interpolated `message` and
        `customer_name` directly into HTML with no escaping. A quote message
        containing markup would have executed in the admin's mail client."""
        result = build_quote_notification(
            quote_id=1,
            customer_name=_XSS_PAYLOAD,
            customer_email=None,
            customer_phone=None,
            vehicle=None,
            message=_XSS_PAYLOAD,
        )
        assert "<script>" not in result["html"]
        assert "&lt;script&gt;" in result["html"]

    def test_text_body_is_not_html_escaped(self):
        """Plain text has no markup to protect; escaping it would corrupt output."""
        result = build_quote_notification(
            quote_id=1,
            customer_name="Ana",
            customer_email=None,
            customer_phone=None,
            vehicle=None,
            message=_XSS_PAYLOAD,
        )
        assert _XSS_PAYLOAD in result["text"]


class TestResetPasswordEmail:
    def test_builds_expected_fields(self):
        result = build_reset_email(to="ana@test.com", reset_url="https://x.com/reset?token=abc", name="Ana")
        assert result["to"] == "ana@test.com"
        assert "https://x.com/reset?token=abc" in result["html"]
        assert "https://x.com/reset?token=abc" in result["text"]
        assert "Ana" in result["html"]

    def test_html_escapes_name(self):
        result = build_reset_email(to="x@test.com", reset_url="https://x.com", name=_XSS_PAYLOAD)
        assert "<script>" not in result["html"]
        assert "&lt;script&gt;" in result["html"]
