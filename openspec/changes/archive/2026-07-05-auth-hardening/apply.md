# Apply: auth-hardening

## Archivos modificados

### Backend
- `backend/app/core/security.py`:
  - Nueva función `_derive_secret(purpose)` usando HKDF-SHA256
    (`cryptography.hazmat.primitives.kdf.hkdf`).
  - `_REFRESH_SECRET` y `_RESET_SECRET` ahora salen de `_derive_secret(...)`
    en vez de `SECRET_KEY + ":refresh"` / `":reset"`.
  - `create_reset_token()` agrega `iss`/`aud` al payload (antes ausentes,
    hacían que el chequeo de audience en `decode_reset_token()` fuera un
    no-op).
- `backend/app/api/routes/auth.py`:
  - `register()`: `_register_limiter.check()` / `.register_failure()` ahora
    usan `(ip, data.email)` en vez de `(ip, ip or "anon")`.
  - Mensaje de error del 429 ajustado ("Demasiados registros." en vez de
    "...desde esta IP.", ya que ahora la clave no es puramente por IP).

## Verificación

- No se pudo correr el `pytest` real del proyecto en este sandbox: el
  `.venv` está compilado para Windows y `cryptography`/`pydantic-core` (
  extensiones nativas) no cargan en Linux; además hubo un desfasaje de
  sincronización de OneDrive en el archivo editado que requirió comparar
  bytes y reintentar.
- Se reprodujo la lógica exacta de `_derive_secret` + creación/decodificación
  de refresh y reset tokens en un script aislado (HKDF equivalente vía
  `hashlib`, ya que el `cryptography` del venv no es compatible con este
  Linux sandbox). Se confirmó: secrets derivados distintos entre sí y del
  `SECRET_KEY` raíz, determinismo entre llamadas, round-trip correcto de
  ambos tipos de token, y rechazo de un reset token si se intenta decodificar
  con el secret de refresh (JWTError).
- Se revisó `test_auth.py` para confirmar que ningún test existente ejercita
  el rate limiter de registro con múltiples intentos (por lo tanto el cambio
  de clave no requería actualizar tests existentes), y que el flujo de reset
  password (`test_reset_success`, `test_reset_token_reuse_rejected`, etc.)
  no depende del contenido exacto del payload más allá de `sub`/`type`/`jti`.
- Recomendado: correr `pytest backend/tests/test_auth.py` en un entorno con
  las dependencias reales instaladas antes de mergear.

## Desviaciones del plan

- Ninguna respecto a lo planeado en `design.md`.

## Nota

Este change se implementó a pedido explícito del usuario ("vamos con todo lo
de autenticacion con la metodologia de trabajo que veniamos usando"), a
partir de los puntos sensibles identificados al comparar
`AUDITORIA_TECNICA_CROW_V3.md` y `AUDITORIA_COMPARATIVA_ANTES_AHORA.md`
excluyendo hallazgos de infraestructura de producción.
