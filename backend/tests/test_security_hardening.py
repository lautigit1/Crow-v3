"""
Tests del change `security-hardening`:
  - Rate limit por IP sola en endpoints públicos (quotes, register)
  - Logout revoca el refresh token
  - Cambio/reset de contraseña invalida las sesiones previas (token_version)
  - CSRF: validación de Origin en métodos mutantes
  - Sanitización del subject SMTP
  - Pedidos: stock (validación, descuento, devolución), topes, reactivación
"""
from fastapi.testclient import TestClient

from app.core.config import settings
from app.core.email import _sanitize_subject
from app.core.security import create_reset_token
from app.main import app as fastapi_app
from tests.conftest import login_as

ORDERS = "/api/orders"


def _register(client: TestClient, email: str):
    return client.post(
        "/api/auth/register",
        # El teléfono es obligatorio desde el change de notificaciones. Sin él
        # el registro devuelve 422 y el test del tope por IP nunca llegaría a
        # dispararlo: verificaría un límite que jamás se alcanza.
        json={
            "full_name": "New User",
            "email": email,
            "password": "Password1!",
            "phone": "261 660-0569",
        },
    )


def _quote(client: TestClient, email: str):
    return client.post(
        "/api/quotes",
        json={
            "customer_name": "Cliente",
            "customer_email": email,
            "vehicle": "Corsa 2008",
            "message": "Necesito un filtro",
        },
    )


# ---------------------------------------------------------------------------
# Fix 1 — rate limit por IP sola (bypass por rotación de email)
# ---------------------------------------------------------------------------

class TestIPRateLimits:
    def test_quote_ip_cap_blocks_email_rotation(self, client, db):
        cap = settings.QUOTE_RATE_LIMIT * 3
        for i in range(cap):
            r = _quote(client, f"spam{i}@test.com")
            assert r.status_code == 201, r.text
        r = _quote(client, "otro-mas@test.com")
        assert r.status_code == 429

    def test_register_ip_cap_blocks_email_rotation(self, client, db):
        for i in range(10):
            r = _register(client, f"nuevo{i}@test.com")
            assert r.status_code == 201, r.text
        r = _register(client, "nuevo-11@test.com")
        assert r.status_code == 429


# ---------------------------------------------------------------------------
# Fix 2 — logout revoca el refresh token
# ---------------------------------------------------------------------------

class TestLogoutRevokesRefresh:
    def test_refresh_replay_after_logout_rejected(self, user_client):
        old_refresh = user_client.cookies.get("refresh_token")
        assert old_refresh
        r = user_client.post("/api/auth/logout")
        assert r.status_code == 204
        # Reponer la cookie borrada simula a un atacante que la robó antes
        user_client.cookies.set("refresh_token", old_refresh)
        r = user_client.post("/api/auth/refresh")
        assert r.status_code == 401


# ---------------------------------------------------------------------------
# Fix 3 — token_version invalida sesiones previas
# ---------------------------------------------------------------------------

class TestSessionInvalidation:
    def test_password_change_kills_other_sessions_keeps_own(self, user_client, user):
        other = TestClient(fastapi_app, raise_server_exceptions=True)
        login_as(other, user.email)
        assert other.get("/api/auth/me").status_code == 200

        r = user_client.post(
            "/api/users/me/password",
            json={"current_password": "Password1!", "new_password": "NewPass1!0"},
        )
        assert r.status_code == 204
        # La sesión que cambió la contraseña sigue viva (cookies reemitidas)
        assert user_client.get("/api/auth/me").status_code == 200
        # La otra sesión quedó invalidada
        assert other.get("/api/auth/me").status_code == 401

    def test_password_reset_kills_existing_sessions(self, user_client, user):
        assert user_client.get("/api/auth/me").status_code == 200
        token, _ = create_reset_token(user.id)
        r = user_client.post(
            "/api/auth/reset-password",
            json={"token": token, "new_password": "NewPass1!0"},
        )
        assert r.status_code == 204
        assert user_client.get("/api/auth/me").status_code == 401


# ---------------------------------------------------------------------------
# Fix 4 — CSRF por validación de Origin
# ---------------------------------------------------------------------------

