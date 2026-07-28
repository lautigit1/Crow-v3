"""
Tests del estado de publicación (`products.is_active`).

Un producto en borrador (`is_active=False`) está cargado en el sistema pero
no existe para el público. La regla vive en `producto_publico()`
(app/models/product.py) y la consumen cinco endpoints; estos tests cubren los
cinco, más la excepción deliberada del dashboard.

El valor de este archivo está justamente en la cobertura por endpoint: el
modo de falla real de esta feature no es "la condición está mal escrita",
sino "alguien agregó un endpoint y se olvidó de aplicarla".
"""

import pytest

from app.models.product import Product

BASE = "/api/products"


@pytest.fixture()
def draft_product(db, category, brand) -> Product:
    """Producto cargado pero fuera del catálogo."""
    p = Product(
        name="Pastillas de freno sin publicar",
        sku="DRAFT-001",
        stock=7,
        price=2500.00,
        category_id=category.id,
        brand_id=brand.id,
        is_deleted=False,
        is_active=False,
    )
    db.add(p)
    db.flush()
    return p


# ---------------------------------------------------------------------------
# Los cinco lugares donde un borrador no debe aparecer
# ---------------------------------------------------------------------------

class TestBorradorInvisibleParaElPublico:
    def test_no_aparece_en_el_listado(self, client, product, draft_product):
        r = client.get(BASE)
        assert r.status_code == 200
        ids = [p["id"] for p in r.json()["items"]]
        assert product.id in ids
        assert draft_product.id not in ids

    def test_no_cuenta_en_el_total(self, client, product, draft_product):
        assert client.get(BASE).json()["total"] == 1

    def test_no_se_accede_por_url_directa(self, client, draft_product):
        """El caso que más se escapa: no está listado, pero el link funciona."""
        assert client.get(f"{BASE}/{draft_product.id}").status_code == 404

    def test_no_entra_al_sitemap(self, client, product, draft_product):
        r = client.get("/sitemap.xml")
        assert r.status_code == 200
        assert f"/producto/{product.id}" in r.text
        assert f"/producto/{draft_product.id}" not in r.text

    def test_no_se_puede_favoritear(self, user_client, draft_product):
        assert user_client.post(f"/api/favorites/{draft_product.id}").status_code == 404

    def test_no_se_puede_pedir(self, user_client, draft_product):
        r = user_client.post(
            "/api/orders",
            json={"items": [{"product_id": draft_product.id, "quantity": 1}]},
        )
        assert r.status_code == 422
        # El mensaje tiene que servirle al cliente que lo tenía en el carrito,
        # no solo al desarrollador que lee el log.
        assert "ya no está disponible" in r.json()["detail"]


# ---------------------------------------------------------------------------
# El admin sí los ve -- si no, no podría completarlos ni publicarlos
# ---------------------------------------------------------------------------

class TestAdminVeLosBorradores:
    def test_listado_admin_incluye_borradores(self, admin_client, product, draft_product):
        ids = [p["id"] for p in admin_client.get(BASE).json()["items"]]
        assert {product.id, draft_product.id} <= set(ids)

    def test_detalle_admin_devuelve_borrador(self, admin_client, draft_product):
        assert admin_client.get(f"{BASE}/{draft_product.id}").status_code == 200

    def test_filtro_is_active_false(self, admin_client, product, draft_product):
        ids = [p["id"] for p in admin_client.get(BASE, params={"is_active": False}).json()["items"]]
        assert ids == [draft_product.id]

    def test_filtro_is_active_es_ignorado_para_el_publico(self, client, product, draft_product):
        """Si no se ignorara, `?is_active=false` sería una forma de listar
        exactamente lo que no está publicado."""
        ids = [p["id"] for p in client.get(BASE, params={"is_active": False}).json()["items"]]
        assert draft_product.id not in ids

    def test_dashboard_cuenta_los_borradores(self, admin_client, product, draft_product):
        """Excepción deliberada: son métricas de administración, el admin
        quiere contar todo lo que tiene cargado."""
        assert admin_client.get("/api/dashboard").json()["total_products"] == 2


# ---------------------------------------------------------------------------
# Filtro por proveedor
# ---------------------------------------------------------------------------

class TestFiltroPorProveedor:
    def test_filtra_por_supplier_id(self, client, db, product, supplier, category):
        propio = Product(
            name="Amortiguador", sku="AMO-001", stock=3, price=9000.00,
            category_id=category.id, supplier_id=supplier.id, is_deleted=False,
        )
        db.add(propio)
        db.flush()
        ids = [p["id"] for p in client.get(BASE, params={"supplier_id": supplier.id}).json()["items"]]
        assert ids == [propio.id]


# ---------------------------------------------------------------------------
# Publicación en lote
# ---------------------------------------------------------------------------

class TestBulkActive:
    def test_publica_varios(self, admin_client, db, draft_product, product):
        product.is_active = False
        db.add(product)
        db.flush()

        r = admin_client.patch(
            f"{BASE}/bulk", json={"ids": [draft_product.id, product.id], "is_active": True}
        )
        assert r.status_code == 200
        assert r.json() == {"updated": 2, "skipped": []}
        assert client_ids_publicados(admin_client) == {draft_product.id, product.id}

    def test_despublica_varios(self, admin_client, product):
        r = admin_client.patch(f"{BASE}/bulk", json={"ids": [product.id], "is_active": False})
        assert r.status_code == 200
        assert r.json()["updated"] == 1

    def test_ids_inexistentes_van_a_skipped_sin_romper(self, admin_client, product):
        """En una acción en lote es más útil saber qué quedó afuera que perder
        toda la operación por un id viejo."""
        r = admin_client.patch(
            f"{BASE}/bulk", json={"ids": [product.id, 999_999], "is_active": False}
        )
        assert r.status_code == 200
        assert r.json() == {"updated": 1, "skipped": [999_999]}

    def test_no_republica_borrados(self, admin_client, deleted_product):
        """Sacar algo de la papelera es "restaurar", una acción distinta."""
        r = admin_client.patch(
            f"{BASE}/bulk", json={"ids": [deleted_product.id], "is_active": True}
        )
        assert r.json() == {"updated": 0, "skipped": [deleted_product.id]}

    def test_ruta_bulk_no_la_captura_product_id(self, admin_client, product):
        """`PATCH /bulk` está declarada antes que `PATCH /{product_id}`. Si se
        invirtiera el orden, "bulk" se leería como id y esto daría 422."""
        r = admin_client.patch(f"{BASE}/bulk", json={"ids": [product.id], "is_active": False})
        assert r.status_code != 422

    def test_requiere_admin(self, user_client, product):
        r = user_client.patch(f"{BASE}/bulk", json={"ids": [product.id], "is_active": False})
        assert r.status_code == 403

    def test_lista_vacia_es_invalida(self, admin_client):
        assert admin_client.patch(f"{BASE}/bulk", json={"ids": [], "is_active": True}).status_code == 422


def client_ids_publicados(admin_client) -> set[int]:
    return {p["id"] for p in admin_client.get(BASE, params={"is_active": True}).json()["items"]}
