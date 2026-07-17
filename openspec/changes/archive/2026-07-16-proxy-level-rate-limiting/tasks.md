# Tasks: proxy-level-rate-limiting

- [x] **T1** — Leer `backend/app/core/ratelimit.py` para entender el rate limiting de aplicación ya existente (alcance: solo auth, por IP+email)
- [x] **T2** — Leer `deploy/Caddyfile` y `docker-compose.prod.yml` para entender la topología real (Caddy → web/nginx → api)
- [x] **T3** — Evaluar Caddy vs. nginx para implementar el rate limiting; descartar Caddy por requerir un plugin no oficial + build custom con `xcaddy`
- [x] **T4** — Agregar `limit_req_zone api_general` (20r/s) y `limit_req_zone api_auth` (5r/s) + `limit_req_status 429` a `frontend/nginx.conf`
- [x] **T5** — Agregar `set_real_ip_from`/`real_ip_header`/`real_ip_recursive` (mismo criterio que `TRUSTED_PROXIES` del backend) para que el rate limiting se calcule sobre la IP real del cliente, no la de Caddy
- [x] **T6** — Nuevo `location /api/auth/` (zona estricta) + `limit_req` en el `location /api/` existente (zona general)
- [x] **T7** — Revisar `backend/app/core/audit.py::client_ip()` para confirmar que el cambio de `$remote_addr` en nginx no altera lo que el backend ya calculaba como IP real (no altera -- sigue tomando el primer hop de X-Forwarded-For)
- [x] **T8** — Detectar y corregir corrupción del mount de OneDrive en `nginx.conf` tras el edit (bash veía 48 líneas con llaves desbalanceadas vs. las 143 reales vía Read) -- patrón Write-sibling + `mv -f` ya establecido en esta sesión
- [x] **T9** — Verificar sintaxis tras el fix: llaves balanceadas, cada directiva termina en `;`/`{`/`}` (script Python línea por línea)
- [x] **T10** — Revisar `frontend/e2e/auth.spec.ts` (5 tests) para estimar el volumen de requests a `/api/auth/*` en la corrida de E2E vs. el burst configurado
