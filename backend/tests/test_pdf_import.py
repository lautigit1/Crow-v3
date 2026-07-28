"""
Tests de la extracción de líneas desde facturas en PDF.

Se generan PDF de verdad con reportlab, con una tabla dibujada como la de una
factura real. Igual que con el Excel: el 90% de los problemas están en leer
un archivo real, y un mock los esconde a todos.

La regla que gobierna todo este módulo: **una extracción que falla nunca es
un error duro**. Si el PDF es un escaneo, o la maqueta es rara, o pdfplumber
se confunde, el lote queda vacío y las líneas se cargan a mano con el
documento al lado. Perder la extracción es un inconveniente; romper la subida
dejaría al usuario sin forma de cargar la factura.
"""

from io import BytesIO

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle
from sqlalchemy import select

from app.core.pdf_import import extraer_filas, tiene_capa_de_texto
from app.models.product import Product

PDF_SIN_TEXTO = b"%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF"


def pdf_factura(filas: list[list[str]], *, con_encabezado: bool = True) -> bytes:
    """Genera un PDF con una tabla con la pinta de una factura."""
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=1 * cm)
    datos = ([["Código", "Descripción", "Cant.", "P. Unitario"]] if con_encabezado else []) + filas
    tabla = Table(datos)
    # Las grillas dibujadas son lo que pdfplumber usa para reconstruir la
    # tabla; una factura emitida por un sistema casi siempre las tiene.
    tabla.setStyle(TableStyle([
        ("GRID", (0, 0), (-1, -1), 0.5, colors.black),
        ("BACKGROUND", (0, 0), (-1, 0), colors.lightgrey),
    ]))
    doc.build([tabla])
    return buffer.getvalue()


def crear_manual_pdf(admin_client, supplier_id: int, contenido: bytes, total=None):
    data = {}
    if total is not None:
        data["declared_total"] = str(total)
    return admin_client.post(
        f"/api/suppliers/{supplier_id}/imports/manual",
        files={"file": ("factura.pdf", contenido, "application/pdf")},
        data=data,
    )


# ---------------------------------------------------------------------------
# Detección de capa de texto
# ---------------------------------------------------------------------------

class TestCapaDeTexto:
    def test_pdf_digital_tiene_texto(self):
        assert tiene_capa_de_texto(pdf_factura([["A-1", "Uno", "1", "10"]])) is True

    def test_pdf_sin_texto_no(self):
        """Un escaneo es una imagen adentro de un PDF: se ve texto pero no
        hay ninguno que extraer."""
        assert tiene_capa_de_texto(PDF_SIN_TEXTO) is False

    def test_archivo_corrupto_no_explota(self):
        assert tiene_capa_de_texto(b"esto no es un pdf") is False


# ---------------------------------------------------------------------------
# Extracción
# ---------------------------------------------------------------------------

class TestExtraccion:
    def test_extrae_las_filas_de_la_tabla(self):
        filas = extraer_filas(pdf_factura([
            ["FRE-100", "Pastillas de freno", "4", "12500"],
            ["AMO-200", "Amortiguador", "2", "38000"],
        ]))
        assert len(filas) == 2
        assert filas[0].sku == "FRE-100"
        assert filas[0].quantity == 4
        assert filas[1].name == "Amortiguador"

    def test_interpreta_el_formato_local(self):
        """Comparte la coerción numérica con el Excel: si divergieran, un
        "1.234,56" se leería distinto según de dónde venga."""
        filas = extraer_filas(pdf_factura([["A-1", "Uno", "3", "1.234,56"]]))
        assert str(filas[0].unit_cost) == "1234.56"

    def test_sin_encabezados_reconocibles_devuelve_vacio(self):
        """No lanza: devuelve vacío y el lote se carga a mano."""
        assert extraer_filas(pdf_factura(
            [["x", "y", "z", "w"]], con_encabezado=False,
        )) == []

    def test_pdf_sin_tablas_devuelve_vacio(self):
        assert extraer_filas(PDF_SIN_TEXTO) == []

    def test_archivo_corrupto_devuelve_vacio(self):
        assert extraer_filas(b"cualquier cosa") == []


# ---------------------------------------------------------------------------
# Integración con la subida
# ---------------------------------------------------------------------------

class TestSubidaPDF:
    def test_el_pdf_se_carga_solo(self, admin_client, supplier):
        r = crear_manual_pdf(admin_client, supplier.id, pdf_factura([
            ["PDF-1", "Filtro de aire", "5", "8000"],
            ["PDF-2", "Bujía", "10", "3200"],
        ]), total=72000)
        assert r.status_code == 201
        assert len(r.json()["lines"]) == 2
        # Y el control cruzado funciona igual que con el Excel.
        assert r.json()["totals_match"] is True

    def test_las_lineas_quedan_marcadas_como_automaticas(self, admin_client, supplier):
        """Una línea leída por una máquina y una tipeada por una persona no
        merecen la misma confianza: la revisión las distingue."""
        r = crear_manual_pdf(admin_client, supplier.id, pdf_factura([["PDF-1", "Uno", "1", "100"]]))
        assert r.json()["lines"][0]["is_auto"] is True

    def test_las_agregadas_a_mano_no_estan_marcadas(self, admin_client, supplier):
        batch_id = crear_manual_pdf(admin_client, supplier.id, PDF_SIN_TEXTO).json()["id"]
        r = admin_client.post(f"/api/imports/{batch_id}/lines", json={
            "sku": "MAN-1", "name": "A mano", "quantity": 1, "unit_cost": 10,
        })
        assert r.json()["lines"][0]["is_auto"] is False

    def test_escaneado_deja_el_lote_vacio_sin_fallar(self, admin_client, supplier):
        """El caso de las facturas escaneadas: la subida tiene que funcionar
        igual, solo que sin líneas."""
        r = crear_manual_pdf(admin_client, supplier.id, PDF_SIN_TEXTO, total=500)
        assert r.status_code == 201
        assert r.json()["lines"] == []
        assert r.json()["has_file"] is True

    def test_se_resuelve_el_sku_igual_que_en_el_excel(self, admin_client, db, supplier, product):
        product.supplier_id = supplier.id
        db.add(product)
        db.flush()
        r = crear_manual_pdf(admin_client, supplier.id, pdf_factura([
            [product.sku, product.name, "3", "100"],
        ]))
        assert r.json()["lines"][0]["resolution"] == "Reposición"

    def test_el_flujo_completo_desde_pdf_mueve_stock(self, admin_client, db, supplier):
        r = crear_manual_pdf(admin_client, supplier.id, pdf_factura([
            ["PDF-STK", "Correa", "6", "5000"],
        ]), total=30000)
        batch_id = r.json()["id"]
        assert admin_client.post(f"/api/imports/{batch_id}/confirm").status_code == 200

        producto = db.scalar(select(Product).where(Product.sku == "PDF-STK"))
        assert producto.stock == 6
        # Sigue entrando en borrador: la factura trae costo, no precio de venta.
        assert producto.is_active is False

    def test_una_extraccion_mal_leida_no_puede_confirmarse(self, admin_client, supplier):
        """La red de seguridad: si pdfplumber leyó mal una cantidad, el total
        no va a cuadrar y la confirmación se bloquea."""
        r = crear_manual_pdf(admin_client, supplier.id, pdf_factura([
            ["PDF-1", "Uno", "5", "100"],
        ]), total=999999)
        assert r.json()["totals_match"] is False
        assert admin_client.post(f"/api/imports/{r.json()['id']}/confirm").status_code == 422
