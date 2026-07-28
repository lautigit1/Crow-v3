"""
Tests del historial de movimientos de stock.

La invariante que cuidan estos tests es una sola: **`products.stock` nunca
cambia sin dejar un movimiento**. Es lo que hace posible responder "¿por qué
este producto tiene 3 unidades si compré 20?" y, más adelante, revertir una
importación de factura completa.

Por eso varios tests verifican el par (stock, historial) en vez de solo el
stock: que el número final esté bien pero el movimiento falte es exactamente
el bug que esta tabla existe para evitar.
"""

import pytest
from sqlalchemy import select

from app.core.stock import mover_stock
from app.models.order import Order, OrderStatus
from app.models.product import Product
from app.models.stock_movement import StockMovement, StockReason

BASE = "/api/products"


def movimientos(db, product_id: int) -> list[StockMovement]:
    return list(db.scalars(
        select(StockMovement)
        .where(StockMovement.product_id == product_id)
        .order_by(StockMovement.id)
    ).all())


# ---------------------------------------------------------------------------
# El helper
# ---------------------------------------------------------------------------

class TestMoverStock:
    def test_suma_y_registra(self, db, product):
        inicial = product.stock
        mover_stock(db, product, 5, StockReason.COMPRA)
        db.flush()

        assert product.stock == inicial + 5
        movs = movimientos(db, product.id)
        assert len(movs) == 1
        assert movs[0].delta == 5
        assert movs[0].stock_after == inicial + 5
        assert movs[0].reason == StockReason.COMPRA

    def test_delta_cero_no_registra_nada(self, db, product):
        """Pasa cada vez que se guarda un producto sin tocar el stock. Es un
        caso normal, no un error: simplemente no ensucia el historial."""
        assert mover_stock(db, product, 0, StockReason.AJUSTE) is None
        db.flush()
        assert movimientos(db, product.id) == []

    def test_stock_negativo_explota(self, db, product):
        """Quien vende valida antes; si igual llega acá es un bug de quien
        llama, y conviene que falle con un mensaje claro y no contra la
        CHECK constraint de Postgres."""
        with pytest.raises(ValueError, match="dejaría el stock"):
            mover_stock(db, product, -(product.stock + 1), StockReason.VENTA)

    def test_stock_after_sigue_la_cadena(self, db, product):
        mover_stock(db, product, 3, StockReason.COMPRA)
        db.flush()
        mover_stock(db, product, -2, StockReason.VENTA)
        db.flush()

        movs = movimientos(db, product.id)
        assert [m.delta for m in movs] == [3, -2]
        assert [m.stock_after for m in movs] == [product.stock + 2 - 3 + 3, product.stock]


# ---------------------------------------------------------------------------
# Los cuatro caminos que mueven stock en la app
# ---------------------------------------------------------------------------

class TestCaminosQueMuevenStock:
    def test_alta_de_producto_registra_stock_inicial(self, admin_client, db, category):
        r = admin_client.post(BASE, json={"name": "Bujía", "sku": "BUJ-9", "stock": 12, "category_id": category.id})
        assert r.status_code == 201
        pid = r.json()["id"]
        assert r.json()["stock"] == 12

        movs = movimientos(db, pid)
        assert len(movs) == 1
        assert movs[0].delta == 12
        assert movs[0].reason == StockReason.ALTA

    def test_alta_sin_stock_no_registra(self, admin_client, db, category):
        r = admin_client.post(BASE, json={"name": "Sensor", "sku": "SEN-9", "stock": 0, "category_id": category.id})
        assert movimientos(db, r.json()["id"]) == []

    def test_ajuste_manual_registra_la_diferencia(self, admin_client, db, product):
        inicial = product.stock
        r = admin_client.patch(f"{BASE}/{product.id}", json={"stock": inicial + 7})
        assert r.status_code == 200
        assert r.json()["stock"] == inicial + 7

        movs = movimientos(db, product.id)
        assert movs[-1].delta == 7
        assert movs[-1].reason == StockReason.AJUSTE

    def test_editar_sin_tocar_stock_no_registra(self, admin_client, db, product):
        admin_client.patch(f"{BASE}/{product.id}", json={"name": "Nombre nuevo"})
        assert movimientos(db, product.id) == []

    def test_venta_descuenta_y_registra(self, user_client, db, product):
        inicial = product.stock
        r = user_client.post("/api/orders", json={"items": [{"product_id": product.id, "quantity": 2}]})
        assert r.status_code == 201

        db.refresh(product)
        assert product.stock == inicial - 2
        movs = movimientos(db, product.id)
        assert movs[-1].delta == -2
        assert movs[-1].reason == StockReason.VENTA
        # Queda atado al pedido: es lo que permite rastrear una salida.
        assert movs[-1].order_id == r.json()["id"]

    def test_cancelacion_devuelve_y_registra(self, user_client, db, product):
        inicial = product.stock
        creado = user_client.post("/api/orders", json={"items": [{"product_id": product.id, "quantity": 3}]})
        order_id = creado.json()["id"]

        r = user_client.patch(f"/api/orders/me/{order_id}/cancel")
        assert r.status_code == 200

        db.refresh(product)
        assert product.stock == inicial
        movs = movimientos(db, product.id)
        assert [m.reason for m in movs[-2:]] == [StockReason.VENTA, StockReason.CANCELACION]
        assert movs[-1].delta == 3


