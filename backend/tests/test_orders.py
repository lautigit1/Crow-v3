"""
Tests for orders endpoints:
  - POST /api/orders (crear, validaciones, snapshot de item)
  - GET /api/orders/me, GET /api/orders/me/{id} (propio, 403 ajeno)
  - PATCH /api/orders/me/{id}/cancel (solo Pendiente, 403 ajeno)
  - GET /api/orders, PATCH /api/orders/{id} (admin)
  - Regresión N+1 en los listados (selectinload de items)
"""
from sqlalchemy import event

from tests.conftest import engine

BASE = "/api/orders"


def _create_order(client, product, **overrides):
    payload = {
        "items": [{"product_id": product.id, "quantity": 2}],
    }
    payload.update(overrides)
    return client.post(BASE, json=payload)


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------

class TestOrdersAuth:
    def test_create_requires_auth(self, client, product):
        r = _create_order(client, product)
        assert r.status_code == 401

    def test_my_orders_requires_auth(self, client):
        r = client.get(f"{BASE}/me")
        assert r.status_code == 401

    def test_admin_list_requires_admin(self, user_client):
        r = user_client.get(BASE)
        assert r.status_code == 403


# ---------------------------------------------------------------------------
# Create
# ---------------------------------------------------------------------------

class TestCreateOrder:
    def test_create_order_basic(self, user_client, product):
        r = _create_order(user_client, product)
        assert r.status_code == 201
        data = r.json()
        assert data["status"] == "Pendiente"
        assert data["payment_method"] is None
        assert len(data["items"]) == 1

    def test_create_order_with_payment_method(self, user_client, product):
        r = _create_order(user_client, product, payment_method="Transferencia")
        assert r.status_code == 201
        assert r.json()["payment_method"] == "Transferencia"

    def test_create_order_snapshots_item_fields(self, user_client, product):
        r = _create_order(user_client, product)
        item = r.json()["items"][0]
        assert item["sku_snapshot"] == product.sku
        assert item["name_snapshot"] == product.name
        assert item["unit_price_snapshot"] == float(product.price)
        assert item["quantity"] == 2

    def test_create_order_empty_items_rejected(self, user_client):
        r = user_client.post(BASE, json={"items": []})
        assert r.status_code == 422

    def test_create_order_invalid_quantity_rejected(self, user_client, product):
        r = user_client.post(BASE, json={"items": [{"product_id": product.id, "quantity": 0}]})
        assert r.status_code == 422

    def test_create_order_nonexistent_product_rejected(self, user_client):
        r = user_client.post(BASE, json={"items": [{"product_id": 99999, "quantity": 1}]})
        assert r.status_code == 422

    def test_create_order_deleted_product_rejected(self, user_client, deleted_product):
        r = user_client.post(BASE, json={"items": [{"product_id": deleted_product.id, "quantity": 1}]})
        assert r.status_code == 422


# ---------------------------------------------------------------------------
# Own orders (list / detail)
# ---------------------------------------------------------------------------

class TestMyOrders:
    def test_list_own_orders(self, user_client, product):
        _create_order(user_client, product)
        r = user_client.get(f"{BASE}/me")
        assert r.status_code == 200
        data = r.json()
        assert data["total"] == 1
        assert len(data["items"]) == 1

    def test_detail_own_order(self, user_client, product):
        created = _create_order(user_client, product).json()
        r = user_client.get(f"{BASE}/me/{created['id']}")
        assert r.status_code == 200
        assert r.json()["id"] == created["id"]

    def test_detail_other_users_order_forbidden(self, user_client, admin_client, product):
        created = _create_order(user_client, product).json()
        r = admin_client.get(f"{BASE}/me/{created['id']}")
        assert r.status_code == 403

    def test_detail_nonexistent_order_404(self, user_client):
        r = user_client.get(f"{BASE}/me/99999")
        assert r.status_code == 404


# ---------------------------------------------------------------------------
# Cancel
# ---------------------------------------------------------------------------

class TestCancelOrder:
    def test_cancel_pending_order(self, user_client, product):
        created = _create_order(user_client, product).json()
        r = user_client.patch(f"{BASE}/me/{created['id']}/cancel")
        assert r.status_code == 200
        assert r.json()["status"] == "Cancelado"

    def test_cancel_already_cancelled_conflicts(self, user_client, product):
        created = _create_order(user_client, product).json()
        user_client.patch(f"{BASE}/me/{created['id']}/cancel")
        r = user_client.patch(f"{BASE}/me/{created['id']}/cancel")
        assert r.status_code == 409

    def test_cancel_other_users_order_forbidden(self, user_client, admin_client, product):
        created = _create_order(user_client, product).json()
        r = admin_client.patch(f"{BASE}/me/{created['id']}/cancel")
        assert r.status_code == 403


