# Design: pyjwt-migration

## Alcance del swap

Tres archivos tenían imports/uso directo de `jose`:

- `backend/app/core/security.py` — emisión y decodificación de access/refresh/reset tokens.
- `backend/app/core/deps.py` — dependencias FastAPI que decodifican el access token en cada request.
- `backend/app/api/routes/auth.py` — endpoint `logout` (decodifica el access token para blocklistearlo) y `reset_password` (captura `JWTError`).

`jwt.encode(payload, secret, algorithm=...)` es prácticamente drop-in entre ambas librerías — no se tocó ningún call site de `encode`. `jwt.decode(...)` y la jerarquía de excepciones sí difieren.

## Cambio de excepciones

`from jose import JWTError, jwt` → `import jwt` + `from jwt import PyJWTError`. Todo `except (JWTError, ...)` pasó a `except (PyJWTError, ...)`, y los `raise JWTError(...)` internos de `security.py` (en `decode_refresh_token`/`decode_reset_token`, para señalar tipo de token incorrecto o payload malformado) pasaron a `raise PyJWTError(...)`.

## Bug encontrado por auditoría activa del comportamiento (no solo swap cosmético)

Antes de dar el swap por terminado, se escribió un script descartable para verificar empíricamente si PyJWT 2.13.0 acepta decodificar un token con claim `aud` sin pasar `audience=` a `decode()`:

```python
token = jwt.encode({"aud": "crow-api", ...}, secret, algorithm="HS256")
jwt.decode(token, secret, algorithms=["HS256"])  # sin audience=
# -> jwt.exceptions.InvalidAudienceError
```

PyJWT rechaza el token (`InvalidAudienceError`, subclase de `PyJWTError`). python-jose, en cambio, lo dejaba pasar en silencio si no se le pasaba `audience`. Esto importa porque `logout()` en `auth.py` tenía exactamente ese patrón:

```python
payload = jwt.decode(access_token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
```

Sin `audience=`, y envuelto en un `except Exception: pass` genérico (para no romper el logout si el token ya venía corrupto/expirado). Bajo PyJWT, este decode fallaría *siempre* (todo access token nuestro trae `aud`), el `except` se comería el error en silencio, y **ningún access token se blocklistearía al hacer logout** — una sesión "cerrada" seguiría siendo válida hasta su expiración natural (30 min por defecto). Bug real, no hipotético, que la migración habría introducido sin este chequeo activo.

**Fix:** se agregó `audience=TOKEN_AUDIENCE` a ese decode. `TOKEN_AUDIENCE` es un alias público nuevo de `_AUD` en `security.py` (antes `deps.py` tenía el literal `"crow-api"` hardcodeado por separado — se consolidó en una sola fuente de verdad).

## Dependencia transitiva de `cryptography`

`security.py` importa `cryptography.hazmat.primitives.hashes` y `.kdf.hkdf.HKDF` directamente (para `_derive_secret`, HKDF-SHA256 sobre `SECRET_KEY`). Antes, `cryptography` llegaba como extra de `python-jose[cryptography]==3.3.0`; al remover jose, esa dependencia habría desaparecido en silencio de `requirements.txt` sin romper nada localmente (ya instalada en el venv), pero sí en un build limpio. Se agregó `cryptography==48.0.0` explícito, versión pineada a la ya instalada en el entorno de verificación (`pip show cryptography`).

## Verificación

`pytest tests/test_auth.py tests/test_security_hardening.py` → 44/44 pasando, incluyendo `test_logout_clears_cookies` y `test_logout_blocklists_token` (los tests que específicamente ejercitan el bug de `audience` descrito arriba).

`backend/README.md` tenía una mención desactualizada ("JWT (python-jose)") en la sección de stack — corregida a "JWT (PyJWT)"; de paso se corrigió también "bcrypt (passlib)", que era inexacto: el código usa la librería `bcrypt` directamente, sin `passlib` como intermediario.
