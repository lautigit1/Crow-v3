# Design: ops-infra-hardening

## Fix 7 — TRUSTED_PROXIES por CIDR + subnet fija

**Archivos:** `backend/app/core/config.py`, `backend/app/core/audit.py`, `docker-compose.yml`, `.env.example`

**Problema:** `trusted_proxy_set` compara IPs exactas (`peer in frozenset`). La IP del contenedor nginx cambia al recrearlo, y nadie se acuerda de actualizar la env var.

**Enfoque:**
- `config.py`: nueva property `trusted_proxy_networks` que parsea cada entrada con `ipaddress.ip_network(value, strict=False)` — acepta tanto IPs sueltas (`172.18.0.3` → `/32`) como rangos (`172.28.0.0/16`). Entradas inválidas se ignoran con warning.
- `audit.client_ip()`: `ip_address(peer)` contra esas redes en vez del set de strings.
- `docker-compose.yml`: red `crow_net` con subnet fija `172.28.0.0/16` vía IPAM; `TRUSTED_PROXIES` defaultea a esa subnet. Cualquier contenedor del stack (nginx incluido) queda cubierto, sobreviva o no a recreaciones.
- Se mantiene el comportamiento actual con lista vacía (dev local sin proxy: se usa la IP directa).

Confiar en la subnet entera del compose es seguro: solo corren ahí los contenedores del propio stack, y el header `X-Forwarded-For` solo se honra si el peer directo pertenece a la red.

## Fix 8 — Stack de producción

**Archivos:** `docker-compose.prod.yml` (nuevo), `deploy/Caddyfile` (nuevo), `backend/Dockerfile`, `backend/app/seed.py`, `.env.example`, `DEPLOY.md` (nuevo), `docker-compose.yml`

### 8a. Secretos por variable de entorno
- `docker-compose.yml` (dev): `POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-crow_dev_password}` — default dev explícito, override posible.
- `docker-compose.prod.yml`: `${POSTGRES_PASSWORD:?...}` y `${REDIS_PASSWORD:?...}` **obligatorias** (compose falla con mensaje claro si faltan). Redis arranca con `--requirepass`.

### 8b. Sin puertos internos publicados
En prod solo Caddy publica `80`/`443`. `api`, `db`, `redis` y `web` quedan solo en la red interna (swagger ya está deshabilitado en prod de todas formas).

### 8c. TLS automático
Servicio `caddy` (imagen oficial) como terminador TLS delante de `web` (nginx). `deploy/Caddyfile`:

```
{$DOMAIN} {
    reverse_proxy web:80
}
```

Caddy gestiona Let's Encrypt solo (emisión + renovación) con `DOMAIN` y volúmenes persistentes `caddy_data`/`caddy_config`. nginx sigue igual (puerto 80 interno, proxy de `/api` al backend); Caddy le manda `X-Forwarded-For`, y nginx lo encadena con `$proxy_add_x_forwarded_for` — con TRUSTED_PROXIES cubriendo la subnet, `client_ip()` toma la primera IP de la cadena (el cliente real).

### 8d. Migraciones en el arranque
`backend/Dockerfile` — CMD condicional:

```sh
if [ "$ENVIRONMENT" = "production" ]; then alembic upgrade head; fi
python -m app.seed && exec uvicorn ...
```

En prod corre `alembic upgrade head` (la fuente de verdad del schema) antes del seed. `seed.py` deja de crear el producto demo cuando `ENVIRONMENT=production` (el admin idempotente sí se sigue creando). En dev nada cambia (`create_all` + reconcile, como hasta ahora).

### 8e. Healthcheck del API
`docker-compose.yml` y prod: healthcheck del servicio `api` contra `/api/health` (con `urllib.request` de Python — la imagen no trae curl), y `web` depende de `api: service_healthy`.

## Fix 9 — Redis obligatorio en prod + fallback ruidoso

**Archivos:** `backend/app/main.py`, `backend/app/core/redis_client.py`, `backend/app/core/ratelimit.py`, `backend/app/core/token_blocklist.py`

- `main.py` (lifespan): en producción, `REDIS_URL` vacía → `RuntimeError` (fail-fast, mismo patrón que `SECRET_KEY` y CORS). Con más de un worker/instancia, blocklist y rate limits en memoria son incorrectos silenciosamente — mejor no arrancar.
- `redis_client.py`: helper `warn_fallback(store, exc)` con throttle de 60 s (evita un log por request si Redis está caído).
- `ratelimit.py` / `token_blocklist.py`: los `except Exception: pass` de cada operación Redis pasan a llamar `warn_fallback(...)` antes de caer al store en memoria. El fallback sigue existiendo (disponibilidad ante todo), pero deja rastro.

## Fix 10 — Refresh token a 7 días

**Archivos:** `backend/app/core/config.py`, `.env.example`

`REFRESH_TOKEN_EXPIRE_MINUTES: 60 → 10080` (7 días). Justificación de seguridad: el refresh es one-time-use (rotación con blocklist del jti usado), revocable en logout, e invalidable en masa por `token_version` — los tres mecanismos del change `security-hardening`. La cookie sigue siendo HttpOnly + Secure + SameSite=lax con path `/api/auth`. El access token sigue en 30 min.
