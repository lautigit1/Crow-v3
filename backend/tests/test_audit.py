"""
Tests for audit log endpoint:
  - GET /api/audit (admin-only, filtros por action/actor_id, paginación, orden)

No hay endpoint de creación pública -- las filas se insertan directo con
el fixture `db` para armar cada escenario.
"""
from datetime import datetime, timedelta, timezone

from app.models.audit import AuditLog

BASE = "/api/audit"


def _log(db, **overrides) -> AuditLog:
    # created_at explícito -- server_default=func.now() tiene resolución de
    # segundo en SQLite, así que dos inserts rápidos podrían empatar y el
    # test de orden quedaría flaky si dependiéramos del default.
    defaults = dict(
        action="product.create",
        entity="product",
        entity_id="1",
        created_at=datetime.now(timezone.utc),
    )
    defaults.update(overrides)
    entry = AuditLog(**defaults)
    db.add(entry)
    db.flush()
    return entry


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------

class TestAuditAuth:
    def test_list_requires_auth(self, client):
        r = client.get(BASE)
        assert r.status_code == 401

    def test_list_requires_admin(self, user_client):
        r = user_client.get(BASE)
        assert r.status_code == 403


# ---------------------------------------------------------------------------
# List
# ---------------------------------------------------------------------------

class TestListAudit:
    def test_list_shows_own_login_when_nothing_else_happened(self, admin_client):
        # El propio login del admin_client ya generó un login.success --
        # no hay forma de tener el audit log realmente vacío una vez que
        # alguien se autenticó (y está bien que así sea).
        r = admin_client.get(BASE)
        assert r.status_code == 200
        data = r.json()
        assert data["total"] == 1
        assert data["items"][0]["action"] == "login.success"

    def test_list_returns_entries(self, admin_client, db):
        baseline = admin_client.get(BASE).json()["total"]  # 1, por el login del fixture
        _log(db, action="login.success")
        _log(db, action="product.create")
        r = admin_client.get(BASE)
        assert r.status_code == 200
        data = r.json()
        assert data["total"] == baseline + 2
        assert len(data["items"]) == baseline + 2

    def test_filter_by_action_prefix(self, admin_client, db):
        baseline = admin_client.get(BASE, params={"action": "login"}).json()["total"]
        _log(db, action="login.success")
        _log(db, action="login.failure")
        _log(db, action="product.create")
        r = admin_client.get(BASE, params={"action": "login"})
        data = r.json()
        actions = [item["action"] for item in data["items"]]
        assert data["total"] == baseline + 2
        assert "login.success" in actions
        assert "login.failure" in actions
        assert "product.create" not in actions

    def test_filter_by_actor_id(self, admin_client, db, user, admin):
        _log(db, action="user.update", actor_id=user.id, actor_email=user.email)
        _log(db, action="user.update", actor_id=admin.id, actor_email=admin.email)
        r = admin_client.get(BASE, params={"actor_id": user.id})
        data = r.json()
        assert data["total"] == 1
        assert data["items"][0]["actor_id"] == user.id

    def test_ordering_most_recent_first(self, admin_client, db):
        now = datetime.now(timezone.utc)
        first = _log(db, action="product.create", detail="primero", created_at=now - timedelta(minutes=5))
        second = _log(db, action="product.update", detail="segundo", created_at=now)
        r = admin_client.get(BASE)
        items = r.json()["items"]
        # El más reciente va primero
        assert items[0]["detail"] == "segundo"
        assert items[-1]["detail"] == "primero"
        assert first.id != second.id  # sanity check, filas distintas

    def test_pagination(self, admin_client, db):
        baseline = admin_client.get(BASE).json()["total"]  # 1, por el login del fixture
        for i in range(5):
            _log(db, action="product.create", detail=f"entry-{i}")
        r = admin_client.get(BASE, params={"skip": 0, "limit": 2})
        data = r.json()
        assert data["total"] == baseline + 5
        assert len(data["items"]) == 2

    def test_entry_has_expected_fields(self, admin_client, db):
        _log(db, action="product.delete", entity="product", entity_id="42", detail="Filtro de aceite")
        r = admin_client.get(BASE)
        item = r.json()["items"][0]
        assert item["action"] == "product.delete"
        assert item["entity"] == "product"
        assert item["entity_id"] == "42"
        assert item["detail"] == "Filtro de aceite"
        assert "created_at" in item