# ---------------------------------------------------------------------------
# Admin
# ---------------------------------------------------------------------------

class TestAdminOrders:
    def test_admin_list_all_orders(self, user_client, admin_client, product):
        _create_order(user_client, product)
        r = admin_client.get(BASE)
        assert r.status_code == 200
        data = r.json()
        assert data["total"] == 1

    def test_admin_list_filter_by_user_id(self, user_client, admin_client, product, user, admin):
        _create_order(user_client, product)
        r = admin_client.get(BASE, params={"user_id": admin.id})
        assert r.json()["total"] == 0
        r2 = admin_client.get(BASE, params={"user_id": user.id})
        assert r2.json()["total"] == 1

    def test_admin_update_status_and_notes(self, user_client, admin_client, product):
        created = _create_order(user_client, product).json()
        r = admin_client.patch(
            f"{BASE}/{created['id']}",
            json={"status": "Confirmado", "admin_notes": "Stock verificado"},
        )
        assert r.status_code == 200
        data = r.json()
        assert data["status"] == "Confirmado"
        assert data["admin_notes"] == "Stock verificado"

    def test_admin_update_requires_admin(self, user_client, product):
        created = _create_order(user_client, product).json()
        r = user_client.patch(f"{BASE}/{created['id']}", json={"status": "Confirmado"})
        assert r.status_code == 403


# ---------------------------------------------------------------------------
# Lo que la lista del panel necesita: cliente, total y filtros
# ---------------------------------------------------------------------------

class TestAdminOrderList:
    def test_trae_los_datos_del_cliente(self, user_client, admin_client, product, user):
        """Sin esto la UI tendría que pedir cada usuario por separado: hoy en
        la respuesta solo viaja `user_id`."""
        _create_order(user_client, product)
        fila = admin_client.get(BASE).json()["items"][0]
        assert fila["customer_name"] == user.full_name
        assert fila["customer_email"] == user.email

    def test_calcula_el_total_desde_los_snapshots(self, user_client, admin_client, product):
        # `items` explícito: el helper mete los overrides en la raíz del
        # payload, no adentro del ítem.
        _create_order(user_client, product, items=[{"product_id": product.id, "quantity": 3}])
        fila = admin_client.get(BASE).json()["items"][0]
        assert fila["total"] == float(product.price) * 3
        assert fila["items_sin_precio"] == 0

    def test_el_total_no_cambia_si_cambia_el_precio_del_producto(
        self, user_client, admin_client, product, db
    ):
        """El pedido guarda el precio del momento. Si el total se calculara
        desde el producto actual, un pedido de marzo cambiaría de monto cada
        vez que se actualiza la lista de precios."""
        _create_order(user_client, product)  # el helper ya pide cantidad 2
        original = float(product.price) * 2

        product.price = 99999
        db.add(product)
        db.flush()

        assert admin_client.get(BASE).json()["items"][0]["total"] == original

    def test_productos_a_consultar_no_suman_pero_se_cuentan(
        self, user_client, admin_client, db, category, brand
    ):
        """`Product.price` es nullable -- son los "Consultar precio". Sumarlos
        como 0 daría un total que parece completo y no lo es."""
        from app.models.product import Product

        sin_precio = Product(
            name="Repuesto a consultar", sku="CONS-1", stock=10,
            price=None, category_id=category.id, brand_id=brand.id, is_deleted=False,
        )
        db.add(sin_precio)
        db.flush()

        user_client.post(BASE, json={"items": [{"product_id": sin_precio.id, "quantity": 2}]})
        fila = admin_client.get(BASE).json()["items"][0]
        assert fila["total"] == 0.0
        assert fila["items_sin_precio"] == 1

    def test_filtra_por_estado_de_entrega(self, user_client, admin_client, product):
        creado = _create_order(user_client, product).json()
        _create_order(user_client, product)
        admin_client.patch(f"{BASE}/{creado['id']}", json={"status": "Enviado"})

        assert admin_client.get(BASE, params={"status": "Enviado"}).json()["total"] == 1
        assert admin_client.get(BASE, params={"status": "Pendiente"}).json()["total"] == 1

    def test_filtra_por_estado_de_cobro(self, user_client, admin_client, product):
        creado = _create_order(user_client, product).json()
        _create_order(user_client, product)
        admin_client.patch(
            f"{BASE}/{creado['id']}", json={"status": "Pendiente", "payment_status": "Pagado"}
        )

        assert admin_client.get(BASE, params={"payment_status": "Pagado"}).json()["total"] == 1
        assert admin_client.get(BASE, params={"payment_status": "Sin cobrar"}).json()["total"] == 1

    def test_combina_los_dos_filtros(self, user_client, admin_client, product):
        """El caso que le interesa al admin: entregado pero sin cobrar."""
        creado = _create_order(user_client, product).json()
        _create_order(user_client, product)
        admin_client.patch(f"{BASE}/{creado['id']}", json={"status": "Entregado"})

        r = admin_client.get(BASE, params={"status": "Entregado", "payment_status": "Sin cobrar"})
        assert r.json()["total"] == 1

    def test_busca_por_nombre_y_por_mail(self, user_client, admin_client, product, user):
        _create_order(user_client, product)
        assert admin_client.get(BASE, params={"q": user.full_name[:4]}).json()["total"] == 1
        assert admin_client.get(BASE, params={"q": user.email}).json()["total"] == 1
        assert admin_client.get(BASE, params={"q": "nadie"}).json()["total"] == 0

    def test_busca_por_numero_de_pedido(self, user_client, admin_client, product):
        """Es el dato que el cliente pasa por WhatsApp."""
        creado = _create_order(user_client, product).json()
        _create_order(user_client, product)
        r = admin_client.get(BASE, params={"q": str(creado["id"])})
        assert r.json()["total"] == 1
        assert r.json()["items"][0]["id"] == creado["id"]

    def test_el_patch_devuelve_la_forma_de_admin(self, user_client, admin_client, product):
        """Así la lista puede actualizar la fila sin volver a pedir la página."""
        creado = _create_order(user_client, product).json()
        r = admin_client.patch(f"{BASE}/{creado['id']}", json={"status": "Confirmado"})
        assert "customer_name" in r.json()
        assert "total" in r.json()

    def test_mis_pedidos_no_expone_los_campos_de_admin(self, user_client, product):
        """`OrderRead` se mantiene chico: el cliente ya sabe cómo se llama."""
        _create_order(user_client, product)
        fila = user_client.get(f"{BASE}/me").json()["items"][0]
        assert "customer_name" not in fila
        assert "customer_phone" not in fila


