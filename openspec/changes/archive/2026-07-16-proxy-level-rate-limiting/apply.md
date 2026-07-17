# Apply: proxy-level-rate-limiting

## Resumen

`frontend/nginx.conf` ahora aplica rate limiting por IP a nivel de proxy, antes de que cualquier request llegue al backend: 20 req/s (burst 40) para `/api/*` en general, 5 req/s (burst 10) para `/api/auth/*`. Complementa (no reemplaza) al `LoginRateLimiter` de aplicación ya existente. Hallazgo "Alta" #20 de la auditoría técnica del 2026-07-13.

## Archivos modificados

- `frontend/nginx.conf`

## Decisiones documentadas

- Implementado en nginx, no en Caddy -- la imagen oficial `caddy:2-alpine` no trae rate limiting de fábrica (requeriría compilar una imagen custom), y nginx ya está presente tanto en dev como en producción, cubriendo ambos entornos con una sola implementación.
- Dos zonas separadas (general vs. auth) en vez de una sola, dimensionadas mirando el patrón real de requests en paralelo que ya dispara la UI (selects de soporte en admin, filtros de catálogo).
- `nodelay` en ambas zonas -- sirve el burst inmediato en vez de espaciarlo artificialmente, evitando latencia extra en tráfico legítimo.
- `ngx_http_realip_module` (`set_real_ip_from 172.28.0.0/16`) para que el rate limiting se calcule sobre la IP real del visitante y no la de Caddy (que sería el único peer visible en producción sin esto) -- mismo criterio que `TRUSTED_PROXIES` ya usa en el backend.
- `limit_req_status 429` en vez del `503` default de nginx, semánticamente más correcto.

## Verificación

- Revisión sintáctica manual (llaves balanceadas, cada directiva termina en `;`/`{`/`}`) tras corregir una corrupción del mount de OneDrive detectada durante la edición (ver más abajo).
- Revisión de `backend/app/core/audit.py::client_ip()` confirmando que el cambio no altera lo que el backend ya calculaba como IP real del cliente.
- Revisión de `frontend/e2e/auth.spec.ts` (5 tests) para estimar que el volumen de requests de auth en una corrida de E2E queda muy por debajo del burst configurado.

## Hallazgo colateral: corrupción del mount de OneDrive

Durante la edición de `nginx.conf`, una verificación de sintaxis vía bash mostró el archivo truncado a 48 líneas con llaves desbalanceadas (1 abierta, 0 cerradas), mientras que el `Read` tool (autoritativo) mostraba las 143 líneas completas y correctas -- el mismo patrón de desync entre el mount de OneDrive y las herramientas de archivo ya documentado extensamente en cambios anteriores de esta sesión. Se corrigió con el patrón ya establecido: escribir a un archivo sibling (`_nginx_new.conf`), `mv -f` para reemplazar, y reverificar (142 líneas -- una menos que el conteo de `Read` porque `wc -l` no cuenta la última línea si no termina en newline extra; llaves balanceadas 6/6).

## Pendiente / limitaciones

- **No se pudo verificar en caliente** que los límites configurados no generan falsos positivos contra tráfico legítimo (navegación normal del catálogo, ni la corrida real de los 12 tests de Playwright en `e2e.yml`) -- sin Docker disponible en el sandbox de verificación de esta sesión. Si la primera corrida real de `e2e.yml` después de este cambio falla con `429` en algún test, la zona/burst correspondiente necesita ajustarse (probablemente `api_general`, si algún test dispara más requests en paralelo de los estimados acá).
- No se implementó rate limiting en Caddy -- ver `design.md` para la justificación. Si en el futuro se decide invertir en una imagen custom de Caddy con `caddy-ratelimit`, sería una capa adicional (no un reemplazo) sobre lo agregado acá.