# ---------------------------------------------------------------------------
# La invariante
# ---------------------------------------------------------------------------

class TestInvariante:
    def test_la_suma_de_deltas_da_el_stock(self, admin_client, user_client, db, category):
        """Para un producto nacido después de la migración 014, el stock tiene
        que ser exactamente la suma de sus movimientos. Si algún camino
        escribiera `product.stock` directo, este test lo detecta."""
        creado = admin_client.post(
            BASE, json={"name": "Correa", "sku": "COR-9", "stock": 10, "category_id": category.id}
        )
        pid = creado.json()["id"]

        admin_client.patch(f"{BASE}/{pid}", json={"stock": 15})
        pedido = user_client.post("/api/orders", json={"items": [{"product_id": pid, "quantity": 4}]})
        user_client.patch(f"/api/orders/me/{pedido.json()['id']}/cancel")
        admin_client.patch(f"{BASE}/{pid}", json={"stock": 9})

        producto = db.get(Product, pid)
        db.refresh(producto)
        assert producto.stock == sum(m.delta for m in movimientos(db, pid))

    def test_pedido_rechazado_no_deja_movimiento(self, user_client, db, product):
        """El rollback del request tiene que llevarse el movimiento junto con
        el descuento: si no, un pedido fallido dejaría el historial mintiendo."""
        inicial = product.stock
        r = user_client.post(
            "/api/orders", json={"items": [{"product_id": product.id, "quantity": inicial + 100}]}
        )
        assert r.status_code == 409

        db.refresh(product)
        assert product.stock == inicial
        assert movimientos(db, product.id) == []


# ---------------------------------------------------------------------------
# Endpoint
# ---------------------------------------------------------------------------

class TestEndpointHistorial:
    def test_devuelve_del_mas_nuevo_al_mas_viejo(self, admin_client, db, product):
        admin_client.patch(f"{BASE}/{product.id}", json={"stock": product.stock + 5})
        admin_client.patch(f"{BASE}/{product.id}", json={"stock": product.stock + 1})

        r = admin_client.get(f"{BASE}/{product.id}/stock-movements")
        assert r.status_code == 200
        deltas = [m["delta"] for m in r.json()]
        assert len(deltas) == 2
        assert deltas[0] == 1  # el más reciente primero

    def test_requiere_admin(self, user_client, product):
        assert user_client.get(f"{BASE}/{product.id}/stock-movements").status_code == 403

    def test_producto_sin_movimientos_devuelve_lista_vacia(self, admin_client, product):
        assert admin_client.get(f"{BASE}/{product.id}/stock-movements").json() == []


# ---------------------------------------------------------------------------
# Borrado en cascada
# ---------------------------------------------------------------------------

class TestCascada:
    def test_el_movimiento_sobrevive_al_pedido(self, user_client, db, product):
        """`order_id` es SET NULL, no CASCADE: el movimiento es un registro
        contable y no una pertenencia del pedido."""
        creado = user_client.post("/api/orders", json={"items": [{"product_id": product.id, "quantity": 1}]})
        order = db.get(Order, creado.json()["id"])
        order.status = OrderStatus.CANCELADO
        db.delete(order)
        db.flush()

        movs = movimientos(db, product.id)
        assert len(movs) == 1
        assert movs[0].order_id is None