class TestCSRFOrigin:
    def test_cross_origin_post_rejected(self, client, user):
        r = client.post(
            "/api/auth/login",
            data={"username": user.email, "password": "Password1!"},
            headers={
                "Content-Type": "application/x-www-form-urlencoded",
                "Origin": "https://evil.example.com",
            },
        )
        assert r.status_code == 403

    def test_same_origin_post_allowed(self, client, user):
        r = client.post(
            "/api/auth/login",
            data={"username": user.email, "password": "Password1!"},
            headers={
                "Content-Type": "application/x-www-form-urlencoded",
                "Origin": "http://testserver",
            },
        )
        assert r.status_code == 200

    def test_configured_cors_origin_allowed(self, client, user):
        origin = settings.cors_origins[0]
        r = client.post(
            "/api/auth/login",
            data={"username": user.email, "password": "Password1!"},
            headers={
                "Content-Type": "application/x-www-form-urlencoded",
                "Origin": origin,
            },
        )
        assert r.status_code == 200

    def test_get_ignores_origin(self, client):
        r = client.get("/api/products", headers={"Origin": "https://evil.example.com"})
        assert r.status_code != 403

    def test_null_origin_rejected(self, client, user):
        r = client.post(
            "/api/auth/login",
            data={"username": user.email, "password": "Password1!"},
            headers={
                "Content-Type": "application/x-www-form-urlencoded",
                "Origin": "null",
            },
        )
        assert r.status_code == 403


# ---------------------------------------------------------------------------
# Fix 5 — sanitización del subject SMTP
# ---------------------------------------------------------------------------

class TestSMTPSubjectSanitization:
    def test_crlf_collapsed(self):
        evil = "Hola\r\nBcc: victima@example.com\r\n\r\ncuerpo"
        assert "\r" not in _sanitize_subject(evil)
        assert "\n" not in _sanitize_subject(evil)

    def test_normal_subject_untouched(self):
        assert _sanitize_subject("[Crow] Nueva cotización #1 — Juan") == "[Crow] Nueva cotización #1 — Juan"


# ---------------------------------------------------------------------------
# Fix 6 — pedidos: stock, topes, reactivación
# ---------------------------------------------------------------------------

def _order(client: TestClient, product_id: int, quantity: int = 2):
    return client.post(ORDERS, json={"items": [{"product_id": product_id, "quantity": quantity}]})


class TestOrderStock:
    def test_create_decrements_stock(self, user_client, product, db):
        r = _order(user_client, product.id, quantity=2)  # stock inicial: 10
        assert r.status_code == 201, r.text
        db.refresh(product)
        assert product.stock == 8

    def test_insufficient_stock_rejected(self, user_client, product):
        r = _order(user_client, product.id, quantity=11)
        assert r.status_code == 409

    def test_duplicate_items_consolidated_against_stock(self, user_client, product):
        r = user_client.post(ORDERS, json={"items": [
            {"product_id": product.id, "quantity": 6},
            {"product_id": product.id, "quantity": 6},
        ]})
        assert r.status_code == 409  # 12 > 10 aunque cada ítem pase solo

    def test_cancel_restores_stock(self, user_client, product, db):
        created = _order(user_client, product.id, quantity=3).json()
        db.refresh(product)
        assert product.stock == 7
        r = user_client.patch(f"{ORDERS}/me/{created['id']}/cancel")
        assert r.status_code == 200
        db.refresh(product)
        assert product.stock == 10

    def test_admin_cancel_restores_stock(self, user_client, admin_client, product, db):
        created = _order(user_client, product.id, quantity=4).json()
        r = admin_client.patch(f"{ORDERS}/{created['id']}", json={"status": "Cancelado"})
        assert r.status_code == 200
        db.refresh(product)
        assert product.stock == 10

    def test_reactivating_cancelled_order_rejected(self, user_client, admin_client, product):
        created = _order(user_client, product.id).json()
        user_client.patch(f"{ORDERS}/me/{created['id']}/cancel")
        r = admin_client.patch(f"{ORDERS}/{created['id']}", json={"status": "Confirmado"})
        assert r.status_code == 409


class TestOrderBounds:
    def test_quantity_above_max_rejected(self, user_client, product):
        r = _order(user_client, product.id, quantity=1000)
        assert r.status_code == 422

    def test_too_many_items_rejected(self, user_client, product):
        items = [{"product_id": product.id, "quantity": 1} for _ in range(51)]
        r = user_client.post(ORDERS, json={"items": items})
        assert r.status_code == 422


class TestRegisterRateLimitDefault:
    def test_el_default_de_registros_por_ip_sigue_siendo_10(self):
        """El tope por IP es lo que frena la creación masiva de cuentas.

        Se volvió configurable para poder subirlo en desarrollo y CI, donde
        todas las peticiones vienen de la misma IP y el tope separa corridas de
        tests en vez de personas. Este test fija el DEFAULT, que es el valor
        que corre en producción: subirlo ahí tiene que ser una decisión
        explícita y visible en el diff, no un efecto colateral de haber tocado
        el compose de desarrollo.

        El limitador por (ip, email) no sustituye a este: se esquiva
        trivialmente rotando el email, porque cada email nuevo crea una clave
        nueva.
        """
        from app.core.config import Settings

        assert Settings().REGISTER_RATE_LIMIT_PER_IP == 10
