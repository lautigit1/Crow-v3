# Proposal: auth-hardening

## What

Cerrar tres puntos sensibles de autenticación que quedaron pendientes tras
`critical-fixes` / `trusted-proxy` / `redis-integration`, identificados al
releer `AUDITORIA_TECNICA_CROW_V3.md` y `AUDITORIA_COMPARATIVA_ANTES_AHORA.md`
sin infraestructura de producción de por medio (foco puramente de código):

1. `_REFRESH_SECRET` / `_RESET_SECRET` en `backend/app/core/security.py` se
   derivaban por concatenación simple (`SECRET_KEY + ":refresh"`).
2. El rate limiter de registro (`_register_limiter` en `auth.py`) seguía
   usando `(ip, ip)` como clave en vez de `(ip, email)` — el bug de "penaliza
   éxitos" ya se había arreglado en una sesión anterior, pero la clave
   incorrecta seguía ahí.
3. Hallazgo nuevo, no documentado en las auditorías anteriores:
   `create_reset_token()` no incluía los claims `iss`/`aud` en el payload,
   por lo que el chequeo `audience=_AUD` en `decode_reset_token()` era un
   no-op silencioso (python-jose no rechaza un token sin claim `aud` aunque
   se le pase `audience=`).

## Why

- **Derivación por concatenación**: si `SECRET_KEY` se filtra, los secrets de
  refresh/reset se derivan trivialmente (son solo el string original más un
  sufijo fijo). Un KDF real (HKDF) hace que cada secret derivado sea
  independiente — filtrar uno no compromete los otros ni el root key.
- **Clave del rate limiter**: `(ip, ip)` no distingue entre emails, así que
  el limiter no cumple su propósito de frenar probing dirigido a un email ya
  registrado desde la misma IP.
- **`aud` ausente en reset token**: el código documentaba `iss`/`aud` como
  protección (RFC 7519) pero, para el flujo de reset, esa protección nunca se
  aplicaba de hecho. Bajo impacto real (el reset token igual está protegido
  por secret + tipo + JTI blocklist), pero es una inconsistencia que vale
  cerrar ya que se estaba tocando ese archivo.

## Non-goals

- No se cambia el mecanismo de blocklist/Redis (ya resuelto en
  `redis-integration`).
- No se agregan nuevas protecciones de auth fuera de las tres puntuales de
  arriba.

## Success criteria

- `_REFRESH_SECRET` y `_RESET_SECRET` se derivan con HKDF-SHA256, son
  distintos entre sí y del `SECRET_KEY` raíz, y determinísticos (mismo
  `purpose` → mismo secret en cada arranque del proceso).
- `create_reset_token()` incluye `iss`/`aud`; `decode_reset_token()` los
  valida de verdad.
- El registro repetido con el mismo email desde la misma IP dispara el
  rate limit; dos emails distintos desde la misma IP no comparten contador.
- Tests de backend existentes (`test_auth.py`) sin regresiones.
