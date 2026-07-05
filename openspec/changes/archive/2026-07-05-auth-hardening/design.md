# Design: auth-hardening

## Fix 1 — HKDF para secrets derivados

**Archivo:** `backend/app/core/security.py`

**Enfoque:** Reemplazar la concatenación por `HKDF-SHA256` (de
`cryptography.hazmat.primitives.kdf.hkdf`, ya disponible transitivamente vía
`python-jose[cryptography]`). El `purpose` (`"refresh"` / `"reset"`) se usa
como `info` de HKDF, sin `salt` explícito (`salt=None` → HKDF usa un salt de
ceros internamente, aceptable acá porque el "secreto" real es el `SECRET_KEY`,
no el salt). El resultado se codifica en `base64.urlsafe` para usarlo como
secret de firma HS256.

```python
def _derive_secret(purpose: str) -> str:
    derived = HKDF(
        algorithm=hashes.SHA256(),
        length=32,
        salt=None,
        info=purpose.encode("utf-8"),
    ).derive(settings.SECRET_KEY.encode("utf-8"))
    return base64.urlsafe_b64encode(derived).decode("utf-8")

_REFRESH_SECRET = _derive_secret("refresh")
_RESET_SECRET = _derive_secret("reset")
```

Es determinístico (mismo `SECRET_KEY` + `purpose` → mismo secret en cada
arranque), así que no rompe tokens ya emitidos entre restarts del proceso
dentro de la misma versión de `SECRET_KEY`. Sí invalida — de una sola vez, en
el momento del deploy de este cambio — cualquier refresh/reset token emitido
con la derivación vieja, porque el secret de verificación cambia. Aceptable:
son tokens de vida corta (60 min) y el usuario simplemente vuelve a loguearse.

## Fix 2 — Clave del rate limiter de registro

**Archivo:** `backend/app/api/routes/auth.py`

**Enfoque:** Cambiar `_register_limiter.check(ip, ip or "anon")` /
`.register_failure(ip, ip or "anon")` por `(ip, data.email)`, igual que
`login_limiter` y `_reset_limiter`. `LoginRateLimiter._key()` ya soporta
cualquier string como segundo componente, no requiere cambios en
`ratelimit.py`.

```python
# Antes
locked_for = _register_limiter.check(ip, ip or "anon")
...
_register_limiter.register_failure(ip, ip or "anon")

# Después
locked_for = _register_limiter.check(ip, data.email)
...
_register_limiter.register_failure(ip, data.email)
```

## Fix 3 — `iss`/`aud` en el reset token

**Archivo:** `backend/app/core/security.py`

**Enfoque:** Agregar los mismos claims que ya tienen access/refresh token al
payload de `create_reset_token()`. `decode_reset_token()` no cambia — ya
pasaba `audience=_AUD` a `jwt.decode()`, solo que no tenía nada que validar
contra el payload viejo.

```python
payload = {
    "iss": _ISS,
    "aud": _AUD,
    "sub": str(user_id),
    "type": "reset",
    "jti": jti,
    "iat": now,
    "exp": expire,
}
```

## Verificación

El entorno de desarrollo de este sandbox no puede ejecutar el `pytest` real
del proyecto (el `.venv` está compilado para Windows; `cryptography` y
`pydantic-core` son extensiones nativas que no cargan en Linux, y hubo además
un desfasaje de sincronización de OneDrive en el archivo editado). Se
reprodujo la lógica exacta (HKDF + round-trip de tokens + rechazo
cross-secret) en un script aislado con una implementación HKDF equivalente en
`hashlib`, confirmando: secrets derivados distintos y determinísticos,
refresh/reset tokens válidos, y un reset token correctamente rechazado si se
intenta decodificar con el secret de refresh. Se recomienda correr
`pytest backend/tests/test_auth.py` en un entorno con las dependencias reales
instaladas antes de dar el cambio por cerrado.
