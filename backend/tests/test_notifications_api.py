"""
Endpoints de notificaciones.

Lo más importante que se prueba acá es el aislamiento: que no exista forma de
ver ni de tocar las notificaciones de otra persona. Los endpoints no aceptan un
`user_id`, así que el aislamiento no depende de una validación que pueda estar
mal escrita -- pero igual se verifica, porque es la clase de cosa que una
refactorización futura puede romper sin darse cuenta.
"""

from app.core import notify
from app.models.notification import Notification, NotificationType

BASE = "/api/notifications"


def _crear(db, user_id, titulo="Aviso", leida=False):
    n = notify.notificar(
        db, user_id=user_id, tipo=NotificationType.ORDER_STATUS, titulo=titulo
    )
    if leida:
        from datetime import datetime, timezone

        n.read_at = datetime.now(timezone.utc)
        db.add(n)
        db.flush()
    return n


class TestAuth:
    def test_todo_requiere_sesion(self, client):
        assert client.get(BASE).status_code == 401
        assert client.get(f"{BASE}/unread-count").status_code == 401
        assert client.patch(f"{BASE}/read-all").status_code == 401


class TestListar:
    def test_devuelve_las_propias_mas_recientes_primero(self, user_client, db, user):
        _crear(db, user.id, "vieja")
        _crear(db, user.id, "nueva")

        data = user_client.get(BASE).json()
        assert data["total"] == 2
        assert [i["title"] for i in data["items"]] == ["nueva", "vieja"]

    def test_no_devuelve_las_de_otra_persona(self, user_client, db, user, admin):
        _crear(db, user.id, "mía")
        _crear(db, admin.id, "del admin")

        data = user_client.get(BASE).json()
        assert data["total"] == 1
        assert data["items"][0]["title"] == "mía"

    def test_filtra_solo_no_leidas(self, user_client, db, user):
        _crear(db, user.id, "sin leer")
        _crear(db, user.id, "leída", leida=True)

        assert user_client.get(BASE).json()["total"] == 2
        assert user_client.get(BASE, params={"unread_only": True}).json()["total"] == 1

    def test_trae_el_contador_junto_con_la_lista(self, user_client, db, user):
        """Así abrir el panel no necesita una segunda request."""
        _crear(db, user.id)
        _crear(db, user.id, leida=True)

        data = user_client.get(BASE).json()
        assert data["total"] == 2
        assert data["unread"] == 1

    def test_no_expone_el_user_id(self, user_client, db, user):
        """No aporta nada -- el endpoint ya devuelve solo las propias -- y es un
        dato de más viajando en cada respuesta."""
        _crear(db, user.id)
        assert "user_id" not in user_client.get(BASE).json()["items"][0]


class TestContador:
    def test_cuenta_solo_las_no_leidas_propias(self, user_client, db, user, admin):
        _crear(db, user.id)
        _crear(db, user.id, leida=True)
        _crear(db, admin.id)

        assert user_client.get(f"{BASE}/unread-count").json()["unread"] == 1


class TestMarcarLeida:
    def test_marca_una(self, user_client, db, user):
        n = _crear(db, user.id)
        r = user_client.patch(f"{BASE}/{n.id}/read")
        assert r.status_code == 200
        assert r.json()["read_at"] is not None

    def test_es_idempotente_y_no_mueve_la_fecha(self, user_client, db, user):
        """`read_at` dice cuándo la vio por primera vez. Marcarla de nuevo no
        puede reescribir ese dato."""
        n = _crear(db, user.id)
        primera = user_client.patch(f"{BASE}/{n.id}/read").json()["read_at"]
        segunda = user_client.patch(f"{BASE}/{n.id}/read").json()["read_at"]
        assert primera == segunda

    def test_la_de_otra_persona_da_404_y_no_403(self, user_client, db, admin):
        """404 a propósito: un 403 le confirmaría a quien prueba IDs al azar que
        ese registro existe."""
        ajena = _crear(db, admin.id)
        assert user_client.patch(f"{BASE}/{ajena.id}/read").status_code == 404

    def test_y_no_la_marca(self, user_client, db, admin):
        ajena = _crear(db, admin.id)
        user_client.patch(f"{BASE}/{ajena.id}/read")
        db.refresh(ajena)
        assert ajena.read_at is None

    def test_inexistente_da_404(self, user_client):
        assert user_client.patch(f"{BASE}/999999/read").status_code == 404


class TestMarcarTodas:
    def test_marca_todas_las_propias(self, user_client, db, user):
        _crear(db, user.id)
        _crear(db, user.id)

        assert user_client.patch(f"{BASE}/read-all").json()["unread"] == 0
        assert user_client.get(f"{BASE}/unread-count").json()["unread"] == 0

    def test_no_toca_las_de_otra_persona(self, user_client, db, user, admin):
        _crear(db, user.id)
        ajena = _crear(db, admin.id)

        user_client.patch(f"{BASE}/read-all")

        db.refresh(ajena)
        assert ajena.read_at is None

    def test_sin_notificaciones_no_rompe(self, user_client):
        assert user_client.patch(f"{BASE}/read-all").json()["unread"] == 0


class TestBorradoEnCascada:
    def test_al_borrar_el_usuario_se_van_sus_notificaciones(self, db, user):
        """El FK es ON DELETE CASCADE: sin eso quedarían filas huérfanas
        apuntando a un usuario que no existe.

        Se consulta con un COUNT y no con `db.get()`: `get()` devuelve el objeto
        del identity map de la sesión sin ir a la base, así que pasaría igual
        aunque la fila siguiera ahí. Hay que preguntarle a Postgres/SQLite.
        """
        from sqlalchemy import func, select

        n_id = _crear(db, user.id).id
        db.delete(user)
        db.flush()
        db.expunge_all()

        quedan = db.scalar(
            select(func.count()).select_from(Notification).where(Notification.id == n_id)
        )
        assert quedan == 0
