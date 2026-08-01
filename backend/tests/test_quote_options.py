"""
Opciones cotizadas: las alternativas que se le ofrecen al cliente.

Lo que más importa acá no es el CRUD sino **el cambio automático de estado**. Que
"Respondida" dependa de que alguien se acuerde de moverlo a mano es la forma
segura de que el cliente nunca se entere de que ya cotizaste — y ese es
justamente el agujero que este change vino a tapar.
"""

import pytest

from app.models.quote import Quote, QuoteOption, QuoteStatus

BASE = "/api/quotes"


@pytest.fixture()
def quote(db):
    q = Quote(
        customer_name="Juan Pérez",
        customer_email="juan@test.com",
        customer_phone="2616600569",
        vehicle="Gol G5 2012",
        message="Necesito pastillas de freno delanteras",
    )
    db.add(q)
    db.flush()
    return q


@pytest.fixture(autouse=True)
def _sin_correo(monkeypatch):
    """Los envíos se capturan: acá no se prueba el correo."""
    monkeypatch.setattr("app.core.email.send_email", lambda **kw: None)


def _opcion(**over):
    return {
        "title": "Original Bosch",
        "detail": "Juego completo",
        "unit_price": 45000,
        "quantity": 1,
        "lead_time": "3 a 5 días hábiles",
        **over,
    }


class TestAgregarOpciones:
    def test_agrega_una_opcion(self, admin_client, quote):
        r = admin_client.post(f"{BASE}/{quote.id}/options", json=_opcion())
        assert r.status_code == 201
        data = r.json()
        assert len(data["options"]) == 1
        assert data["options"][0]["title"] == "Original Bosch"
        assert data["options"][0]["lead_time"] == "3 a 5 días hábiles"

    def test_acepta_varias_alternativas(self, admin_client, quote):
        """Es la razón de ser de la tabla: original, alternativo, usado."""
        admin_client.post(f"{BASE}/{quote.id}/options", json=_opcion(title="Original"))
        admin_client.post(f"{BASE}/{quote.id}/options", json=_opcion(title="Alternativo", unit_price=28000))
        r = admin_client.post(f"{BASE}/{quote.id}/options", json=_opcion(title="Usado", unit_price=15000))

        assert [o["title"] for o in r.json()["options"]] == ["Original", "Alternativo", "Usado"]

    def test_el_plazo_es_texto_libre(self, admin_client, quote):
        """"depende del importador" no entra en un entero de días."""
        r = admin_client.post(
            f"{BASE}/{quote.id}/options",
            json=_opcion(lead_time="depende de si lo tiene el importador"),
        )
        assert r.json()["options"][0]["lead_time"] == "depende de si lo tiene el importador"

    def test_precio_cero_o_negativo_rechazado(self, admin_client, quote):
        assert admin_client.post(f"{BASE}/{quote.id}/options", json=_opcion(unit_price=0)).status_code == 422
        assert admin_client.post(f"{BASE}/{quote.id}/options", json=_opcion(unit_price=-5)).status_code == 422

    def test_requiere_admin(self, user_client, quote):
        assert user_client.post(f"{BASE}/{quote.id}/options", json=_opcion()).status_code == 403

    def test_cotizacion_inexistente(self, admin_client):
        assert admin_client.post(f"{BASE}/999999/options", json=_opcion()).status_code == 404


class TestEstadoAutomatico:
    def test_la_primera_opcion_responde_la_cotizacion(self, admin_client, quote, db):
        assert quote.status == QuoteStatus.NUEVA
        assert quote.answered_at is None

        r = admin_client.post(f"{BASE}/{quote.id}/options", json=_opcion())

        assert r.json()["status"] == "Respondida"
        assert r.json()["answered_at"] is not None

    def test_la_segunda_opcion_no_cambia_la_fecha(self, admin_client, quote):
        """Cargar otra alternativa cinco minutos después no es una respuesta
        nueva: es la misma terminándose de escribir."""
        primera = admin_client.post(f"{BASE}/{quote.id}/options", json=_opcion()).json()
        segunda = admin_client.post(f"{BASE}/{quote.id}/options", json=_opcion(title="Otra")).json()

        assert primera["answered_at"] == segunda["answered_at"]

    def test_el_aviso_al_cliente_sale_una_sola_vez(self, admin_client, quote, db, monkeypatch):
        avisos = []
        monkeypatch.setattr(
            "app.api.routes.quotes._avisar_cotizacion_respondida",
            lambda *a, **kw: avisos.append(1),
        )

        admin_client.post(f"{BASE}/{quote.id}/options", json=_opcion())
        admin_client.post(f"{BASE}/{quote.id}/options", json=_opcion(title="Otra"))
        admin_client.post(f"{BASE}/{quote.id}/options", json=_opcion(title="Otra más"))

        assert len(avisos) == 1


class TestEditarYBorrar:
    def test_edita_una_celda_sin_mandar_toda_la_fila(self, admin_client, quote):
        creada = admin_client.post(f"{BASE}/{quote.id}/options", json=_opcion()).json()
        opcion_id = creada["options"][0]["id"]

        r = admin_client.patch(
            f"{BASE}/{quote.id}/options/{opcion_id}", json={"unit_price": 52000}
        )
        assert r.status_code == 200
        opcion = r.json()["options"][0]
        assert opcion["unit_price"] == 52000
        assert opcion["title"] == "Original Bosch"  # lo demás intacto

    def test_borra_una_opcion(self, admin_client, quote):
        creada = admin_client.post(f"{BASE}/{quote.id}/options", json=_opcion()).json()
        admin_client.post(f"{BASE}/{quote.id}/options", json=_opcion(title="Otra"))
        opcion_id = creada["options"][0]["id"]

        r = admin_client.delete(f"{BASE}/{quote.id}/options/{opcion_id}")
        assert r.status_code == 200
        assert [o["title"] for o in r.json()["options"]] == ["Otra"]

    def test_borrar_la_ultima_no_deshace_la_respuesta(self, admin_client, quote):
        """El cliente ya recibió el aviso; deshacerlo del lado del sistema no
        deshace el correo que salió."""
        creada = admin_client.post(f"{BASE}/{quote.id}/options", json=_opcion()).json()
        opcion_id = creada["options"][0]["id"]

        r = admin_client.delete(f"{BASE}/{quote.id}/options/{opcion_id}")

        assert r.json()["options"] == []
        assert r.json()["status"] == "Respondida"
        assert r.json()["answered_at"] is not None

    def test_opcion_de_otra_cotizacion_da_404(self, admin_client, quote, db):
        otra = Quote(customer_name="X", message="y", vehicle="z")
        db.add(otra)
        db.flush()
        creada = admin_client.post(f"{BASE}/{otra.id}/options", json=_opcion()).json()
        ajena = creada["options"][0]["id"]

        assert admin_client.patch(f"{BASE}/{quote.id}/options/{ajena}", json={"unit_price": 1}).status_code == 404
        assert admin_client.delete(f"{BASE}/{quote.id}/options/{ajena}").status_code == 404


class TestCascade:
    def test_borrar_la_cotizacion_se_lleva_sus_opciones(self, admin_client, quote, db):
        """Sin el cascade quedarían filas huérfanas apuntando a una cotización
        que no existe."""
        from sqlalchemy import func, select

        admin_client.post(f"{BASE}/{quote.id}/options", json=_opcion())
        db.delete(quote)
        db.flush()
        db.expunge_all()

        quedan = db.scalar(
            select(func.count()).select_from(QuoteOption).where(QuoteOption.quote_id == quote.id)
        )
        assert quedan == 0