# ---------------------------------------------------------------------------
# Estado de cobro (migración 019)
#
# El cobro se coordina por WhatsApp, fuera del sistema, así que es un eje
# independiente de la entrega. Lo que se prueba acá es justamente esa
# independencia: que moverse en un eje no arrastre el otro.
# ---------------------------------------------------------------------------

class TestPaymentStatus:
    def test_las_etiquetas_de_la_migracion_son_las_que_manda_sqlalchemy(self):
        """El tipo de Postgres tiene que hablar el mismo idioma que el ORM.

        SQLAlchemy persiste el NOMBRE del miembro del enum ("SIN_COBRAR"), no
        su valor legible ("Sin cobrar"). Si la migración crea el tipo con los
        valores, todo anda hasta el primer INSERT real, que revienta con
        "invalid input value for enum paymentstatus".

        El resto de la suite no puede detectarlo: corre sobre SQLite, donde un
        Enum es un VARCHAR sin restricción de etiquetas. Este test compara las
        dos listas directamente, sin necesidad de una base Postgres.
        """
        import importlib.util
        import pathlib

        from sqlalchemy import Enum as SAEnum

        from app.models.order import PaymentStatus

        ruta = (
            pathlib.Path(__file__).resolve().parents[1]
            / "alembic" / "versions" / "019_order_payment_status.py"
        )
        spec = importlib.util.spec_from_file_location("migracion_019", ruta)
        migracion = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(migracion)

        assert list(migracion.payment_status.enums) == list(SAEnum(PaymentStatus).enums)

    def test_un_pedido_nuevo_arranca_sin_cobrar(self, user_client, product):
        assert _create_order(user_client, product).json()["payment_status"] == "Sin cobrar"

    def test_el_cliente_ve_el_estado_de_cobro(self, user_client, product):
        """Va en `OrderRead`, no solo en el schema de admin: es lo que le evita
        al cliente tener que preguntar si su pago ya figura."""
        created = _create_order(user_client, product).json()
        r = user_client.get(f"{BASE}/me/{created['id']}")
        assert r.json()["payment_status"] == "Sin cobrar"

    def test_admin_cambia_solo_el_cobro(self, user_client, admin_client, product):
        created = _create_order(user_client, product).json()
        r = admin_client.patch(
            f"{BASE}/{created['id']}",
            json={"status": "Pendiente", "payment_status": "Pagado"},
        )
        assert r.status_code == 200
        assert r.json()["payment_status"] == "Pagado"
        # La entrega no se movió: pagó por adelantado y todavía no se despachó.
        assert r.json()["status"] == "Pendiente"

    def test_mandar_solo_status_no_pisa_el_cobro(self, user_client, admin_client, product):
        """El caso que justifica que el campo sea opcional y sin default.

        Si `payment_status` tuviera un default en el schema, este PATCH -- que
        es exactamente el que hacía el panel antes de este cambio -- volvería
        el pedido a "Sin cobrar" en silencio.
        """
        created = _create_order(user_client, product).json()
        admin_client.patch(f"{BASE}/{created['id']}", json={"status": "Confirmado", "payment_status": "Pagado"})
        r = admin_client.patch(f"{BASE}/{created['id']}", json={"status": "Enviado"})
        assert r.json()["payment_status"] == "Pagado"
        assert r.json()["status"] == "Enviado"

    def test_cancelar_un_pedido_pagado_conserva_el_cobro(self, user_client, admin_client, product, db):
        """Cancelar devuelve el stock pero NO borra que el cliente pagó.

        Poner el cobro en "Sin cobrar" al cancelar perdería justo el dato que
        hace falta para saber que hay que devolverle la plata.
        """
        stock_inicial = product.stock
        created = _create_order(user_client, product).json()
        admin_client.patch(f"{BASE}/{created['id']}", json={"status": "Confirmado", "payment_status": "Pagado"})

        r = admin_client.patch(f"{BASE}/{created['id']}", json={"status": "Cancelado"})
        assert r.status_code == 200
        assert r.json()["status"] == "Cancelado"
        assert r.json()["payment_status"] == "Pagado"
        db.refresh(product)
        assert product.stock == stock_inicial

    def test_no_hay_validacion_de_transiciones_de_cobro(self, user_client, admin_client, product):
        """Se puede volver de Pagado a Sin cobrar.

        Es deliberado: el pago pasa por fuera del sistema, así que un pago
        rechazado o mal registrado tiene que poder corregirse. Bloquear el
        camino de vuelta solo lograría que el admin no pueda dejar la base
        reflejando la realidad.
        """
        created = _create_order(user_client, product).json()
        admin_client.patch(f"{BASE}/{created['id']}", json={"status": "Pendiente", "payment_status": "Pagado"})
        r = admin_client.patch(f"{BASE}/{created['id']}", json={"status": "Pendiente", "payment_status": "Sin cobrar"})
        assert r.status_code == 200
        assert r.json()["payment_status"] == "Sin cobrar"

    def test_valor_de_cobro_invalido_se_rechaza(self, user_client, admin_client, product):
        created = _create_order(user_client, product).json()
        r = admin_client.patch(
            f"{BASE}/{created['id']}",
            json={"status": "Pendiente", "payment_status": "Fiado"},
        )
        assert r.status_code == 422


