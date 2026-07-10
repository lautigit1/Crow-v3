# Apply: security-hardening

## Resumen

Implementa los 6 fixes de seguridad de la auditoría del 2026-07-10:
rate limit por IP en endpoints públicos, revocación del refresh token en
logout, invalidación de sesiones al cambiar/resetear contraseña
(`token_version`), protección CSRF por validación de Origin, sanitización
del subject SMTP, y hardening completo de pedidos (stock, topes,
auditoría, rate limit).

## Archivos modificados

**Nuevos:**
- `backend/app/core/cookies.py` — helpers `set_auth_cookies`/
  `clear_auth_cookies` compartidos entre auth y users; el refresh cookie
  pasa de path `/api/auth/refresh` a `/api/auth` (logout necesita
  recibirla para revocarla); borra también el path legacy en la
  transición.
- `backend/alembic/versions/012_user_token_version.py` — columna
  `users.token_version INT NOT NULL DEFAULT 0`.
- `backend/tests/test_security_hardening.py` — ~20 tests cubriendo los 6
  fixes.

**Modificados:**
- `backend/app/api/routes/quotes.py` — `_quote_ip_limiter` (15/h por IP,
  sentinel `"*"`) además del limiter por (ip, email) — sin esto, rotar el
  email evadía el límite indefinidamente.
- `backend/app/api/routes/auth.py` — limiters por IP en register (10/h,
  cuenta registros exitosos) y forgot-password (15/h); logout decodifica
  el refresh cookie y bloquea su jti; `reset_password` incrementa
  `token_version`; helpers de cookies movidos a `core/cookies.py`.
- `backend/app/api/routes/users.py` — `change_password` incrementa
  `token_version` y reemite cookies en la misma response (mata las otras
  sesiones, conserva la propia).
- `backend/app/core/security.py` — claim `ver` en access y refresh
  tokens; `decode_refresh_token` devuelve `(sub, jti, ver, exp)`.
- `backend/app/core/deps.py` — access y refresh se rechazan si
  `ver != user.token_version`.
- `backend/app/core/middleware.py` + `main.py` — `CSRFOriginMiddleware`:
  métodos mutantes con `Origin` que no sea un CORS origin permitido ni el
  propio host → 403 (Origin `"null"` incluido); requests sin Origin
  (curl, tests) pasan.
- `backend/app/core/email.py` — `_sanitize_subject()` colapsa CR/LF en el
  sink (`send_email`), cubriendo cualquier builder futuro.
- `backend/app/schemas/order.py` — `quantity` 1–999, máx. 50 ítems.
- `backend/app/api/routes/orders.py` — consolidación de ítems duplicados,
  `SELECT ... FOR UPDATE`, validación y descuento de stock (409 si no
  alcanza), devolución al cancelar (usuario y admin), bloqueo de
  reactivación desde CANCELADO, auditoría en create/cancel/admin update,
  rate limit 10 pedidos/h por usuario.
- `backend/app/models/user.py` — campo `token_version`.
- `backend/scripts/verify_db_integrity.py` — reconcile de la columna
  nueva para bases dev creadas con `create_all()`.
- `backend/tests/conftest.py` — `LoginRateLimiter.reset_all_memory_state()`
  entre tests (los limiters por IP comparten la clave `testclient:*` en
  toda la suite).
- `backend/app/core/ratelimit.py` — registry de instancias +
  `reset_all_memory_state()` (solo para tests).

## Decisiones documentadas

- **`token_version` (entero) en vez de `tokens_valid_from` (timestamp)**:
  sin clock skew ni comparaciones datetime/epoch; tokens pre-deploy sin
  claim `ver` valen como versión 0 (no se cortan sesiones al deployar).
- **Validación de Origin en vez de token CSRF**: segunda capa sobre
  SameSite=lax sin tocar el frontend; los browsers modernos siempre
  mandan Origin en requests mutantes cross-site, que es el caso a
  bloquear.
- **Stock: validar y descontar** (elección explícita del usuario entre
  tres opciones): descuento al crear, devolución al cancelar, y pedidos
  cancelados no se reactivan (evita re-descuentos inconsistentes).

## Verificación

- Tests nuevos en `tests/test_security_hardening.py`; suite corrida por
  el usuario en su máquina: passed, solo warnings de deprecación de
  httpx (el atajo `app=` del TestClient de Starlette — ajeno a este
  change).
- Grep de cierre: sin referencias a `_set_auth_cookies`/
  `_clear_auth_cookies` viejos; `UserRead` no expone `token_version`.
- `with_for_update()` es no-op en SQLite (tests) y efectivo en Postgres.
