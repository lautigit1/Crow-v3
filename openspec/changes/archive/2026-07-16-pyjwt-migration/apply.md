# Apply: pyjwt-migration

## Resumen

Migración de `python-jose` (sin mantenimiento desde 2021) a `PyJWT` en los tres archivos del backend que firman/verifican JWT. Durante la migración se encontró y corrigió un bug real: PyJWT es más estricto que jose con el claim `aud`, lo que habría roto silenciosamente el blocklisteo de access tokens en logout.

## Archivos modificados

- `backend/app/core/security.py` — imports (`jwt`, `PyJWTError`), `raise JWTError` → `raise PyJWTError` en `decode_refresh_token`/`decode_reset_token`, nuevo alias público `TOKEN_AUDIENCE`.
- `backend/app/core/deps.py` — imports, `except (JWTError, ...)` → `except (PyJWTError, ...)`, usa `TOKEN_AUDIENCE` en vez del literal `"crow-api"`.
- `backend/app/api/routes/auth.py` — imports, `except (JWTError, ValueError)` → `except (PyJWTError, ValueError)` en `reset_password`; fix del bug de `audience` en `logout()`.
- `backend/requirements.txt` — `python-jose[cryptography]==3.3.0` → `pyjwt==2.13.0` + `cryptography==48.0.0` explícito.
- `backend/README.md` — corregidas menciones desactualizadas de python-jose y passlib.

## Decisiones documentadas

- No se tocó el diseño de claims ni el mecanismo de blocklist — swap de librería, no de arquitectura.
- Se verificó empíricamente (script descartable, no asumido de la documentación) el comportamiento de PyJWT con `aud` antes de dar la migración por terminada — así se encontró el bug de `logout()`.
- `TOKEN_AUDIENCE` centraliza un literal que antes estaba duplicado a mano en dos archivos.
- Versiones de `pyjwt`/`cryptography` pineadas a lo ya instalado en el entorno de verificación, para que lo declarado en `requirements.txt` coincida exactamente con lo testeado.

## Verificación

- `pytest tests/test_auth.py tests/test_security_hardening.py` → **44/44 passed**, incluyendo `test_logout_clears_cookies` y `test_logout_blocklists_token`.
- `grep -rn "jose\|JWTError" backend/` → sin resultados en código vivo (solo comentarios explicativos que mencionan "python-jose" como contexto histórico).

## Pendiente / limitaciones

- No se corrió la suite completa de 258 tests en este change puntual (se acotó a los tests directamente relacionados con auth/JWT) — la suite completa se corre como parte de la verificación final de todo el bloque "Alta".
