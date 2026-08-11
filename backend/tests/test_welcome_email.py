"""
El correo de bienvenida.

No existía: el registro creaba el usuario y no mandaba nada. Lo que se prueba
acá es sobre todo **que no pueda voltear un registro**: el correo es un extra y
la cuenta es lo que la persona vino a hacer.
"""

from app.core.email import build_welcome_email
from app.models.setting import Setting

BASE = "/api/auth"


def _registro(**over):
    return {
        "full_name": "Juan Pérez",
        "email": "nuevo.cliente@test.com",
        "password": "Password1!",
        "phone": "261 660-0569",
        **over,
    }


class TestSeEnvia:
    def test_registrarse_dispara_la_bienvenida(self, client, monkeypatch):
        enviados = []
        monkeypatch.setattr("app.core.email.send_email", lambda **kw: enviados.append(kw))

        r = client.post(f"{BASE}/register", json=_registro())

        assert r.status_code == 201
        assert len(enviados) == 1
        assert enviados[0]["to"] == "nuevo.cliente@test.com"
        assert "Bienvenido" in enviados[0]["subject"]

    def test_saluda_por_el_nombre_de_pila(self, client, monkeypatch):
        enviados = []
        monkeypatch.setattr("app.core.email.send_email", lambda **kw: enviados.append(kw))

        client.post(f"{BASE}/register", json=_registro(full_name="Juan Pérez"))

        assert "Juan" in enviados[0]["html"]

    def test_un_smtp_caido_no_voltea_el_registro(self, client, db, monkeypatch):
        """El correo es un extra; la cuenta es lo que la persona vino a hacer.

        Además corre después de la respuesta: si la excepción escapara, no
        llegaría a nadie -- quedaría como un error sin dueño en los logs.
        """
        def explota(**kw):
            raise RuntimeError("connection refused")

        monkeypatch.setattr("app.core.email.send_email", explota)

        r = client.post(f"{BASE}/register", json=_registro(email="pese.al.smtp@test.com"))

        assert r.status_code == 201
        from sqlalchemy import select

        from app.models.user import User

        assert db.scalar(select(User).where(User.email == "pese.al.smtp@test.com")) is not None

    def test_un_registro_rechazado_no_manda_nada(self, client, user, monkeypatch):
        """Email ya registrado: no hay cuenta nueva, no hay a quién dar la
        bienvenida."""
        enviados = []
        monkeypatch.setattr("app.core.email.send_email", lambda **kw: enviados.append(kw))

        r = client.post(f"{BASE}/register", json=_registro(email=user.email))

        assert r.status_code == 409
        assert enviados == []


class TestWhatsApp:
    def test_usa_el_numero_configurado_en_el_panel(self, client, db, monkeypatch):
        """Es editable desde Configuración: un correo de bienvenida con un
        WhatsApp viejo es peor que no mandarlo."""
        db.add(Setting(key="whatsapp_number", value="5492610000001"))
        db.flush()
        enviados = []
        monkeypatch.setattr("app.core.email.send_email", lambda **kw: enviados.append(kw))

        client.post(f"{BASE}/register", json=_registro(email="con.wa@test.com"))

        assert "wa.me/5492610000001" in enviados[0]["html"]

    def test_sin_fila_en_la_base_cae_al_default(self, client, monkeypatch):
        enviados = []
        monkeypatch.setattr("app.core.email.send_email", lambda **kw: enviados.append(kw))

        client.post(f"{BASE}/register", json=_registro(email="sin.wa@test.com"))

        assert "wa.me/5492616600569" in enviados[0]["html"]


class TestContenido:
    def test_explica_como_funciona_el_negocio(self):
        correo = build_welcome_email(to="a@b.com", name="Juan", whatsapp_number="549261")

        # Los tres pasos: cotizamos, traemos a pedido, el pago se coordina.
        # Es la mitad de la razón por la que el correo existe.
        for texto in ("cotizamos", "vehículo", "WhatsApp"):
            assert texto in correo["html"]

    def test_la_version_de_texto_dice_lo_mismo_y_se_usa_sola(self):
        correo = build_welcome_email(to="a@b.com", name="Juan", whatsapp_number="549261")

        # Un correo que viaja solo como HTML puntúa peor en los filtros de spam,
        # y hay clientes que muestran esta versión.
        assert "wa.me/549261" in correo["text"]
        assert "/catalogo" in correo["text"]
        assert "Juan" in correo["text"]

    def test_no_promete_una_verificacion_que_no_hacemos(self):
        """No hay verificación de dirección: la cuenta funciona desde el
        registro. Decir "confirmá tu correo" sería mentir sobre un paso que no
        existe -- y dejaría a la gente esperando poder entrar."""
        correo = build_welcome_email(to="a@b.com", name="Juan", whatsapp_number="549261")

        for prohibido in ("Confirmá tu", "Verificá tu", "activar tu cuenta"):
            assert prohibido not in correo["html"]
