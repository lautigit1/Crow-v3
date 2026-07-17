# Proposal: production-readiness-hardening

## What

Seis fixes de infraestructura/DevOps que salen del listado de hallazgos críticos de la auditoría del 2026-07-13 (`Auditoria_Tecnica_Crow_Repuestos_v3.docx`), agrupados porque todos apuntan al mismo problema de fondo — el stack funciona, pero varias prácticas básicas de "producción responsable" faltaban por completo:

1. **Backups de Postgres automatizados** — la única "estrategia" era un comando manual documentado que nadie corría.
2. **Error tracking (Sentry)** — sin esto, un error 500 en producción solo se detecta si un usuario lo reporta a mano.
3. **Usuarios no-root en ambos Dockerfiles** — backend y frontend corrían como root dentro del contenedor.
4. **Escaneo de dependencias en CI** — sin Dependabot ni auditoría de CVEs, una vulnerabilidad conocida en una dependencia podía pasar desapercibida indefinidamente.
5. **Security headers en nginx** — CSP, X-Frame-Options, HSTS, X-Content-Type-Options y demás no estaban presentes en ninguna respuesta del frontend.
6. **`backend/docker-compose.yml` con credenciales hardcodeadas y puerto de Postgres expuesto a toda la red.**

## Why

- Sin backups automáticos, cualquier incidente de disco, corrupción de datos, o un `DROP TABLE` accidental es pérdida total e irreversible de todo el catálogo, usuarios y pedidos.
- Sin error tracking, el equipo se entera de un bug en producción por un cliente enojado, no por una alerta — el tiempo entre "algo se rompió" y "nos dimos cuenta" puede ser de días.
- Correr como root dentro de un contenedor no es explotable por sí solo, pero convierte cualquier RCE en una dependencia (ej. una CVE de `python-jose` o de un paquete de npm) en compromiso total del contenedor en vez de estar acotado a un usuario sin privilegios.
- Sin Dependabot ni auditoría de CVEs en CI, dependencias con vulnerabilidades conocidas y públicas (CVEs ya documentadas, con exploits a veces publicados) pueden quedar sin parchear indefinidamente porque nadie las está mirando activamente.
- La ausencia de CSP/HSTS/X-Frame-Options dejaba al sitio sin ninguna mitigación de browser contra XSS, clickjacking, o downgrade a HTTP — controles estándar que no cuestan nada de performance y son prácticamente gratis de agregar.
- `backend/docker-compose.yml` es explícitamente un compose de desarrollo local (documentado en `backend/README.md`, nunca usado en producción), pero aun así tenía el password de Postgres hardcodeado en texto plano y el puerto 5432 publicado en todas las interfaces de red (`0.0.0.0`), no solo localhost.

## Non-goals

- No se contrata ni configura una cuenta real de Sentry, ni se define un DSN de producción — eso requiere una cuenta real en sentry.io que no existe en este entorno. El código queda listo para activarse con solo setear una variable de entorno.
- No se configura un backup offsite (S3, GCS, etc.) — depende del proveedor de storage que se elija en el servidor real; se documenta como paso siguiente recomendado.
- No se migra el frontend a HTTPS-only ni se toca la configuración de Caddy/TLS — eso ya estaba resuelto (Caddy con Let's Encrypt automático).
- No se elimina `backend/docker-compose.yml` — es un compose de desarrollo local documentado e intencional (backend aislado, sin frontend/Redis), no un artefacto legacy sin uso. Se corrige, no se borra.
- No se bloquea el pipeline de CI si `pip-audit`/`npm audit` encuentran una CVE — por ahora son informativos (no rompen el build), para evaluar el ruido real antes de volverlos bloqueantes.

## Success criteria

- `./deploy/backup-postgres.sh` genera un dump comprimido con timestamp y aplica retención automática; `./deploy/restore-postgres.sh` lo restaura con confirmación explícita. Ambos verificados funcionalmente (no solo sintaxis).
- Con `SENTRY_DSN`/`VITE_SENTRY_DSN` sin configurar (default), la app funciona exactamente igual que antes — cero diferencia de comportamiento, sin necesidad de tener los paquetes de Sentry instalados para desarrollo/tests.
- `docker build` de ambos Dockerfiles resulta en contenedores que corren como usuario sin privilegios (`appuser` / `nginx`), no como root.
- Dependabot mantiene actualizadas las dependencias de pip, npm, Docker y GitHub Actions; ambos workflows de CI corren una auditoría de CVEs en cada push/PR.
- Las respuestas del frontend incluyen CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy y HSTS.
- `backend/docker-compose.yml` ya no tiene el password de Postgres en texto plano ni expone el puerto a toda la red.
- Suite completa de tests de backend (249 tests) y frontend (57 tests) pasa sin regresiones; `tsc --noEmit` limpio.
