# Tasks: auth-hardening

## Implementation tasks

- [x] **T1** — Agregar `_derive_secret()` (HKDF-SHA256) en `backend/app/core/security.py`
- [x] **T2** — Reemplazar `_REFRESH_SECRET` por `_derive_secret("refresh")`
- [x] **T3** — Reemplazar `_RESET_SECRET` por `_derive_secret("reset")`
- [x] **T4** — Agregar `iss`/`aud` al payload de `create_reset_token()`
- [x] **T5** — Cambiar clave del rate limiter de registro a `(ip, data.email)` en `backend/app/api/routes/auth.py` (check + register_failure)
- [x] **T6** — Verificar cambios: reproducción aislada de la derivación HKDF + round-trip de tokens + rechazo cross-secret (ver nota de verificación en `design.md` — no se pudo correr `pytest` real en este sandbox)
