"""
Tests de la puerta única de notificaciones.

Lo que más importa acá no es que el aviso salga: es que **no pueda voltear la
operación que lo generó**. Un pedido confirmado sin notificar es un
inconveniente; un pedido que no se confirma porque el SMTP rechazó la conexión
es un problema. Por eso hay un test por cada canal que puede fallar.
"""

import pytest

from app.core import events, notify
from app.models.notification import Notification, NotificationType


class TestNotificar:
    def test_inserta_la_fila(self, db, user):
        n = notify.notificar(
            db,
            user_id=user.id,
            tipo=NotificationType.ORDER_STATUS,
            titulo="Tu pedido #7 fue confirmado",
            cuerpo="Verificamos stock y ya lo estamos preparando.",
            enlace="/cuenta/pedidos",
        )
        assert n.id is not None
        assert n.read_at is None  # nace sin leer
        guardada = db.get(Notification, n.id)
        assert guardada.title == "Tu pedido #7 fue confirmado"
        assert guardada.link == "/cuenta/pedidos"

    def test_publica_el_evento_en_el_canal_de_esa_persona(self, db, user, monkeypatch):
        """Es lo que hace que la campana se actualice sin recargar. Y va al canal
        del usuario, no a uno general: el filtrado es del servidor."""
        publicados: list[tuple] = []
        monkeypatch.setattr(
            notify.events, "publicar",
            lambda canales, tipo, **kw: publicados.append((canales, tipo)),
        )

        notify.notificar(
            db, user_id=user.id, tipo=NotificationType.ORDER_STATUS, titulo="x"
        )

        assert publicados == [([events.canal_usuario(user.id)], "notification.created")]

    def test_no_manda_email_si_no_se_pide(self, db, user, monkeypatch):
        enviados = []
        monkeypatch.setattr("app.core.email.send_email", lambda **kw: enviados.append(kw))

        notify.notificar(db, user_id=user.id, tipo=NotificationType.ORDER_STATUS, titulo="x")

        assert enviados == []

    def test_manda_email_cuando_se_pide(self, db, user, monkeypatch):
        enviados = []
        monkeypatch.setattr("app.core.email.send_email", lambda **kw: enviados.append(kw))

        notify.notificar(
            db, user_id=user.id, tipo=NotificationType.ORDER_STATUS, titulo="x",
            email={"to": "a@b.com", "subject": "s", "html": "<p>h</p>", "text": "t"},
        )

        assert len(enviados) == 1
        assert enviados[0]["to"] == "a@b.com"

    def test_difiere_el_evento_y_el_email_al_background(self, db, user):
        """Las dos cosas se difieren, por razones distintas.

        El **email**, para que el cliente no espere al SMTP dentro de su propia
        request.

        El **evento**, porque es una señal que dice "andá a buscar los datos": si
        se publica antes de que la transacción confirme, el navegador pregunta y
        todavía no hay nada, y como no llega un segundo evento la campana se
        queda en cero para siempre. Las tareas de background corren después de
        que `get_db` hizo commit.
        """
        class FakeBackground:
            def __init__(self):
                self.tareas = []

            def add_task(self, fn, *args, **kw):
                self.tareas.append((fn, args, kw))

        bg = FakeBackground()
        notify.notificar(
            db, user_id=user.id, tipo=NotificationType.ORDER_STATUS, titulo="x",
            email={"to": "a@b.com", "subject": "s", "html": "h", "text": "t"},
            background=bg,
        )

        assert len(bg.tareas) == 2
        destinatarios = [kw.get("to") for _fn, _a, kw in bg.tareas]
        assert "a@b.com" in destinatarios

    def test_sin_email_solo_difiere_el_evento(self, db, user):
        class FakeBackground:
            def __init__(self):
                self.tareas = []

            def add_task(self, fn, *args, **kw):
                self.tareas.append((fn, args, kw))

        bg = FakeBackground()
        notify.notificar(
            db, user_id=user.id, tipo=NotificationType.ORDER_STATUS, titulo="x", background=bg
        )
        assert len(bg.tareas) == 1


class TestNoPuedeVoltearLaOperacion:
    """Los tres tests que justifican los try/except de notify.py."""

    def test_si_falla_el_evento_la_notificacion_igual_queda(self, db, user, monkeypatch):
        def explota(*_a, **_kw):
            raise RuntimeError("redis caído")

        monkeypatch.setattr(notify.events, "publicar", explota)

        n = notify.notificar(
            db, user_id=user.id, tipo=NotificationType.ORDER_STATUS, titulo="x"
        )
        assert db.get(Notification, n.id) is not None

    def test_si_falla_el_email_la_notificacion_igual_queda(self, db, user, monkeypatch):
        def explota(**_kw):
            raise RuntimeError("smtp rechazó la conexión")

        monkeypatch.setattr("app.core.email.send_email", explota)

        n = notify.notificar(
            db, user_id=user.id, tipo=NotificationType.ORDER_STATUS, titulo="x",
            email={"to": "a@b.com", "subject": "s", "html": "h", "text": "t"},
        )
        assert db.get(Notification, n.id) is not None

    def test_fallan_los_dos_y_no_propaga(self, db, user, monkeypatch):
        monkeypatch.setattr(
            notify.events, "publicar",
            lambda *a, **kw: (_ for _ in ()).throw(RuntimeError("redis")),
        )
        monkeypatch.setattr(
            "app.core.email.send_email",
            lambda **kw: (_ for _ in ()).throw(RuntimeError("smtp")),
        )

        # No debe tirar.
        notify.notificar(
            db, user_id=user.id, tipo=NotificationType.ORDER_STATUS, titulo="x",
            email={"to": "a@b.com", "subject": "s", "html": "h", "text": "t"},
        )


class TestNotificarAAdmins:
    def test_cada_admin_recibe_su_propia_fila(self, db, admin, user):
        """Que uno lo haya leído no puede marcarlo como leído para el resto: son
        dos personas distintas. Por eso no existe una notificación "de rol"."""
        from app.core.security import hash_password
        from app.models.user import User, UserRole

        otro = User(
            full_name="Segundo Admin", email="admin2@test.com",
            hashed_password=hash_password("x"), role=UserRole.ADMIN, is_active=True,
        )
        db.add(otro)
        db.flush()

        creadas = notify.notificar_a_admins(
            db, tipo=NotificationType.ORDER_STATUS, titulo="Pedido nuevo #9"
        )

        destinatarios = {n.user_id for n in creadas}
        assert {admin.id, otro.id} <= destinatarios
        # Y el cliente NO recibe avisos de admin.
        assert user.id not in destinatarios

    def test_no_notifica_a_un_admin_inactivo(self, db, admin):
        admin.is_active = False
        db.add(admin)
        db.flush()

        creadas = notify.notificar_a_admins(
            db, tipo=NotificationType.ORDER_STATUS, titulo="x"
        )
        assert admin.id not in {n.user_id for n in creadas}

    def test_sin_admins_no_rompe(self, db, admin):
        db.delete(admin)
        db.flush()
        assert notify.notificar_a_admins(
            db, tipo=NotificationType.ORDER_STATUS, titulo="x"
        ) == []


@pytest.mark.parametrize("tipo", list(NotificationType))
def test_todos_los_tipos_se_pueden_guardar(db, user, tipo):
    """Barrido: si se agrega un miembro al enum y la migración no lo contempla,
    esto lo agarra antes de que reviente en Postgres."""
    n = notify.notificar(db, user_id=user.id, tipo=tipo, titulo="x")
    assert db.get(Notification, n.id).type is tipo
