# Tasks: pyjwt-migration

## Implementation tasks

- [x] **T1** — Reemplazar `from jose import JWTError, jwt` por `import jwt` + `from jwt import PyJWTError` en `security.py`, `deps.py`, `auth.py`
- [x] **T2** — Reemplazar todos los `except (JWTError, ...)` por `except (PyJWTError, ...)`
- [x] **T3** — Reemplazar `raise JWTError(...)` internos (`decode_refresh_token`, `decode_reset_token`) por `raise PyJWTError(...)`
- [x] **T4** — Script descartable para verificar empíricamente el comportamiento de PyJWT con claim `aud` sin `audience=` en `decode()`
- [x] **T5** — Fix del bug encontrado: agregar `audience=TOKEN_AUDIENCE` al decode de `logout()` en `auth.py`, con comentario explicando por qué
- [x] **T6** — Consolidar el literal `"crow-api"` en un alias público `TOKEN_AUDIENCE` en `security.py`, usado desde `deps.py` y `auth.py`
- [x] **T7** — `requirements.txt`: `python-jose[cryptography]==3.3.0` → `pyjwt==2.13.0` + `cryptography==48.0.0` explícito
- [x] **T8** — Grep final confirmando cero imports vivos de `jose` en `backend/` (solo comentarios históricos)
- [x] **T9** — Corregir `backend/README.md` (mención de python-jose y de passlib, ambas desactualizadas)
- [x] **T10** — `pytest tests/test_auth.py tests/test_security_hardening.py` → 44/44 pasando
