"""
Tests for user endpoints:
  - GET /me (own profile)
  - PATCH /me (update profile)
  - POST /me/password (change password)
  - Admin: list, update role/status, delete
  - Protecciones: no borrar propio admin, no cambiar propio rol
"""
from app.core.security import hash_password
from app.models.user import User, UserRole

BASE = "/api/users"


# ---------------------------------------------------------------------------
# GET /me
# ---------------------------------------------------------------------------

class TestGetProfile:
    def test_returns_own_profile(self, user_client, user):
        r = user_client.get(f"{BASE}/me")
        assert r.status_code == 200
        assert r.json()["email"] == user.email

    def test_requires_auth(self, client):
        r = client.get(f"{BASE}/me")
        assert r.status_code == 401


# ---------------------------------------------------------------------------
# PATCH /me
# ---------------------------------------------------------------------------

class TestUpdateProfile:
    def test_user_can_update_name(self, user_client, user):
        r = user_client.patch(f"{BASE}/me", json={"full_name": "Nombre Nuevo"})
        assert r.status_code == 200
        assert r.json()["full_name"] == "Nombre Nuevo"

    def test_user_can_update_phone(self, user_client):
        r = user_client.patch(f"{BASE}/me", json={"phone": "2614009999"})
        assert r.status_code == 200
        assert r.json()["phone"] == "2614009999"

    def test_requires_auth(self, client):
        r = client.patch(f"{BASE}/me", json={"full_name": "X"})
        assert r.status_code == 401


# ---------------------------------------------------------------------------
# POST /me/password
# ---------------------------------------------------------------------------

class TestChangePassword:
    def test_change_password_success(self, user_client):
        r = user_client.post(
            f"{BASE}/me/password",
            json={"current_password": "Password1!", "new_password": "NewPassword2@"},
        )
        assert r.status_code == 204

    def test_wrong_current_password(self, user_client):
        r = user_client.post(
            f"{BASE}/me/password",
            json={"current_password": "wrong", "new_password": "NewPassword2@"},
        )
        assert r.status_code == 400

    def test_weak_new_password(self, user_client):
        r = user_client.post(
            f"{BASE}/me/password",
            json={"current_password": "Password1!", "new_password": "weak"},
        )
        assert r.status_code == 422

    def test_requires_auth(self, client):
        r = client.post(
            f"{BASE}/me/password",
            json={"current_password": "Password1!", "new_password": "NewPassword2@"},
        )
        assert r.status_code == 401


# ---------------------------------------------------------------------------
# Admin: list users
# ---------------------------------------------------------------------------

class TestListUsers:
    def test_admin_can_list(self, admin_client, user):
        r = admin_client.get(BASE)
        assert r.status_code == 200
        data = r.json()
        assert "items" in data and "total" in data
        assert data["total"] >= 2  # admin + user

    def test_list_requires_admin(self, user_client):
        r = user_client.get(BASE)
        assert r.status_code == 403

    def test_list_requires_auth(self, client):
        r = client.get(BASE)
        assert r.status_code == 401


# ---------------------------------------------------------------------------
# Admin: update user
# ---------------------------------------------------------------------------

class TestAdminUpdateUser:
    def test_admin_can_deactivate_user(self, admin_client, user):
        r = admin_client.patch(f"{BASE}/{user.id}", json={"is_active": False})
        assert r.status_code == 200
        assert r.json()["is_active"] is False

    def test_admin_can_promote_to_admin(self, admin_client, user):
        r = admin_client.patch(f"{BASE}/{user.id}", json={"role": "ADMIN"})
        assert r.status_code == 200
        assert r.json()["role"] == "ADMIN"

    def test_admin_cannot_change_own_role(self, admin_client, admin):
        r = admin_client.patch(f"{BASE}/{admin.id}", json={"role": "USER"})
        assert r.status_code == 400

    def test_update_nonexistent(self, admin_client):
        r = admin_client.patch(f"{BASE}/99999", json={"is_active": False})
        assert r.status_code == 404

    def test_update_requires_admin(self, user_client, user):
        r = user_client.patch(f"{BASE}/{user.id}", json={"is_active": False})
        assert r.status_code == 403


# ---------------------------------------------------------------------------
# Admin: delete user
# ---------------------------------------------------------------------------

class TestDeleteUser:
    def test_admin_can_delete_user(self, admin_client, db):
        u = User(
            full_name="Para Borrar",
            email="delete_me@test.com",
            hashed_password=hash_password("Password1!"),
            role=UserRole.USER,
            is_active=True,
        )
        db.add(u)
        db.flush()
        r = admin_client.delete(f"{BASE}/{u.id}")
        assert r.status_code == 204

    def test_admin_cannot_delete_self(self, admin_client, admin):
        r = admin_client.delete(f"{BASE}/{admin.id}")
        assert r.status_code == 400

    def test_delete_nonexistent(self, admin_client):
        r = admin_client.delete(f"{BASE}/99999")
        assert r.status_code == 404

    def test_delete_requires_admin(self, user_client, user):
        r = user_client.delete(f"{BASE}/{user.id}")
        assert r.status_code == 403
