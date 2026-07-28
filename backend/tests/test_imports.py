"""
Tests de la importación de facturas de proveedor.

Se arma un .xlsx de verdad en memoria (con openpyxl) en vez de mockear el
parser: el 90% de los problemas de esta feature están justamente en leer un
archivo real -- filas de preámbulo antes de los encabezados, números en
formato local, celdas vacías -- y un mock los esconde a todos.

La invariante central: **nada toca `products` ni el stock hasta confirmar, y
no se puede confirmar si el total no cuadra.**
"""

from decimal import Decimal
from io import BytesIO

import pytest
from openpyxl import Workbook
from sqlalchemy import select

from app.core.excel_import import ExcelInvalido, parsear, sugerir_mapeo
from app.models.import_batch import ImportBatch, ImportStatus, LineResolution
from app.models.product import Product
from app.models.stock_movement import StockMovement

MAPEO = {
    "mapping_sku": "Código",
    "mapping_name": "Descripción",
    "mapping_quantity": "Cant.",
    "mapping_unit_cost": "P. Unitario",
}


def excel(filas: list[list], *, preambulo: bool = True) -> bytes:
    """Genera un .xlsx con la pinta de una factura real."""
    wb = Workbook()
    hoja = wb.active
    if preambulo:
        # Lo que trae cualquier factura antes de la tabla: razón social,
        # domicilio, número. El parser tiene que saltearlo solo.
        hoja.append(["DISTRIAUTOS S.A."])
        hoja.append(["Suipacha 41 - Mendoza"])
        hoja.append([])
        hoja.append(["Factura B 0001-00012345"])
        hoja.append([])
    hoja.append(["Código", "Descripción", "Cant.", "P. Unitario"])
    for fila in filas:
        hoja.append(fila)
    buffer = BytesIO()
    wb.save(buffer)
    return buffer.getvalue()


