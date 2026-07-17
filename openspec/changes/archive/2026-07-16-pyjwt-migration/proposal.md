# Proposal: pyjwt-migration

## What

Reemplazar `python-jose` por `PyJWT` como librería de firma/verificación de JWT en todo el backend. Hallazgo "Alta" #19 de la auditoría técnica del 2026-07-13.

## Why

`python-jose` no tiene mantenimiento activo desde 2021 (sin releases, issues de seguridad abiertos sin resolver en su repo). `PyJWT` es la librería de facto del ecosistema FastAPI, activamente mantenida, y ya es una dependencia transitiva común en proyectos similares.

## Non-goals

- No se cambia el esquema de claims (`iss`, `aud`, `sub`, `role`, `type`, `ver`, `jti`, `iat`, `exp`) ni el mecanismo de blocklist — la migración es a nivel de librería, no de diseño de tokens.
- No se rota `SECRET_KEY` ni los secretos derivados (`_derive_secret` vía HKDF) — siguen siendo los mismos, los tokens ya emitidos con python-jose siguen siendo válidos bajo PyJWT sin necesidad de reemitir sesiones.

## Success criteria

- Cero imports de `jose` en código vivo del backend (`grep -rn "from jose\|import jose"` sin resultados fuera de comentarios históricos).
- `requirements.txt` declara `pyjwt` y `cryptography` de forma explícita (esta última dejó de llegar transitivamente al remover `python-jose[cryptography]`).
- La suite de tests de autenticación pasa sin regresiones, incluyendo los tests que cubren logout y blocklist de tokens.
- El endpoint de logout sigue blocklisteando el access token correctamente bajo PyJWT (riesgo específico: PyJWT es más estricto que jose con el claim `aud`).