# ---------------------------------------------------------------------------
# Regresión N+1: listar pedidos no debe escalar linealmente con la cantidad
# de pedidos (selectinload de Order.items en vez de lazy loading).
# ---------------------------------------------------------------------------

def _count_queries(fn):
    """Cuenta las queries SQL emitidas mientras corre `fn`."""
    count = 0

    def _before_cursor_execute(*args, **kwargs):
        nonlocal count
        count += 1

    event.listen(engine, "before_cursor_execute", _before_cursor_execute)
    try:
        fn()
    finally:
        event.remove(engine, "before_cursor_execute", _before_cursor_execute)
    return count


class TestOrdersNPlusOne:
    def test_my_orders_query_count_does_not_scale_with_order_count(self, user_client, product):
        # 1 pedido de referencia
        _create_order(user_client, product)
        baseline = _count_queries(lambda: user_client.get(f"{BASE}/me"))

        # 5 pedidos más (6 en total)
        for _ in range(5):
            _create_order(user_client, product)
        with_more_orders = _count_queries(lambda: user_client.get(f"{BASE}/me"))

        # Sin selectinload, cada pedido extra agrega 1 query para sus items
        # (N+1 real). Con selectinload, el número de queries es constante
        # sin importar cuántos pedidos haya en la página.
        assert with_more_orders == baseline, (
            f"El listado de /orders/me parece tener N+1: {baseline} queries con 1 "
            f"pedido vs {with_more_orders} con 6 pedidos (deberían ser iguales)."
        )

    def test_admin_list_orders_query_count_does_not_scale_with_order_count(
        self, user_client, admin_client, product
    ):
        _create_order(user_client, product)
        baseline = _count_queries(lambda: admin_client.get(BASE))

        for _ in range(5):
            _create_order(user_client, product)
        with_more_orders = _count_queries(lambda: admin_client.get(BASE))

        assert with_more_orders == baseline, (
            f"El listado admin de pedidos parece tener N+1: {baseline} queries con 1 "
            f"pedido vs {with_more_orders} con 6 pedidos (deberían ser iguales)."
        )
