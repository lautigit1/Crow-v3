"""
Convertir una cotización en pedido.

El punto difícil es **a nombre de quién queda el pedido**: `Order.user_id` es no
nullable y una cotización puede venir del formulario público sin ninguna cuenta
detrás. Los tres casos de design §3 son la mitad de este archivo.

La otra mitad son las dos cosas que no tienen que pasar: que se convierta dos
veces, y que se mueva stock.
"""

import pytest
from sqlalchemy import func, select

from app.core.security import verify_password
from app.models.order import Order, OrderStatus
from app.models.product import Product
from app.models.quote import Quote, QuoteOption, QuoteStatus
from app.models.user import User

BASE = "/api/quotes"


@pytest.fixture(autouse=True)
def _sin_correo(monkeypatch):
    monkeypatch.setattr("app.core.email.send_email", lambda **kw: None)


def _cotizacion(db, **over):
    campos = {
        "customer_name": "Juan Pérez",
        "customer_email": "juan.anonimo@test.com",
        "customer_phone": "2616600569",
        "vehicle": "Gol G5 2012",
        "message": "Pastillas de freno delanteras",
        **over,
    }
    q = Quote(**campos)
    db.add(q)
    db.flush()
    return q


def _con_opcion(db, quote, **over):
    """Carga una opción por la base y no por la API: acá no se prueba el alta."""
    opcion = QuoteOption(
        quote_id=quote.id,
        title="Original Bosch",
        detail="Juego completo",
        unit_price=45000,
        quantity=2,
        lead_time="3 a 5 días hábiles",
        **over,
    )
    db.add(opcion)
    db.flush()
    return opcion


# ---------------------------------------------------------------------------
# §3 — A nombre de quién queda
# ---------------------------------------------------------------------------

class TestResolucionDelCliente:
    def test_cotizacion_de_un_cliente_con_cuenta(self, admin_client, db, user):
        quote = _cotizacion(db, user_id=user.id)
        opcion = _con_opcion(db, quote)

        r = admin_client.post(f"{BASE}/{quote.id}/convert", json={"option_id": opcion.id})

        assert r.status_code == 201
        assert r.json()["user_id"] == user.id

    def test_anonima_con_mail_crea_la_cuenta(self, admin_client, db):
        quote = _cotizacion(db, customer_email="nuevo@test.com")
        opcion = _con_opcion(db, quote)

        r = admin_client.post(f"{BASE}/{quote.id}/convert", json={"option_id": opcion.id})

        assert r.status_code == 201
        creado = db.scalar(select(User).where(User.email == "nuevo@test.com"))
        assert creado is not None
        assert creado.full_name == "Juan Pérez"
        assert creado.phone == "2616600569"  # se arrastra el teléfono de la consulta
        assert r.json()["user_id"] == creado.id

    def test_la_cuenta_nueva_nace_sin_contrasena_utilizable(self, admin_client, db):
        """Le creamos una cuenta a alguien que no la pidió: no puede quedar
        abierta hasta que la persona defina su contraseña."""
        quote = _cotizacion(db, customer_email="nuevo2@test.com")
        opcion = _con_opcion(db, quote)

        admin_client.post(f"{BASE}/{quote.id}/convert", json={"option_id": opcion.id})

        creado = db.scalar(select(User).where(User.email == "nuevo2@test.com"))
        for intento in ("", "nuevo2@test.com", "Password1!", "123456"):
            assert not verify_password(intento, creado.hashed_password)

    def test_no_duplica_la_cuenta_si_el_mail_ya_existe(self, admin_client, db, user):
        """Cotizó anónimo con el mail con el que ya estaba registrado."""
        quote = _cotizacion(db, customer_email=user.email)
        opcion = _con_opcion(db, quote)
        antes = db.scalar(select(func.count()).select_from(User))

        r = admin_client.post(f"{BASE}/{quote.id}/convert", json={"option_id": opcion.id})

        assert r.json()["user_id"] == user.id
        assert db.scalar(select(func.count()).select_from(User)) == antes

    def test_encuentra_la_cuenta_aunque_cambie_la_capitalizacion(self, admin_client, db, user):
        """Cotizó como "Juan@..." y se había registrado como "juan@...".

        Sin la comparación en minúsculas no lo encuentra y el INSERT explota
        contra el índice único del email.
        """
        quote = _cotizacion(db, customer_email=user.email.upper())
        opcion = _con_opcion(db, quote)

        r = admin_client.post(f"{BASE}/{quote.id}/convert", json={"option_id": opcion.id})

        assert r.status_code == 201
        assert r.json()["user_id"] == user.id

    def test_anonima_sin_mail_no_se_puede_convertir(self, admin_client, db):
        """No es un error del sistema: alguien dejó su consulta con un teléfono
        nada más. Tiene que decirlo con esas palabras y no tirar un 500."""
        quote = _cotizacion(db, customer_email=None)
        opcion = _con_opcion(db, quote)

        r = admin_client.post(f"{BASE}/{quote.id}/convert", json={"option_id": opcion.id})

        assert r.status_code == 409
        assert "email" in r.json()["detail"].lower()
        assert db.get(Quote, quote.id).order_id is None

    def test_cuenta_desactivada_no_recibe_el_pedido(self, admin_client, db, user):
        user.is_active = False
        db.flush()
        quote = _cotizacion(db, customer_email=user.email)
        opcion = _con_opcion(db, quote)

        r = admin_client.post(f"{BASE}/{quote.id}/convert", json={"option_id": opcion.id})

        assert r.status_code == 409
        assert "desactivada" in r.json()["detail"]


