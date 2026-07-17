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
