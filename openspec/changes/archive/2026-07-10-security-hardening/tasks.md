# Tasks: security-hardening

## Implementation tasks

- [x] **T1a** — Limiter por IP en `POST /quotes` (`_quote_ip_limiter`, sentinel `"*"`)
- [x] **T1b** — Limiter por IP en `POST /auth/register` (10/h, cuenta registros exitosos)
- [x] **T1c** — Limiter por IP en `POST /auth/forgot-password` (15/h)
- [x] **T2a** — Mover helpers de cookies a `app/core/cookies.py`; path del refresh cookie → `/api/auth`
- [x] **T2b** — `logout`: decodificar cookie `refresh_token` y bloquear su jti
- [x] **T3a** — Migración Alembic `012_user_token_version.py`: columna `token_version` en `users` (+ reconcile en `verify_db_integrity.py`)
- [x] **T3b** — Modelo `User`: campo `token_version` (default 0)
- [x] **T3c** — `security.py`: claim `ver` en access y refresh tokens; `decode_refresh_token` devuelve `ver` y `exp`
- [x] **T3d** — `deps.py`: rechazar tokens con `ver` distinto a `user.token_version` (access y refresh)
- [x] **T3e** — `change_password`: incrementar `token_version` y reemitir cookies en la response
- [x] **T3f** — `reset_password`: incrementar `token_version`
- [x] **T4a** — `CSRFOriginMiddleware` en `core/middleware.py` (métodos mutantes: Origin permitido o same-origin, si no 403)
- [x] **T4b** — Registrar el middleware en `main.py`
- [x] **T5** — `send_email()`: colapsar CR/LF del subject (`_sanitize_subject`)
- [x] **T6a** — Schemas de orden: `quantity` 1–999, máximo 50 ítems
- [x] **T6b** — `create_order`: consolidar ítems, `with_for_update`, validar y descontar stock (409 si no alcanza)
- [x] **T6c** — `cancel_my_order`: devolver stock
- [x] **T6d** — `admin_update_order`: devolver stock al cancelar; bloquear reactivación desde CANCELADO
- [x] **T6e** — Auditoría en create/cancel/admin update de pedidos
- [x] **T6f** — Rate limit en `create_order` (10/h por usuario)
- [x] **T7a** — Tests nuevos en `tests/test_security_hardening.py` (los 6 fixes); reset de limiters en `conftest.py`
- [ ] **T7b** — Correr `pytest` — PENDIENTE al archivar (2026-07-10): el
      sandbox de la sesión no tenía shell disponible. El apply del código
      está completo y verificado por lectura; correr `cd backend && pytest`
      antes del próximo deploy y corregir cualquier regresión.
