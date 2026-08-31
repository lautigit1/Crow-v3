"""
Tests del change `security-hardening`:
  - Rate limit por IP sola en endpoints públicos (quotes, register, login)
  - Tope general por IP sobre /api (middleware)
  - Fail-closed cuando Redis es obligatorio y no responde
  - Logout revoca el refresh token
  - Cambio/reset de contraseña invalida las sesiones previas (token_version)
  - CSRF: validación de Origin en métodos mutantes
  - Login: sin enumeración de usuarios por tiempo de respuesta
  - Subida de archivos: el tope se aplica antes de leer el archivo entero
  - SSE: la sesión se revalida mientras el stream está abierto
  - Sanitización del subject SMTP
  - Pedidos: stock (validación, descuento, devolución), topes, reactivación
  - Resolución de la IP del cliente detrás de proxies (X-Forwarded-For)
"""
import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from starlette.requests import Request

from app.core.audit import client_ip
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


# ---------------------------------------------------------------------------
# CSP en /docs -- Swagger carga sus assets desde un CDN
# ---------------------------------------------------------------------------

class TestCSPDeDocs:
    def test_docs_permite_el_cdn_de_swagger(self, client):
        """Con la CSP estricta de la API (`default-src 'none'`), /docs responde
        200 pero se ve en blanco: el navegador bloquea el JS de jsdelivr."""
        r = client.get("/docs")

        assert r.status_code == 200
        csp = r.headers["content-security-policy"]
        assert "cdn.jsdelivr.net" in csp

    def test_los_endpoints_de_la_api_conservan_la_csp_estricta(self, client):
        """La excepción es solo para las rutas de documentación. Una API JSON
        no tiene por qué permitir scripts de ningún lado."""
        r = client.get("/api/health")

        assert r.headers["content-security-policy"] == "default-src 'none'; frame-ancestors 'none'"


# ---------------------------------------------------------------------------
# IP real del cliente detrás de proxies
# ---------------------------------------------------------------------------

def _peticion(peer: str, xff: str | None = None) -> Request:
    """Request mínima con un peer y un X-Forwarded-For dados."""
    headers = [(b"x-forwarded-for", xff.encode())] if xff is not None else []
    return Request(
        {
            "type": "http",
            "http_version": "1.1",
            "method": "GET",
            "scheme": "http",
            "path": "/",
            "query_string": b"",
            "headers": headers,
            "client": (peer, 51234),
            "server": ("api", 8000),
        }
    )


class TestIPRealDelCliente:
    """`client_ip()` alimenta dos cosas que dependen de que sea confiable: la
    clave de los limitadores por IP y la columna `ip` del log de auditoría.

    Nada de esto tenía tests, que es exactamente por qué el bug de abajo entró
    sin que nadie lo notara.
    """

    PROXY = "172.28.0.5"          # nginx, dentro de TRUSTED_PROXIES
    CLIENTE = "203.0.113.7"       # el visitante real
    FALSA = "9.9.9.9"             # la que inventa el atacante

    def setup_method(self):
        self._original = settings.TRUSTED_PROXIES
        settings.TRUSTED_PROXIES = "172.28.0.0/16"

    def teardown_method(self):
        settings.TRUSTED_PROXIES = self._original

    def test_ignora_la_entrada_que_antepuso_el_cliente(self):
        """LA REGRESIÓN.

        nginx reenvía con `$proxy_add_x_forwarded_for`, que AGREGA al final lo
        que ya venía. Si el cliente manda su propio `X-Forwarded-For`, la
        cadena que llega a la API arranca con un valor que eligió él:

            X-Forwarded-For: 9.9.9.9, 203.0.113.7

        Tomando la primera entrada, la IP quedaba a elección del atacante:
        rotándola se esquivaban los limitadores por IP (registro, reset de
        contraseña y cotizaciones se llavean SOLO por IP) y se podía firmar
        cualquier acción del log de auditoría con la IP de otra persona.
        """
        req = _peticion(self.PROXY, f"{self.FALSA}, {self.CLIENTE}")

        assert client_ip(req) == self.CLIENTE

    def test_cadena_normal_de_un_solo_proxy(self):
        """El caso de todos los días: Caddy pone la IP del visitante y nadie
        mintió. Se devuelve esa."""
        req = _peticion(self.PROXY, self.CLIENTE)

        assert client_ip(req) == self.CLIENTE

    def test_descarta_los_proxies_del_final_de_la_cadena(self):
        """Con Caddy y nginx encadenados la IP real queda en el medio, con
        saltos internos a la derecha. Se recorre hasta la última que no sea
        nuestra."""
        req = _peticion(self.PROXY, f"{self.CLIENTE}, 172.28.0.9, 172.28.0.5")

        assert client_ip(req) == self.CLIENTE

    def test_un_peer_que_no_es_proxy_de_confianza_no_puede_dictar_su_ip(self):
        """Si alguien llega directo a la API sin pasar por el borde, su
        `X-Forwarded-For` no vale nada: manda la conexión real."""
        directo = "198.51.100.4"
        req = _peticion(directo, self.FALSA)

        assert client_ip(req) == directo

    def test_sin_header_devuelve_el_peer(self):
        req = _peticion(self.PROXY)

        assert client_ip(req) == self.PROXY

    def test_cadena_entera_de_proxies_cae_al_peer(self):
        """Tráfico interno: no hay ninguna IP de cliente que reportar. Se
        devuelve el peer en vez de `None` para no perder el rate limiting."""
        req = _peticion(self.PROXY, "172.28.0.9, 172.28.0.5")

        assert client_ip(req) == self.PROXY


