# Apply: ops-infra-hardening

## Resumen

Cierra los 4 hallazgos de operación e infraestructura de la auditoría del
2026-07-10: `TRUSTED_PROXIES` frágil (IP exacta del contenedor), ausencia
de stack de producción, degradación silenciosa cuando Redis falla, y
refresh token de 60 minutos.

## Archivos modificados

**Nuevos:**
- `docker-compose.prod.yml` — stack de producción: solo Caddy publica
  80/443; Postgres y Redis con password obligatoria (`${VAR:?}`); Redis
  con `--requirepass` + persistencia AOF; `ENVIRONMENT=production`;
  healthchecks en todos los servicios.
- `deploy/Caddyfile` — terminador TLS con certificados automáticos de
  Let's Encrypt para `$DOMAIN`, proxy a `web:80`.
- `DEPLOY.md` — procedimiento completo: primer deploy, actualizaciones,
  backups de Postgres, decisiones de seguridad cableadas, troubleshooting.

**Modificados:**
- `backend/app/core/config.py` — `trusted_proxy_networks` (parsea IPs
  sueltas y CIDRs con `ipaddress`, entradas inválidas se ignoran con
  warning; reemplaza a `trusted_proxy_set`);
  `REFRESH_TOKEN_EXPIRE_MINUTES` 60 → 10080 (7 días).
- `backend/app/core/audit.py` — `client_ip()` matchea el peer contra las
  redes confiables vía `_peer_is_trusted_proxy()` (peers que no son IP,
  ej. "testclient" en tests, nunca son proxy confiable).
- `docker-compose.yml` — red `crow_net` con subnet fija `172.28.0.0/16`
  (IPAM); `TRUSTED_PROXIES` defaultea a esa subnet; `POSTGRES_PASSWORD`
  por env con default dev; healthcheck del servicio `api` y `web` espera
  `service_healthy`.
- `backend/Dockerfile` — CMD condicional: en producción corre
  `alembic upgrade head` antes del seed; en dev nada cambia.
- `backend/app/seed.py` — el producto demo no se crea en producción
  (el admin idempotente sí).
- `backend/app/main.py` — fail-fast si `ENVIRONMENT=production` sin
  `REDIS_URL` (mismo patrón que SECRET_KEY/CORS); warning si
  `TRUSTED_PROXIES` está vacía en producción.
- `backend/app/core/redis_client.py` — `warn_fallback(store, exc)` con
  throttle de 60 s.
- `backend/app/core/ratelimit.py` / `token_blocklist.py` — cada
  `except Exception: pass` de operaciones Redis ahora llama
  `warn_fallback()` antes de caer al store en memoria.
- `.env.example` — reescrito: variables de dev y de prod separadas
  (`POSTGRES_PASSWORD`, `REDIS_PASSWORD`, `DOMAIN`, SMTP, Cloudinary),
  `TRUSTED_PROXIES` documentada como avanzada (los compose ya la pasan).

## Qué cambia para quien opera el proyecto

- `docker compose up --build` (dev) sigue funcionando exactamente igual.
- Deploy a producción: `docker compose -f docker-compose.prod.yml up -d
  --build` con un `.env` completo — compose falla con mensaje claro si
  falta una variable obligatoria. TLS, migraciones y seed son automáticos.
- Recrear contenedores ya no rompe la detección de IP real (se confía en
  la subnet fija, no en una IP puntual).
- Si Redis se cae en runtime, los logs lo muestran (1 warning/min) en vez
  de degradar en silencio.
- Los usuarios mantienen la sesión hasta 7 días de inactividad (antes 1 h).

## Decisiones documentadas

- **Caddy como terminador TLS** (en vez de certbot + nginx 443): cero
  configuración de renovación, un archivo de 4 líneas, y el nginx del
  frontend queda intacto. El trade-off (un contenedor más) es menor.
- **Confiar en la subnet entera del compose**: solo corren ahí los
  contenedores del propio stack, y `X-Forwarded-For` solo se honra si el
  peer directo pertenece a la red — mismo modelo de confianza que la IP
  exacta, sin la fragilidad.
- **Fail-fast de Redis solo en producción**: en dev el fallback en
  memoria es cómodo y correcto (un solo proceso); en prod, con varios
  workers, es incorrecto en silencio — mejor no arrancar.
- **7 días de refresh**: seguro después de `security-hardening` (rotación
  one-time-use + revocación en logout + `token_version`); el access token
  sigue en 30 min.

## Verificación

- Cada archivo tocado se escribió y releyó con las herramientas de
  archivo (mismo criterio anti-sync de OneDrive documentado en changes
  anteriores).
- Grep de cierre: no quedan referencias a `trusted_proxy_set` (la única
  estaba en `audit.py`, migrada).
- Los checks nuevos de `main.py` están gateados por `is_production`, así
  que la suite de tests (ENVIRONMENT=development) no cambia de
  comportamiento.
- **Pendiente en máquina del usuario** (sandbox sin shell):
  ```bash
  cd backend && pytest
  docker compose -f docker-compose.prod.yml config --quiet  # valida sintaxis
  ```