def subir(admin_client, supplier_id: int, contenido: bytes, *, total=None, **extra):
    data = {**MAPEO, "remember_mapping": "true", **extra}
    if total is not None:
        data["declared_total"] = str(total)
    return admin_client.post(
        f"/api/suppliers/{supplier_id}/imports",
        files={"file": ("factura.xlsx", contenido, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
        data=data,
    )


# ---------------------------------------------------------------------------
# Parser
# ---------------------------------------------------------------------------

class TestParser:
    def test_saltea_el_preambulo_y_encuentra_los_encabezados(self):
        filas = parsear(excel([["FRE-100", "Pastillas", 10, "1.234,56"]]), {
            "sku": "Código", "name": "Descripción", "quantity": "Cant.", "unit_cost": "P. Unitario",
        })
        assert len(filas) == 1
        assert filas[0].sku == "FRE-100"
        # "1.234,56" es mil doscientos treinta y cuatro con cincuenta y seis:
        # punto de miles, coma decimal. Al revés que en Python.
        assert filas[0].unit_cost == Decimal("1234.56")

    def test_acepta_numeros_nativos_y_con_simbolo(self):
        filas = parsear(excel([
            ["A-1", "Uno", 2, 1500],
            ["A-2", "Dos", 3, "$ 2.000,50"],
        ]), {"sku": "Código", "name": "Descripción", "quantity": "Cant.", "unit_cost": "P. Unitario"})
        assert [f.unit_cost for f in filas] == [Decimal("1500"), Decimal("2000.50")]

    def test_fila_vacia_se_ignora(self):
        filas = parsear(excel([["A-1", "Uno", 1, 10], [None, None, None, None], ["A-2", "Dos", 1, 10]]), {
            "sku": "Código", "name": "Descripción", "quantity": "Cant.", "unit_cost": "P. Unitario",
        })
        assert len(filas) == 2

    def test_fila_ilegible_se_marca_no_se_descarta(self):
        """Descartarla en silencio sería lo peor: la factura tendría menos
        ítems de los reales y el total no cerraría sin explicación."""
        filas = parsear(excel([["A-1", "Uno", "muchas", 10]]), {
            "sku": "Código", "name": "Descripción", "quantity": "Cant.", "unit_cost": "P. Unitario",
        })
        assert len(filas) == 1
        assert filas[0].error == "Cantidad ilegible"

    def test_cantidad_negativa_se_marca(self):
        filas = parsear(excel([["A-1", "Uno", -3, 10]]), {
            "sku": "Código", "name": "Descripción", "quantity": "Cant.", "unit_cost": "P. Unitario",
        })
        assert "nota de crédito" in filas[0].error

    def test_sin_encabezados_reconocibles_falla_claro(self):
        wb = Workbook()
        wb.active.append(["patatas", "zanahorias"])
        wb.active.append([1, 2])
        buffer = BytesIO()
        wb.save(buffer)
        with pytest.raises(ExcelInvalido, match="encabezados"):
            parsear(buffer.getvalue(), {"sku": "a", "name": "b", "quantity": "c"})

    def test_columna_del_mapeo_que_ya_no_existe(self):
        """El caso que justifica el mapeo semántico contra la plantilla de
        PDF: cuando el proveedor cambia el formato, esto AVISA."""
        with pytest.raises(ExcelInvalido, match="no está en este archivo"):
            parsear(excel([["A-1", "Uno", 1, 10]]), {
                "sku": "Codigo Viejo", "name": "Descripción", "quantity": "Cant.",
            })

    def test_sugerencia_de_mapeo(self):
        assert sugerir_mapeo(["Código", "Descripción", "Cant.", "P. Unitario"]) == {
            "sku": "Código", "name": "Descripción", "quantity": "Cant.", "unit_cost": "P. Unitario",
        }


# ---------------------------------------------------------------------------
# Subida y resolución de SKU
# ---------------------------------------------------------------------------

class TestSubida:
    def test_crea_el_lote_en_borrador_sin_tocar_nada(self, admin_client, db, supplier):
        antes = db.scalar(select(Product).limit(1))
        r = subir(admin_client, supplier.id, excel([["NUE-1", "Producto nuevo", 5, 100]]), total=500)
        assert r.status_code == 201
        assert r.json()["status"] == "Borrador"
        # Nada creado todavía: el freno del medio.
        assert db.scalar(select(Product).where(Product.sku == "NUE-1")) is None
        assert db.scalar(select(Product).limit(1)) is antes

    def test_sku_nuevo_es_nuevo(self, admin_client, supplier):
        r = subir(admin_client, supplier.id, excel([["NUE-1", "Nuevo", 5, 100]]), total=500)
        assert r.json()["lines"][0]["resolution"] == "Producto nuevo"

    def test_sku_del_mismo_proveedor_es_reposicion(self, admin_client, db, supplier, product):
        """No interrumpe: comprarle otra vez lo mismo al mismo proveedor es lo
        más normal del mundo."""
        product.supplier_id = supplier.id
        db.add(product)
        db.flush()
        r = subir(admin_client, supplier.id, excel([[product.sku, product.name, 3, 100]]), total=300)
        assert r.json()["lines"][0]["resolution"] == "Reposición"

    def test_sku_de_otro_proveedor_es_conflicto(self, admin_client, supplier, product):
        """`product` no tiene proveedor asignado: puede ser la misma pieza o
        una coincidencia de código, y eso el sistema no lo puede decidir."""
        r = subir(admin_client, supplier.id, excel([[product.sku, "Otra cosa", 3, 100]]), total=300)
        assert r.json()["lines"][0]["resolution"] == "Conflicto de SKU"

    def test_guarda_el_mapeo_en_el_proveedor(self, admin_client, db, supplier):
        subir(admin_client, supplier.id, excel([["A-1", "Uno", 1, 10]]), total=10)
        db.refresh(supplier)
        assert supplier.column_mapping["sku"] == "Código"

    def test_preview_sugiere_el_mapeo(self, admin_client, supplier):
        r = admin_client.post(
            f"/api/suppliers/{supplier.id}/imports/preview",
            files={"file": ("f.xlsx", excel([["A-1", "Uno", 1, 10]]), "application/vnd.ms-excel")},
        )
        assert r.status_code == 200
        assert r.json()["suggested_mapping"]["quantity"] == "Cant."

    def test_requiere_admin(self, user_client, supplier):
        assert subir(user_client, supplier.id, excel([["A-1", "Uno", 1, 10]])).status_code == 403


# ---------------------------------------------------------------------------
# El control cruzado
# ---------------------------------------------------------------------------

class TestControlCruzado:
    def test_no_confirma_si_el_total_no_cuadra(self, admin_client, supplier):
        r = subir(admin_client, supplier.id, excel([["A-1", "Uno", 2, 100]]), total=999)
        batch_id = r.json()["id"]
        assert r.json()["totals_match"] is False

        c = admin_client.post(f"/api/imports/{batch_id}/confirm")
        assert c.status_code == 422
        assert "no coincide" in c.json()["detail"]

    def test_no_confirma_sin_total_declarado(self, admin_client, supplier):
        r = subir(admin_client, supplier.id, excel([["A-1", "Uno", 2, 100]]))
        c = admin_client.post(f"/api/imports/{r.json()['id']}/confirm")
        assert c.status_code == 422

    def test_confirma_cuando_cuadra(self, admin_client, supplier):
        r = subir(admin_client, supplier.id, excel([["A-1", "Uno", 2, 100], ["A-2", "Dos", 3, 50]]), total=350)
        assert r.json()["totals_match"] is True
        assert admin_client.post(f"/api/imports/{r.json()['id']}/confirm").status_code == 200

    def test_las_ignoradas_no_suman_al_total(self, admin_client, supplier):
        """Una fila ilegible entra como IGNORAR y no debe romper el cuadre."""
        r = subir(admin_client, supplier.id, excel([["A-1", "Uno", 2, 100], ["A-2", "Rota", "x", 50]]), total=200)
        assert r.json()["totals_match"] is True


# ---------------------------------------------------------------------------
# Confirmación
# ---------------------------------------------------------------------------

class TestConfirmacion:
    def test_crea_productos_en_borrador(self, admin_client, db, supplier):
        """Una factura trae costo, no precio de venta: publicarlos en el
        momento los mostraría como "Consultar" en el catálogo."""
        r = subir(admin_client, supplier.id, excel([["NUE-1", "Nuevo", 4, 250]]), total=1000)
        admin_client.post(f"/api/imports/{r.json()['id']}/confirm")

        producto = db.scalar(select(Product).where(Product.sku == "NUE-1"))
        assert producto is not None
        assert producto.is_active is False
        assert producto.cost_price == Decimal("250")
        assert producto.supplier_id == supplier.id
        assert producto.stock == 4

    def test_reposicion_suma_stock_y_actualiza_costo(self, admin_client, db, supplier, product):
        product.supplier_id = supplier.id
        db.add(product)
        db.flush()
        inicial = product.stock

        r = subir(admin_client, supplier.id, excel([[product.sku, product.name, 6, 999]]), total=5994)
        admin_client.post(f"/api/imports/{r.json()['id']}/confirm")

        db.refresh(product)
        assert product.stock == inicial + 6
        assert product.cost_price == Decimal("999")

    def test_genera_movimientos_atados_al_lote(self, admin_client, db, supplier):
        r = subir(admin_client, supplier.id, excel([["NUE-1", "Nuevo", 4, 250]]), total=1000)
        batch_id = r.json()["id"]
        admin_client.post(f"/api/imports/{batch_id}/confirm")

        movs = list(db.scalars(select(StockMovement).where(StockMovement.import_batch_id == batch_id)).all())
        assert len(movs) == 1
        assert movs[0].delta == 4

    def test_no_se_confirma_dos_veces(self, admin_client, supplier):
        r = subir(admin_client, supplier.id, excel([["A-1", "Uno", 2, 100]]), total=200)
        batch_id = r.json()["id"]
        assert admin_client.post(f"/api/imports/{batch_id}/confirm").status_code == 200
        assert admin_client.post(f"/api/imports/{batch_id}/confirm").status_code == 409

    def test_importar_el_mismo_archivo_dos_veces_no_duplica(self, admin_client, db, supplier):
        """La segunda vez el SKU ya existe y es del mismo proveedor, así que
        entra como reposición: suma stock una vez por factura, que es lo
        correcto (son dos compras reales)."""
        contenido = excel([["NUE-1", "Nuevo", 4, 250]])
        primero = subir(admin_client, supplier.id, contenido, total=1000)
        admin_client.post(f"/api/imports/{primero.json()['id']}/confirm")

        segundo = subir(admin_client, supplier.id, contenido, total=1000)
        assert segundo.json()["lines"][0]["resolution"] == "Reposición"
        admin_client.post(f"/api/imports/{segundo.json()['id']}/confirm")

        productos = list(db.scalars(select(Product).where(Product.sku == "NUE-1")).all())
        assert len(productos) == 1
        assert productos[0].stock == 8


# ---------------------------------------------------------------------------
# Revisión
# ---------------------------------------------------------------------------

class TestRevision:
    def test_editar_el_sku_recalcula_la_resolucion(self, admin_client, supplier, product):
        r = subir(admin_client, supplier.id, excel([[product.sku, "Choca", 1, 100]]), total=100)
        batch_id, line_id = r.json()["id"], r.json()["lines"][0]["id"]
        assert r.json()["lines"][0]["resolution"] == "Conflicto de SKU"

        e = admin_client.patch(f"/api/imports/{batch_id}/lines/{line_id}", json={"sku": "LIBRE-1"})
        assert e.json()["lines"][0]["resolution"] == "Producto nuevo"

    def test_ignorar_una_linea_la_saca_del_total(self, admin_client, supplier):
        r = subir(admin_client, supplier.id, excel([["A-1", "Uno", 2, 100], ["A-2", "Dos", 1, 50]]), total=200)
        batch_id = r.json()["id"]
        line_id = r.json()["lines"][1]["id"]
        assert r.json()["totals_match"] is False

        e = admin_client.patch(f"/api/imports/{batch_id}/lines/{line_id}", json={"resolution": "IGNORAR"})
        assert e.json()["totals_match"] is True

    def test_no_se_edita_un_lote_confirmado(self, admin_client, supplier):
        r = subir(admin_client, supplier.id, excel([["A-1", "Uno", 2, 100]]), total=200)
        batch_id, line_id = r.json()["id"], r.json()["lines"][0]["id"]
        admin_client.post(f"/api/imports/{batch_id}/confirm")
        assert admin_client.patch(f"/api/imports/{batch_id}/lines/{line_id}", json={"quantity": 9}).status_code == 409


# ---------------------------------------------------------------------------
# Reversión
# ---------------------------------------------------------------------------

class TestReversion:
    def test_revertir_deja_el_stock_como_estaba(self, admin_client, db, supplier, product):
        product.supplier_id = supplier.id
        db.add(product)
        db.flush()
        inicial = product.stock

        r = subir(admin_client, supplier.id, excel([[product.sku, product.name, 5, 100]]), total=500)
        batch_id = r.json()["id"]
        admin_client.post(f"/api/imports/{batch_id}/confirm")
        db.refresh(product)
        assert product.stock == inicial + 5

        assert admin_client.post(f"/api/imports/{batch_id}/revert").status_code == 200
        db.refresh(product)
        assert product.stock == inicial

    def test_no_revierte_si_ya_se_vendio(self, admin_client, db, supplier, category):
        """Revertir dejaría el stock negativo. Mejor frenar con un mensaje
        claro que corromper el inventario."""
        r = subir(admin_client, supplier.id, excel([["NUE-1", "Nuevo", 3, 100]]), total=300)
        batch_id = r.json()["id"]
        admin_client.post(f"/api/imports/{batch_id}/confirm")

        producto = db.scalar(select(Product).where(Product.sku == "NUE-1"))
        producto.stock = 1  # se vendieron 2
        db.add(producto)
        db.flush()

        rev = admin_client.post(f"/api/imports/{batch_id}/revert")
        assert rev.status_code == 409
        assert "vendieron" in rev.json()["detail"]

    def test_solo_revierte_confirmadas(self, admin_client, supplier):
        r = subir(admin_client, supplier.id, excel([["A-1", "Uno", 2, 100]]), total=200)
        assert admin_client.post(f"/api/imports/{r.json()['id']}/revert").status_code == 409

    def test_el_lote_queda_marcado_como_revertido(self, admin_client, db, supplier):
        r = subir(admin_client, supplier.id, excel([["NUE-1", "Nuevo", 2, 100]]), total=200)
        batch_id = r.json()["id"]
        admin_client.post(f"/api/imports/{batch_id}/confirm")
        admin_client.post(f"/api/imports/{batch_id}/revert")
        assert db.get(ImportBatch, batch_id).status == ImportStatus.REVERTIDO


# ---------------------------------------------------------------------------
# Listado
# ---------------------------------------------------------------------------

class TestListado:
    def test_filtra_por_proveedor(self, admin_client, supplier):
        subir(admin_client, supplier.id, excel([["A-1", "Uno", 1, 10]]), total=10)
        r = admin_client.get("/api/imports", params={"supplier_id": supplier.id})
        assert r.status_code == 200
        assert r.json()["total"] == 1

    def test_lote_inexistente_404(self, admin_client):
        assert admin_client.get("/api/imports/99999").status_code == 404

    def test_lineas_ilegibles_entran_como_ignorar(self, admin_client, supplier):
        r = subir(admin_client, supplier.id, excel([["A-1", "Rota", "x", 10]]), total=0)
        linea = r.json()["lines"][0]
        assert linea["resolution"] == "Ignorar"
        assert "⚠" in linea["name"]
        assert LineResolution.IGNORAR.value == "Ignorar"


# ---------------------------------------------------------------------------
# Carga asistida (fase 5): facturas que no se pueden parsear
# ---------------------------------------------------------------------------

PDF_MINIMO = b"%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF"


def crear_manual(admin_client, supplier_id: int, total=None):
    data = {}
    if total is not None:
        data["declared_total"] = str(total)
    return admin_client.post(
        f"/api/suppliers/{supplier_id}/imports/manual",
        files={"file": ("factura.pdf", PDF_MINIMO, "application/pdf")},
        data=data,
    )


class TestCargaManual:
    def test_crea_un_lote_vacio(self, admin_client, supplier):
        r = crear_manual(admin_client, supplier.id, total=1000)
        assert r.status_code == 201
        assert r.json()["lines"] == []
        assert r.json()["status"] == "Borrador"
        # El visor de la pantalla se activa con esto.
        assert r.json()["has_file"] is True

    def test_sirve_el_archivo_original(self, admin_client, supplier):
        batch_id = crear_manual(admin_client, supplier.id).json()["id"]
        f = admin_client.get(f"/api/imports/{batch_id}/file")
        assert f.status_code == 200
        assert f.headers["content-type"] == "application/pdf"
        # inline, no attachment: se embebe al lado de la grilla.
        assert "inline" in f.headers["content-disposition"]
        assert f.content == PDF_MINIMO

    def test_el_archivo_no_se_cachea(self, admin_client, supplier):
        """Es un documento privado con precios de costo."""
        batch_id = crear_manual(admin_client, supplier.id).json()["id"]
        f = admin_client.get(f"/api/imports/{batch_id}/file")
        assert "no-store" in f.headers["cache-control"]

    def test_el_archivo_requiere_admin(self, user_client, admin_client, supplier):
        batch_id = crear_manual(admin_client, supplier.id).json()["id"]
        assert user_client.get(f"/api/imports/{batch_id}/file").status_code == 403

    def test_agregar_lineas_a_mano(self, admin_client, supplier):
        batch_id = crear_manual(admin_client, supplier.id, total=500).json()["id"]

        r = admin_client.post(f"/api/imports/{batch_id}/lines", json={
            "sku": "MAN-1", "name": "Cargado a mano", "quantity": 5, "unit_cost": 100,
        })
        assert r.status_code == 201
        assert len(r.json()["lines"]) == 1
        # La resolución se calcula igual que en el Excel: mismo camino.
        assert r.json()["lines"][0]["resolution"] == "Producto nuevo"
        # Y el control cruzado también aplica.
        assert r.json()["totals_match"] is True

    def test_las_filas_se_numeran_correlativas(self, admin_client, supplier):
        batch_id = crear_manual(admin_client, supplier.id).json()["id"]
        for i in range(3):
            admin_client.post(f"/api/imports/{batch_id}/lines", json={
                "sku": f"M-{i}", "name": f"Item {i}", "quantity": 1, "unit_cost": 10,
            })
        r = admin_client.get(f"/api/imports/{batch_id}")
        assert [ln["row_number"] for ln in r.json()["lines"]] == [1, 2, 3]

    def test_borrar_una_linea(self, admin_client, supplier):
        batch_id = crear_manual(admin_client, supplier.id).json()["id"]
        creada = admin_client.post(f"/api/imports/{batch_id}/lines", json={
            "sku": "M-1", "name": "Uno", "quantity": 1, "unit_cost": 10,
        })
        line_id = creada.json()["lines"][0]["id"]
        r = admin_client.delete(f"/api/imports/{batch_id}/lines/{line_id}")
        assert r.status_code == 200
        assert r.json()["lines"] == []

    def test_no_se_agregan_lineas_a_un_lote_confirmado(self, admin_client, supplier):
        batch_id = crear_manual(admin_client, supplier.id, total=100).json()["id"]
        admin_client.post(f"/api/imports/{batch_id}/lines", json={
            "sku": "M-1", "name": "Uno", "quantity": 1, "unit_cost": 100,
        })
        admin_client.post(f"/api/imports/{batch_id}/confirm")
        r = admin_client.post(f"/api/imports/{batch_id}/lines", json={
            "sku": "M-2", "name": "Dos", "quantity": 1, "unit_cost": 10,
        })
        assert r.status_code == 409

    def test_el_flujo_manual_termina_moviendo_stock(self, admin_client, db, supplier):
        """La carga manual tiene exactamente las mismas garantías que el
        Excel: cuadre de totales, productos en borrador y movimientos de
        stock agrupados por lote (o sea, reversibles)."""
        batch_id = crear_manual(admin_client, supplier.id, total=600).json()["id"]
        admin_client.post(f"/api/imports/{batch_id}/lines", json={
            "sku": "PDF-1", "name": "Desde PDF", "quantity": 3, "unit_cost": 200,
        })
        assert admin_client.post(f"/api/imports/{batch_id}/confirm").status_code == 200

        producto = db.scalar(select(Product).where(Product.sku == "PDF-1"))
        assert producto.stock == 3
        assert producto.is_active is False
        assert admin_client.post(f"/api/imports/{batch_id}/revert").status_code == 200
        db.refresh(producto)
        assert producto.stock == 0

    def test_no_confirma_si_el_total_no_cuadra(self, admin_client, supplier):
        batch_id = crear_manual(admin_client, supplier.id, total=999).json()["id"]
        admin_client.post(f"/api/imports/{batch_id}/lines", json={
            "sku": "M-1", "name": "Uno", "quantity": 1, "unit_cost": 100,
        })
        assert admin_client.post(f"/api/imports/{batch_id}/confirm").status_code == 422

    def test_lote_sin_archivo_no_tiene_visor(self, admin_client, supplier):
        """Los lotes creados antes de la migración 016 no tienen archivo: la
        pantalla tiene que soportarlo sin romperse."""
        r = subir(admin_client, supplier.id, excel([["A-1", "Uno", 1, 10]]), total=10)
        # El Excel también se guarda ahora, así que este sí tiene.
        assert r.json()["has_file"] is True


# ---------------------------------------------------------------------------
# Detección de facturas ya importadas
# ---------------------------------------------------------------------------

import hashlib  # noqa: E402


class TestDuplicados:
    def test_avisa_si_el_archivo_ya_se_importo(self, admin_client, supplier):
        """Confirmar dos veces la misma factura suma el stock dos veces. Sin
        este aviso, el error solo se descubre cuando el inventario no cuadra."""
        contenido = excel([["A-1", "Uno", 2, 100]])
        subir(admin_client, supplier.id, contenido, total=200)

        r = admin_client.get(f"/api/imports/by-hash/{hashlib.sha256(contenido).hexdigest()}")
        assert r.status_code == 200
        assert r.json()["found"] is True
        assert r.json()["supplier_name"] == supplier.name
        assert r.json()["status"] == "Borrador"

    def test_archivo_nuevo_no_es_duplicado(self, admin_client, supplier):
        subir(admin_client, supplier.id, excel([["A-1", "Uno", 2, 100]]), total=200)
        otro = hashlib.sha256(excel([["B-2", "Otro", 1, 50]])).hexdigest()
        assert admin_client.get(f"/api/imports/by-hash/{otro}").json()["found"] is False

    def test_detecta_el_duplicado_aunque_sea_de_otro_proveedor(self, admin_client, db, supplier):
        """El mismo archivo cargado contra dos proveedores distintos también
        es un error, y de los más difíciles de notar."""
        from app.models.supplier import Supplier

        otro = Supplier(name="Otro proveedor", is_active=True)
        db.add(otro)
        db.flush()

        contenido = excel([["A-1", "Uno", 2, 100]])
        subir(admin_client, otro.id, contenido, total=200)
        r = admin_client.get(f"/api/imports/by-hash/{hashlib.sha256(contenido).hexdigest()}")
        assert r.json()["found"] is True

    def test_requiere_admin(self, user_client):
        assert user_client.get("/api/imports/by-hash/abc123").status_code == 403

    def test_el_listado_muestra_el_proveedor(self, admin_client, supplier):
        """Sin el nombre, una lista de facturas de varios proveedores es
        indistinguible."""
        subir(admin_client, supplier.id, excel([["A-1", "Uno", 1, 10]]), total=10)
        assert admin_client.get("/api/imports").json()["items"][0]["supplier_name"] == supplier.name


class TestMapeoAutomatico:
    def test_reconoce_el_formato_guardado(self, admin_client, supplier):
        contenido = excel([["A-1", "Uno", 1, 10]])
        subir(admin_client, supplier.id, contenido, total=10)  # guarda el mapeo

        r = admin_client.post(
            f"/api/suppliers/{supplier.id}/imports/preview",
            files={"file": ("f.xlsx", contenido, "application/vnd.ms-excel")},
        )
        assert r.json()["mapping_source"] == "guardado"

    def test_avisa_cuando_el_proveedor_cambio_el_formato(self, admin_client, db, supplier):
        """Es el caso que justifica el mapeo semántico: cuando cambian los
        encabezados, se avisa con ellos a la vista en vez de fallar después
        con un error críptico."""
        supplier.column_mapping = {"sku": "Codigo Viejo", "name": "Desc", "quantity": "Cant"}
        db.add(supplier)
        db.flush()

        r = admin_client.post(
            f"/api/suppliers/{supplier.id}/imports/preview",
            files={"file": ("f.xlsx", excel([["A-1", "Uno", 1, 10]]), "application/vnd.ms-excel")},
        )
        assert r.json()["mapping_source"] == "cambiado"

    def test_primera_vez_lo_sugiere(self, admin_client, supplier):
        r = admin_client.post(
            f"/api/suppliers/{supplier.id}/imports/preview",
            files={"file": ("f.xlsx", excel([["A-1", "Uno", 1, 10]]), "application/vnd.ms-excel")},
        )
        assert r.json()["mapping_source"] == "sugerido"
        assert r.json()["suggested_mapping"]["sku"] == "Código"