# ---------------------------------------------------------------------------
# §4 — El pedido que sale
# ---------------------------------------------------------------------------

class TestElPedidoResultante:
    def test_la_linea_va_sin_producto_y_con_los_snapshots(self, admin_client, db, user):
        quote = _cotizacion(db, user_id=user.id)
        opcion = _con_opcion(db, quote)

        item = admin_client.post(
            f"{BASE}/{quote.id}/convert", json={"option_id": opcion.id}
        ).json()["items"][0]

        assert item["product_id"] is None
        assert item["name_snapshot"] == "Original Bosch"
        assert item["unit_price_snapshot"] == 45000
        assert item["quantity"] == 2
        # El SKU obligatorio se usa para volver del pedido a la consulta.
        assert item["sku_snapshot"] == f"COT-{quote.id:05d}"

    def test_el_plazo_prometido_sobrevive_en_las_notas(self, admin_client, db, user):
        """`OrderItem` no tiene dónde guardarlo. Sin esto, lo único que
        sobreviviría de la cotización sería el precio."""
        quote = _cotizacion(db, user_id=user.id)
        opcion = _con_opcion(db, quote)

        notas = admin_client.post(
            f"{BASE}/{quote.id}/convert", json={"option_id": opcion.id}
        ).json()["notes"]

        assert "3 a 5 días hábiles" in notas
        assert "Gol G5 2012" in notas
        assert f"{quote.id:05d}" in notas

    def test_nace_pendiente(self, admin_client, db, user):
        """"Confirmado" significa que verificaste stock y precio con el
        proveedor. Convertir no es eso."""
        quote = _cotizacion(db, user_id=user.id)
        opcion = _con_opcion(db, quote)

        r = admin_client.post(f"{BASE}/{quote.id}/convert", json={"option_id": opcion.id})

        assert r.json()["status"] == OrderStatus.PENDIENTE.value

    def test_no_mueve_stock(self, admin_client, db, user, product):
        """No hay producto que descontar: se está trayendo a pedido."""
        stock_antes = product.stock
        quote = _cotizacion(db, user_id=user.id, product_id=product.id)
        opcion = _con_opcion(db, quote)

        admin_client.post(f"{BASE}/{quote.id}/convert", json={"option_id": opcion.id})

        assert db.get(Product, product.id).stock == stock_antes

    def test_cancelar_el_pedido_convertido_no_rompe(self, admin_client, db, user):
        """`_restore_stock` recorre los ítems buscando productos que devolver, y
        acá no hay ninguno."""
        quote = _cotizacion(db, user_id=user.id)
        opcion = _con_opcion(db, quote)
        order_id = admin_client.post(
            f"{BASE}/{quote.id}/convert", json={"option_id": opcion.id}
        ).json()["id"]

        r = admin_client.patch(f"/api/orders/{order_id}", json={"status": "Cancelado"})

        assert r.status_code == 200
        assert r.json()["status"] == "Cancelado"

    def test_el_cliente_ve_el_pedido_en_los_suyos(self, admin_client, user_client, db, user):
        quote = _cotizacion(db, user_id=user.id)
        opcion = _con_opcion(db, quote)
        admin_client.post(f"{BASE}/{quote.id}/convert", json={"option_id": opcion.id})

        mios = user_client.get("/api/orders/me").json()

        assert any(o["items"][0]["name_snapshot"] == "Original Bosch" for o in mios["items"])


# ---------------------------------------------------------------------------
# El enlace entre las dos puntas
# ---------------------------------------------------------------------------

