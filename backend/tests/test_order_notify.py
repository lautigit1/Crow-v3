"""
Los orígenes de notificación y el interruptor del email.

La pregunta que responden estos tests no es "¿se notifica?" sino **"¿se notifica
lo justo?"**. Un sistema que avisa de todo es equivalente a uno que no avisa de
nada: el cliente aprende a ignorarlo. Así que hay un test por cada transición
que NO debe mandar correo, igual que por las que sí.
"""

import pytest

from app.core import order_notify
from app.models.notification import Notification, NotificationType
from app.models.order import OrderStatus, PaymentStatus

BASE = "/api/orders"


def _create_order(client, product, **overrides):
    payload = {"items": [{"product_id": product.id, "quantity": 2}]}
    payload.update(overrides)
    return client.post(BASE, json=payload)


@pytest.fixture()
def sin_email(monkeypatch):
    """Captura los correos en vez de mandarlos."""
    enviados: list[dict] = []
    monkeypatch.setattr("app.core.email.send_email", lambda **kw: enviados.append(kw))
    return enviados


# ---------------------------------------------------------------------------
# El interruptor
# ---------------------------------------------------------------------------

class TestQueTransicionesMandanEmail:
    @pytest.mark.parametrize(
        "estado",
        [OrderStatus.CONFIRMADO, OrderStatus.ENVIADO, OrderStatus.ENTREGADO],
    )
    def test_los_tres_de_entrega_que_le_importan_al_cliente(self, estado):
        assert estado in order_notify.ENTREGA_CON_EMAIL

    @pytest.mark.parametrize(
        "estado",
        [OrderStatus.PENDIENTE, OrderStatus.EN_PROCESO, OrderStatus.CANCELADO],
    )
    def test_los_internos_no_mandan(self, estado):
        """"En proceso" es tu operación interna, y "Cancelado" siempre viene con
        una conversación por WhatsApp: un correo automático sin motivo llega
        peor que no llegar."""
        assert estado not in order_notify.ENTREGA_CON_EMAIL

    def test_del_cobro_solo_pagado(self):
        assert order_notify.COBRO_CON_EMAIL == {PaymentStatus.PAGADO}

    def test_todos_los_estados_tienen_texto(self):
        """Si se agrega un estado al enum y nadie le escribe el título, la
        notificación saldría con el texto de fallback. Esto lo agarra antes."""
        assert set(order_notify.TITULO_ENTREGA) == set(OrderStatus)
        assert set(order_notify.TITULO_COBRO) == set(PaymentStatus)


# ---------------------------------------------------------------------------
# Contra el endpoint real
# ---------------------------------------------------------------------------

class TestPatchDeAdmin:
    def test_confirmar_notifica_al_cliente_y_manda_correo(
        self, user_client, admin_client, product, user, db, sin_email
    ):
        creado = _create_order(user_client, product).json()
        admin_client.patch(f"{BASE}/{creado['id']}", json={"status": "Confirmado"})

        notis = db.query(Notification).filter(Notification.user_id == user.id).all()
        assert [n.type for n in notis] == [NotificationType.ORDER_STATUS]
        assert notis[0].title == "Tu pedido está confirmado"
        assert notis[0].link == "/cuenta/pedidos"
        assert len(sin_email) == 1
        assert user.email == sin_email[0]["to"]

    def test_en_proceso_notifica_pero_no_manda_correo(
        self, user_client, admin_client, product, user, db, sin_email
    ):
        creado = _create_order(user_client, product).json()
        admin_client.patch(f"{BASE}/{creado['id']}", json={"status": "En proceso"})

        assert db.query(Notification).filter(Notification.user_id == user.id).count() == 1
        assert sin_email == []

    def test_cancelar_notifica_pero_no_manda_correo(
        self, user_client, admin_client, product, user, db, sin_email
    ):
        creado = _create_order(user_client, product).json()
        admin_client.patch(f"{BASE}/{creado['id']}", json={"status": "Cancelado"})

        notis = db.query(Notification).filter(Notification.user_id == user.id).all()
        assert notis[0].title == "Tu pedido fue cancelado"
        assert sin_email == []

    def test_cada_eje_genera_su_propia_notificacion(
        self, user_client, admin_client, product, user, db, sin_email
    ):
        """Son hechos distintos y la campana los muestra por separado."""
        creado = _create_order(user_client, product).json()
        admin_client.patch(
            f"{BASE}/{creado['id']}",
            json={"status": "Confirmado", "payment_status": "Pagado"},
        )

        tipos = {
            n.type
            for n in db.query(Notification).filter(Notification.user_id == user.id).all()
        }
        assert tipos == {NotificationType.ORDER_STATUS, NotificationType.ORDER_PAYMENT}

    def test_los_dos_ejes_a_la_vez_mandan_UN_solo_correo(
        self, user_client, admin_client, product, sin_email
    ):
        """Es un caso real: el admin resuelve todo de una. Dos correos sobre el
        mismo pedido en el mismo segundo se leen como un error del sistema."""
        creado = _create_order(user_client, product).json()
        admin_client.patch(
            f"{BASE}/{creado['id']}",
            json={"status": "Confirmado", "payment_status": "Pagado"},
        )
        assert len(sin_email) == 1
        # Y menciona los dos.
        assert "Confirmado" in sin_email[0]["html"]
        assert "Pagado" in sin_email[0]["html"]

    def test_un_patch_que_no_cambia_nada_no_notifica(
        self, user_client, admin_client, product, user, db, sin_email
    ):
        creado = _create_order(user_client, product).json()
        admin_client.patch(f"{BASE}/{creado['id']}", json={"status": "Pendiente"})

        assert db.query(Notification).filter(Notification.user_id == user.id).count() == 0
        assert sin_email == []

    def test_el_admin_no_se_notifica_a_si_mismo(
        self, user_client, admin_client, product, admin, db, sin_email
    ):
        """Acaba de hacer el cambio: avisarle de su propia acción es ruido."""
        creado = _create_order(user_client, product).json()
        antes = db.query(Notification).filter(Notification.user_id == admin.id).count()
        admin_client.patch(f"{BASE}/{creado['id']}", json={"status": "Confirmado"})
        assert db.query(Notification).filter(Notification.user_id == admin.id).count() == antes


class TestAltaDePedido:
    def test_notifica_a_los_admins(self, user_client, product, admin, db):
        """Es lo que arregla el agujero de la barra de "pedidos nuevos": si el
        admin no estaba mirando, el aviso queda esperándolo."""
        _create_order(user_client, product)

        notis = db.query(Notification).filter(Notification.user_id == admin.id).all()
        assert len(notis) == 1
        assert "Pedido nuevo" in notis[0].title
        assert notis[0].link == "/admin/pedidos"

    def test_no_manda_correo_a_los_admins(self, user_client, product, sin_email):
        """Alta frecuencia: le llenaría la casilla."""
        _create_order(user_client, product)
        assert sin_email == []
