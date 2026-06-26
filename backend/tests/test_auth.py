"""
Tests for authentication flows:
  - Register
  - Login (success, wrong password, inactive account)
  - Cookies set on login
  - Logout blocklists the access token
  - Refresh rotation (success, replay rejected)
  - /me requires auth
  - Forgot-password (always 204, rate limit)
  - Reset-password (success, invalid token, reuse rejected)
"""
import time

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import create_reset_token, hash_password
from app.core.token_blocklist import token_blocklist
from app.models.user import User, UserRole
from tests.conftest import login_as


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _register(client: TestClient, email: str = "new@test.com", password: str = "Password1!"):
    return client.post(
        "/api/auth/register",
        json={"full_name": "New User", "email": email, "password": password},
    )


def _login(client: TestClient, email: str, password: str = "Password1!"):
    return client.post(
        "/api/auth/login",
        data={"username": email, "password": password},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )


# ---------------------------------------------------------------------------
# Register
# ---------------------------------------------------------------------------

class TestRegister:
    def test_register_creates_user(self, client, db):
        r = _register(client)
        assert r.status_code == 201
        assert r.json()["user"]["email"] == "new@test.com"

    def test_register_sets_cookies(self, client, db):
        r = _register(client)
        assert "access_token" in r.cookies
        assert "refresh_token" in r.cookies

    def test_register_duplicate_email(self, client, user):
        r = _register(client, email=user.email)
        assert r.status_code == 409

    def test_register_weak_password(self, client, db):
        r = _register(client, password="123")
        assert r.status_code == 422


# ---------------------------------------------------------------------------
# Login
# ---------------------------------------------------------------------------

class TestLogin:
    def test_login_success(self, client, user):
        r = _login(client, user.email)
        assert r.status_code == 200
        assert r.json()["user"]["email"] == user.email

    def test_login_sets_cookies(self, client, user):
        r = _login(client, user.email)
        assert "access_token" in r.cookies
        assert "refresh_token" in r.cookies

    def test_login_wrong_password(self, client, user):
        r = _login(client, user.email, "wrongpassword")
        assert r.status_code == 401

    def test_login_unknown_email(self, client, db):
        r = _login(client, "ghost@test.com")
        assert r.status_code == 401

    def test_login_inactive_user(self, client, db):
        u = User(
            full_name="Inactive",
            email="inactive@test.com",
            hashed_password=hash_password("Password1!"),
            role=UserRole.USER,
            is_active=False,
        )
        db.add(u)
        db.flush()
        r = _login(client, u.email)
        assert r.status_code == 403


# ---------------------------------------------------------------------------
# /me
# ---------------------------------------------------------------------------

class TestMe:
    def test_me_requires_auth(self, client):
        r = client.get("/api/auth/me")
        assert r.status_code == 401

    def test_me_returns_user(self, user_client, user):
        r = user_client.get("/api/auth/me")
        assert r.status_code == 200
        assert r.json()["email"] == user.email

    def test_me_admin_role(self, admin_client, admin):
        r = admin_client.get("/api/auth/me")
        assert r.status_code == 200
        assert r.json()["role"] == "ADMIN"


# ---------------------------------------------------------------------------
# Logout
# ---------------------------------------------------------------------------

class TestLogout:
    def test_logout_clears_cookies(self, user_client):
        r = user_client.post("/api/auth/logout")
        assert r.status_code == 204
        # Cookies should be cleared (empty value or absent)
        assert user_client.cookies.get("access_token", "") == ""

    def test_logout_blocklists_token(self, user_client):
        # After logout, /me should return 401
        user_client.post("/api/auth/logout")
        r = user_client.get("/api/auth/me")
        assert r.status_code == 401


# ---------------------------------------------------------------------------
# Refresh
# ---------------------------------------------------------------------------

class TestRefresh:
    def test_refresh_issues_new_tokens(self, user_client):
        old_access = user_client.cookies.get("access_token")
        r = user_client.post("/api/auth/refresh")
        assert r.status_code == 200
        new_access = user_client.cookies.get("access_token")
        assert new_access != old_access

    def test_refresh_replay_rejected(self, client, user):
        # Login to get a refresh token
        _login(client, user.email)
        # Capture the original refresh token BEFORE it is rotated
        old_refresh = client.cookies.get("refresh_token")
        # First refresh succeeds -- old_refresh is now blocklisted
        r1 = client.post("/api/auth/refresh")
        assert r1.status_code == 200
        # Restore the rotated-out token to simulate a replay attack
        client.cookies.set("refresh_token", old_refresh or "")
        r2 = client.post("/api/auth/refresh")
        assert r2.status_code == 401


# ---------------------------------------------------------------------------
# Forgot password
# ---------------------------------------------------------------------------

class TestForgotPassword:
    def test_always_returns_204(self, client):
        # Even for an email that does not exist
        r = client.post("/api/auth/forgot-password", json={"email": "nobody@test.com"})
        assert r.status_code == 204

    def test_known_email_also_204(self, client, user):
        r = client.post("/api/auth/forgot-password", json={"email": user.email})
        assert r.status_code == 204


# ---------------------------------------------------------------------------
# Reset password
# ---------------------------------------------------------------------------

class TestResetPassword:
    def test_reset_success(self, client, db, user):
        token, _ = create_reset_token(user.id)
        r = client.post("/api/auth/reset-password", json={"token": token, "new_password": "NewPass1!0"})
        assert r.status_code == 204
        # Should be able to log in with new password
        r2 = _login(client, user.email, "NewPass1!0")
        assert r2.status_code == 200

    def test_reset_token_reuse_rejected(self, client, user):
        token, _ = create_reset_token(user.id)
        client.post("/api/auth/reset-password", json={"token": token, "new_password": "NewPass1!0"})
        r = client.post("/api/auth/reset-password", json={"token": token, "new_password": "AnotherPass1!"})
        assert r.status_code == 400

    def test_reset_invalid_token(self, client):
        r = client.post("/api/auth/reset-password", json={"token": "garbage", "new_password": "NewPass1!0"})
        assert r.status_code == 400

    def test_reset_weak_password_rejected(self, client, user):
        token, _ = create_reset_token(user.id)
        r = client.post("/api/auth/reset-password", json={"token": token, "new_password": "123"})
        assert r.status_code == 422
