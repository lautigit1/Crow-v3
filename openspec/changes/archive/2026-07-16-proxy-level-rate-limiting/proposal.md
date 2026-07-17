# Proposal: proxy-level-rate-limiting

## What

Hallazgo "Alta" #20 de la auditoría técnica del 2026-07-13: el único rate limiting existente vivía a nivel de aplicación (`LoginRateLimiter`, Redis-backed, por IP+email, solo para `/api/auth/*`). No había ninguna capa de rate limiting delante del backend a nivel de proxy (Caddy/nginx).

## Why

El rate limiter de aplicación protege contra fuerza bruta dirigida a una cuenta puntual (intentos de login repetidos contra un email específico), pero cualquier request -- sin importar el endpoint -- ya recorrió todo el camino hasta Python y potencialmente hasta Redis/pgbouncer antes de que se evalúe ese límite. Un flood volumétrico (muchos requests por segundo, no necesariamente todos contra el mismo email) sigue consumiendo CPU del proceso uvicorn y conexiones de la base sin que nada lo frene antes. Una capa de rate limiting en el proxy rechaza el exceso con un simple `429` antes de que la request llegue siquiera al backend -- más barata, y defensa en profundidad real (dos capas independientes en vez de una sola).

## Non-goals

- No reemplaza a `LoginRateLimiter` -- sigue siendo la defensa real contra fuerza bruta dirigida (por IP+email, con lockout persistente en Redis). La capa de proxy es más gruesa (solo por IP, sin noción de a qué cuenta apunta cada intento) y actúa como primera línea barata, no como sustituto.
- No se implementó en Caddy (aunque el hallazgo original nombra "Caddy/nginx" como opciones): la imagen oficial `caddy:2-alpine` que ya usa `docker-compose.prod.yml` no trae rate limiting de fábrica -- el plugin más usado (`caddy-ratelimit`) requiere compilar una imagen custom con `xcaddy`. Se implementó en nginx en su lugar, que sí lo trae de fábrica y además está presente tanto en desarrollo (`docker-compose.yml`, sin Caddy) como en producción -- una sola implementación cubre ambos entornos.
- No se pudo levantar el stack real ni correr los 12 tests de Playwright contra esta config para confirmar en caliente que no rechaza tráfico legítimo -- sin Docker disponible en el sandbox de verificación de esta sesión (limitación conocida, documentada en cambios anteriores).

## Success criteria

- `frontend/nginx.conf` define dos zonas de `limit_req`: una general para `/api/*` (20 req/s por IP, burst 40 sin delay) y una más estricta para `/api/auth/*` (5 req/s por IP, burst 10 sin delay).
- Excesos responden `429` en vez de proxyearse al backend.
- El rate limiting se calcula sobre la IP real del cliente, no la del proxy intermedio (Caddy en producción) -- vía `ngx_http_realip_module`, con la misma subnet de confianza (`172.28.0.0/16`) que ya usa el backend para `TRUSTED_PROXIES`.
- Sin romper el uso normal de la app (navegación de catálogo con requests en paralelo, flujos de auth normales) -- verificado por revisión manual de los límites contra el volumen de requests real de la UI, dado que no se pudo correr el stack completo.