class TestEnlaceYEstado:
    def test_la_cotizacion_queda_enlazada_y_finalizada(self, admin_client, db, user):
        quote = _cotizacion(db, user_id=user.id)
        opcion = _con_opcion(db, quote)

        order_id = admin_client.post(
            f"{BASE}/{quote.id}/convert", json={"option_id": opcion.id}
        ).json()["id"]

        db.refresh(quote)
        assert quote.order_id == order_id
        assert quote.status == QuoteStatus.FINALIZADA

    def test_la_consulta_anonima_queda_bajo_la_cuenta_nueva(self, admin_client, db):
        """Si no, el cliente entra a "Mis cotizaciones" y no ve la consulta que
        originó su propio pedido."""
        quote = _cotizacion(db, customer_email="nuevo3@test.com")
        opcion = _con_opcion(db, quote)

        admin_client.post(f"{BASE}/{quote.id}/convert", json={"option_id": opcion.id})

        db.refresh(quote)
        creado = db.scalar(select(User).where(User.email == "nuevo3@test.com"))
        assert quote.user_id == creado.id

    def test_no_se_convierte_dos_veces(self, admin_client, db, user):
        quote = _cotizacion(db, user_id=user.id)
        opcion = _con_opcion(db, quote)
        primero = admin_client.post(f"{BASE}/{quote.id}/convert", json={"option_id": opcion.id})

        segundo = admin_client.post(f"{BASE}/{quote.id}/convert", json={"option_id": opcion.id})

        assert segundo.status_code == 409
        assert f"{primero.json()['id']:05d}" in segundo.json()["detail"]
        assert db.scalar(select(func.count()).select_from(Order)) == 1

    def test_opcion_de_otra_cotizacion_da_404(self, admin_client, db, user):
        quote = _cotizacion(db, user_id=user.id)
        _con_opcion(db, quote)
        otra = _cotizacion(db, user_id=user.id)
        ajena = _con_opcion(db, otra)

        r = admin_client.post(f"{BASE}/{quote.id}/convert", json={"option_id": ajena.id})

        assert r.status_code == 404

    def test_cotizacion_inexistente(self, admin_client):
        assert admin_client.post(f"{BASE}/999999/convert", json={"option_id": 1}).status_code == 404

    def test_requiere_admin(self, user_client, db, user):
        quote = _cotizacion(db, user_id=user.id)
        opcion = _con_opcion(db, quote)

        r = user_client.post(f"{BASE}/{quote.id}/convert", json={"option_id": opcion.id})

        assert r.status_code == 403


# ---------------------------------------------------------------------------
# Avisos
# ---------------------------------------------------------------------------

class TestAvisos:
    def test_al_cliente_con_cuenta_le_llega_el_aviso_de_pedido(self, admin_client, db, user):
        quote = _cotizacion(db, user_id=user.id)
        opcion = _con_opcion(db, quote)

        admin_client.post(f"{BASE}/{quote.id}/convert", json={"option_id": opcion.id})

        from app.models.notification import Notification

        avisos = db.scalars(select(Notification).where(Notification.user_id == user.id)).all()
        assert any("Tomamos tu pedido" in n.title for n in avisos)

    def test_a_la_cuenta_nueva_le_llega_UN_solo_correo(self, admin_client, db, monkeypatch):
        """El aviso normal de pedido lo manda a "ver tus pedidos", en una cuenta
        a la que todavía no puede entrar. Va el de cuenta creada, que además
        lleva el enlace para definir la contraseña."""
        enviados = []
        monkeypatch.setattr("app.core.email.send_email", lambda **kw: enviados.append(kw))

        quote = _cotizacion(db, customer_email="nuevo4@test.com")
        opcion = _con_opcion(db, quote)
        admin_client.post(f"{BASE}/{quote.id}/convert", json={"option_id": opcion.id})

        assert len(enviados) == 1
        assert "Tomamos tu pedido" in enviados[0]["subject"]
        assert "reset-password?token=" in enviados[0]["html"]

    def test_el_correo_de_la_cuenta_nueva_lleva_el_detalle(self, admin_client, db, monkeypatch):
        enviados = []
        monkeypatch.setattr("app.core.email.send_email", lambda **kw: enviados.append(kw))

        quote = _cotizacion(db, customer_email="nuevo5@test.com")
        opcion = _con_opcion(db, quote)
        admin_client.post(f"{BASE}/{quote.id}/convert", json={"option_id": opcion.id})

        for cuerpo in (enviados[0]["html"], enviados[0]["text"]):
            assert "Original Bosch" in cuerpo
            assert "3 a 5 días hábiles" in cuerpo
            assert "Gol G5 2012" in cuerpo

    def test_al_cliente_existente_no_le_llega_ningun_enlace_de_contrasena(
        self, admin_client, db, user, monkeypatch
    ):
        """Un enlace para "crear tu contraseña" mandado a alguien que ya tiene
        cuenta es indistinguible de un intento de tomársela."""
        enviados = []
        monkeypatch.setattr("app.core.email.send_email", lambda **kw: enviados.append(kw))

        quote = _cotizacion(db, user_id=user.id)
        opcion = _con_opcion(db, quote)
        admin_client.post(f"{BASE}/{quote.id}/convert", json={"option_id": opcion.id})

        assert len(enviados) == 1
        assert "reset-password" not in enviados[0]["html"]