# ---------------------------------------------------------------------------
# Rate limit por IP en el LOGIN (password spraying)
# ---------------------------------------------------------------------------

def _login_fallido(client: TestClient, email: str):
    return client.post(
        "/api/auth/login",
        data={"username": email, "password": "NoEsLaContrasena1!"},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )


class TestLoginIPRateLimit:
    """El agujero que cierra `_login_ip_limiter`.

    `login_limiter` se llavea por (ip, email): frena que le prueben muchas
    contrasenas a UNA cuenta. El ataque que se usa de verdad es el inverso --
    una contrasena comun contra miles de emails -- y ahi cada intento estrena
    una clave nueva, asi que ningun contador llegaba jamas a cinco.
    """

    def test_el_tope_por_ip_frena_la_rotacion_de_emails(self, client, user):
        cap = settings.LOGIN_RATE_LIMIT_PER_IP

        # Cada intento con un email distinto: el limitador por cuenta no se
        # entera de ninguno de estos.
        for i in range(cap):
            r = _login_fallido(client, f"victima{i}@test.com")
            assert r.status_code == 401, f"intento {i}: {r.text}"

        # El siguiente ya no llega a comparar nada.
        assert _login_fallido(client, "victima-final@test.com").status_code == 429

        # Y arrastra tambien a las credenciales buenas: mientras dure el
        # bloqueo, esa IP no entra. Es el precio conocido de un tope por IP, y
        # es el correcto -- quien este detras vuelve en quince minutos, el que
        # barre una lista de correos filtrada no.
        r = client.post(
            "/api/auth/login",
            data={"username": user.email, "password": "Password1!"},
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        assert r.status_code == 429

    def test_un_login_exitoso_no_limpia_el_contador_por_ip(self, client, user):
        """A diferencia del limitador por cuenta, este NO se resetea al entrar
        bien. Si lo hiciera, alcanzaria con tener una cuenta propia e
        intercalar un login valido cada tantos intentos para no gastar nunca
        el tope."""
        cap = settings.LOGIN_RATE_LIMIT_PER_IP

        for i in range(cap - 1):
            assert _login_fallido(client, f"otra{i}@test.com").status_code == 401

        login_as(client, user.email)  # entra bien, y no perdona nada

        # El intento numero `cap` llega al tope; el siguiente ya rebota.
        assert _login_fallido(client, "ultima@test.com").status_code == 401
        assert _login_fallido(client, "otra-mas@test.com").status_code == 429

    def test_los_defaults_de_produccion(self):
        """Igual que con el tope de registros: el default es el valor que
        corre en produccion, y subirlo tiene que verse en el diff."""
        from app.core.config import Settings

        assert Settings().LOGIN_RATE_LIMIT_PER_IP == 30
        assert Settings().LOGIN_RATE_LOCKOUT_SECONDS == 900


# ---------------------------------------------------------------------------
# Tope general por IP (middleware)
# ---------------------------------------------------------------------------

class TestRateLimitGeneral:
    """El backstop de aplicacion sobre todo `/api`.

    Los topes reales (300 y 60 por minuto) no se prueban tal cual: mandar 300
    requests para ver una serian minutos de suite por un numero que ya esta
    fijado en `config.py`. Se baja el tope de la instancia y se verifica el
    comportamiento, que es lo que puede romperse.
    """

    def test_devuelve_429_con_retry_after_al_pasarse(self, client, monkeypatch):
        from app.core import middleware

        monkeypatch.setattr(middleware._api_limiter, "max_requests", 3)

        for _ in range(3):
            assert client.get("/api/products").status_code == 200

        r = client.get("/api/products")
        assert r.status_code == 429
        assert int(r.headers["Retry-After"]) > 0

    def test_las_escrituras_tienen_su_propio_tope(self, admin_client, monkeypatch):
        """Cubeta aparte y mas chica: navegar el catalogo son decenas de GET
        legitimos por minuto, la misma cantidad de escrituras no lo es."""
        from app.core import middleware
        from app.core.ratelimit import IPRateLimiter

        # El fixture `admin_client` ya gasto una escritura logueandose antes de
        # que corriera este cuerpo. Se limpia el contador para que el tope
        # empiece a contar desde acá y el test diga lo que dice que dice.
        IPRateLimiter.reset_all_memory_state()
        monkeypatch.setattr(middleware._api_write_limiter, "max_requests", 2)

        for i in range(2):
            r = admin_client.post("/api/brands", json={"name": f"Marca {i}", "slug": f"marca-{i}"})
            assert r.status_code == 201, r.text

        r = admin_client.post("/api/brands", json={"name": "Una mas", "slug": "una-mas"})
        assert r.status_code == 429
        # Las lecturas siguen pasando: la cubeta general no se toco.
        assert admin_client.get("/api/brands").status_code == 200

    def test_health_queda_exento(self, client, monkeypatch):
        """Health lo consulta el balanceador cada pocos segundos y no puede
        empezar a fallar por un vecino ruidoso. `/api/events` esta exento por
        el motivo inverso: es UNA request que queda abierta horas, contarla no
        significa nada."""
        from app.core import middleware

        monkeypatch.setattr(middleware._api_limiter, "max_requests", 1)

        # Se mira que NO sea 429, no que sea 200: en la suite `/api/health`
        # responde 503 porque la sonda de base apunta al Postgres real y acá
        # los tests corren sobre SQLite. Lo que este test verifica es que el
        # rate limit no lo toca.
        for _ in range(5):
            assert client.get("/api/health").status_code != 429


# ---------------------------------------------------------------------------
# Fail-closed: Redis obligatorio y caido
# ---------------------------------------------------------------------------

class TestFailClosedSinRedis:
    """Con Redis configurado y caido, los stores de seguridad NO caen al
    fallback en memoria.

    El store en memoria arranca vacio: caer ahi resucita cada token revocado
    en un logout y cada refresh ya rotado, y pone todos los contadores de rate
    limit en cero. Un 503 mientras Redis esta caido se ve y se arregla; lo
    otro es una ventana de autenticacion abierta que no deja ningun rastro.
    """

    def _modo_produccion(self, monkeypatch):
        monkeypatch.setattr(settings, "ENVIRONMENT", "production")
        monkeypatch.setattr(settings, "REDIS_URL", "redis://redis:6379/0")

    def test_la_blocklist_levanta_en_vez_de_dejar_pasar(self, monkeypatch):
        from app.core.redis_client import RedisCaido
        from app.core.token_blocklist import token_blocklist

        self._modo_produccion(monkeypatch)

        # get_redis() devuelve None: no hay cliente conectado.
        with pytest.raises(RedisCaido):
            token_blocklist.is_blocked("cualquier-jti")
        with pytest.raises(RedisCaido):
            token_blocklist.block("cualquier-jti", expires_at=9e9)

    def test_el_rate_limiter_levanta_en_vez_de_arrancar_de_cero(self, monkeypatch):
        from app.core.ratelimit import IPRateLimiter, LoginRateLimiter
        from app.core.redis_client import RedisCaido

        self._modo_produccion(monkeypatch)

        with pytest.raises(RedisCaido):
            LoginRateLimiter().check("1.2.3.4", "alguien@test.com")
        with pytest.raises(RedisCaido):
            IPRateLimiter("test", 10, 60).retry_after("1.2.3.4")

    def test_fuera_de_produccion_el_fallback_sigue_siendo_valido(self, monkeypatch):
        """Dev, tests y un deploy de un solo proceso sin Redis son modos
        legitimos: ahi el store en memoria es la implementacion, no una
        degradacion silenciosa."""
        from app.core.token_blocklist import token_blocklist

        monkeypatch.setattr(settings, "ENVIRONMENT", "development")
        monkeypatch.setattr(settings, "REDIS_URL", "")

        assert token_blocklist.is_blocked("jti-que-no-existe") is False

    def test_produccion_sin_redis_url_no_pasa_por_el_fail_closed(self, monkeypatch):
        """`REDIS_URL` vacia en produccion ya lo ataja el arranque (main.py se
        niega a levantar). Si igual se llega hasta aca, no tiene sentido
        devolver 503 por un Redis que nadie configuro."""
        from app.core.token_blocklist import token_blocklist

        monkeypatch.setattr(settings, "ENVIRONMENT", "production")
        monkeypatch.setattr(settings, "REDIS_URL", "")

        assert token_blocklist.is_blocked("jti-que-no-existe") is False

    def test_la_api_responde_503_y_no_500(self, user_client, monkeypatch):
        """El 503 tiene que salir como tal. `RedisCaido` es un RuntimeError:
        sin el handler dedicado se lo come el 500 generico, que dice 'error
        interno del servidor' cuando lo que pasa es que Redis esta caido."""
        from app.core.redis_client import RedisCaido

        def _explota(*_args, **_kwargs):
            raise RedisCaido("token_blocklist.is_blocked")

        monkeypatch.setattr("app.core.deps.token_blocklist.is_blocked", _explota)

        r = user_client.get("/api/auth/me")
        assert r.status_code == 503
        assert "no disponible" in r.json()["detail"].lower()


# ---------------------------------------------------------------------------
# Enumeracion de usuarios por tiempo de respuesta en el login
# ---------------------------------------------------------------------------

class TestTimingDelLogin:
    """El login tiene que costar lo mismo exista o no la cuenta.

    Sin `dummy_verify`, un email que no esta en la base se responde sin correr
    bcrypt: menos de un milisegundo, contra los ~250 ms de uno que si existe.
    Esa diferencia se mide con una sola peticion y convierte al endpoint en un
    oraculo de quien es cliente -- que es el dato con el que se arma la lista
    para el barrido de contrasenas.
    """

    def test_gasta_una_verificacion_aunque_la_cuenta_no_exista(self, client, monkeypatch):
        """Se cuentan las verificaciones, no los milisegundos: medir tiempos en
        una suite es la receta para un test que falla una vez cada veinte
        corridas segun como venga la maquina. Lo que se prueba es que el
        trabajo caro se hace igual, que es de donde sale el tiempo."""
        from app.core.security import _DUMMY_HASH

        hashes_comparados = []
        monkeypatch.setattr(
            "app.api.routes.auth.dummy_verify",
            lambda _plain: hashes_comparados.append(_DUMMY_HASH),
        )

        r = client.post(
            "/api/auth/login",
            data={"username": "no-existe@test.com", "password": "Password1!"},
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )

        assert r.status_code == 401
        assert hashes_comparados == [_DUMMY_HASH]

    def test_una_cuenta_que_existe_compara_contra_su_propio_hash(self, client, user, monkeypatch):
        """El contrapunto del anterior: cuando la cuenta existe, el hash dummy
        no se toca. Sin este test, `dummy_verify` podria estar corriendo
        siempre (o nunca) y el primero pasaria igual."""
        llamadas = []
        monkeypatch.setattr("app.api.routes.auth.dummy_verify", lambda _p: llamadas.append(1))

        r = client.post(
            "/api/auth/login",
            data={"username": user.email, "password": "ContrasenaEquivocada1!"},
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )

        assert r.status_code == 401
        assert llamadas == []

    def test_el_hash_dummy_no_valida_ninguna_contrasena(self):
        """Es el hash de un secreto aleatorio que no existe en ningun lado, asi
        que la comparacion siempre da False: no puede dejar entrar a nadie."""
        from app.core.security import _DUMMY_HASH, verify_password

        for intento in ("", "Password1!", "admin1234", _DUMMY_HASH):
            assert verify_password(intento, _DUMMY_HASH) is False

    def test_la_respuesta_es_identica_exista_o_no_la_cuenta(self, client, user):
        """El cuerpo tampoco puede delatar: mismo status y mismo mensaje."""
        inexistente = client.post(
            "/api/auth/login",
            data={"username": "no-existe@test.com", "password": "Password1!"},
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        existente = client.post(
            "/api/auth/login",
            data={"username": user.email, "password": "OtraCosa1!"},
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )

        assert inexistente.status_code == existente.status_code == 401
        assert inexistente.json() == existente.json()


# ---------------------------------------------------------------------------
# Subida de archivos: el tope se aplica ANTES de traer el archivo entero
# ---------------------------------------------------------------------------

class TestLecturaAcotadaDeArchivos:
    """`_leer_acotado` pide un byte mas que el tope y corta ahi.

    Antes era `await file.read()` y recien despues se comparaba el largo: para
    rechazar un archivo de 2 GB por pasarse de 5 MB, primero se lo cargaba
    entero. El tope estaba escrito pero se aplicaba demasiado tarde para
    servir de algo.
    """

    def test_no_lee_mas_que_el_tope(self):
        import asyncio

        from app.api.routes import imports as rutas

        pedidos = []

        class _ArchivoFalso:
            async def read(self, n=-1):
                pedidos.append(n)
                # Devuelve exactamente lo que se le pidio: si alguien vuelve al
                # `read()` sin argumento, esto simula el archivo gigante.
                return b"x" * (n if n and n > 0 else 2 * rutas._MAX_BYTES)

        with pytest.raises(HTTPException) as exc:
            asyncio.run(rutas._leer_acotado(_ArchivoFalso()))

        assert exc.value.status_code == 413
        # UN byte de mas, no el archivo completo: alcanza para saber que se
        # paso sin traer el resto.
        assert pedidos == [rutas._MAX_BYTES + 1]

    def test_un_archivo_dentro_del_tope_pasa_entero(self):
        import asyncio

        from app.api.routes import imports as rutas

        class _ArchivoChico:
            async def read(self, n=-1):
                return b"contenido corto"

        assert asyncio.run(rutas._leer_acotado(_ArchivoChico())) == b"contenido corto"


# ---------------------------------------------------------------------------
# SSE: la sesion se revalida mientras el stream esta abierto
# ---------------------------------------------------------------------------

class TestRevalidacionDelStream:
    """Un stream SSE se autentica UNA vez, al abrirlo, y despues puede quedar
    abierto horas.

    Sin revalidar, cerrar sesion no cortaba el canal: la pestana seguia
    recibiendo eventos de los pedidos con una sesion ya revocada, y el
    vencimiento del access token tampoco lo interrumpia. Era la unica parte
    del sistema donde la blocklist no llegaba.
    """

    def test_sigue_viva_con_un_token_vigente(self):
        import time

        from app.api.routes.events import _sesion_sigue_viva

        assert _sesion_sigue_viva("jti-vivo", time.time() + 300) is True

    def test_se_corta_cuando_el_token_vence(self):
        import time

        from app.api.routes.events import _sesion_sigue_viva

        assert _sesion_sigue_viva("jti-vivo", time.time() - 1) is False

    def test_se_corta_cuando_la_sesion_fue_revocada(self):
        import time

        from app.api.routes.events import _sesion_sigue_viva
        from app.core.token_blocklist import token_blocklist

        token_blocklist.block("jti-revocado", expires_at=time.time() + 300)

        assert _sesion_sigue_viva("jti-revocado", time.time() + 300) is False

    def test_se_corta_si_redis_esta_caido(self, monkeypatch):
        """Mismo criterio que en el resto: sin el store que dice que se
        revoco, no se sostiene una sesion abierta."""
        import time

        from app.api.routes.events import _sesion_sigue_viva
        from app.core.redis_client import RedisCaido

        def _explota(_jti):
            raise RedisCaido("token_blocklist.is_blocked")

        monkeypatch.setattr("app.api.routes.events.token_blocklist.is_blocked", _explota)

        assert _sesion_sigue_viva("cualquiera", time.time() + 300) is False
