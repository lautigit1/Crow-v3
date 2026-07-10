# Deploy a producción — Crow Repuestos

Stack de producción: `docker-compose.prod.yml` (Postgres + Redis + FastAPI + nginx + Caddy con TLS automático).

## Requisitos

- Servidor Linux con Docker y Docker Compose v2.
- Un dominio con el DNS (registro A/AAAA) apuntando a la IP del servidor **antes** del primer arranque — Caddy lo necesita para emitir el certificado de Let's Encrypt.
- Puertos 80 y 443 abiertos en el firewall. Ningún otro puerto se publica.

## Primer deploy

1. Clonar el repo y crear el `.env` en la raíz:

   ```bash
   cp .env.example .env
   ```

2. Completar en `.env` las variables obligatorias de producción. El compose falla con un mensaje claro si falta alguna:

   ```bash
   SECRET_KEY=$(openssl rand -hex 32)
   POSTGRES_PASSWORD=$(openssl rand -hex 24)
   REDIS_PASSWORD=$(openssl rand -hex 24)
   DOMAIN=crowrepuestos.com
   SEED_ADMIN_PASSWORD=...   # 10+ chars, mayúscula, minúscula, dígito y especial
   ```

   Opcionales: `SMTP_USER`/`SMTP_PASSWORD` (mails de cotizaciones y reset), `CLOUDINARY_*` (upload de imágenes).

3. Levantar:

   ```bash
   docker compose -f docker-compose.prod.yml up -d --build
   ```

   En el arranque el API corre `alembic upgrade head` (migraciones) y el seed idempotente (solo crea el admin; en producción no se carga producto demo).

4. Verificar:

   ```bash
   docker compose -f docker-compose.prod.yml ps          # todo healthy
   curl -s https://$DOMAIN/api/health                     # {"status":"ok",...}
   ```

## Actualizaciones

```bash
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

Las migraciones nuevas se aplican solas en el arranque del API.

## Backups

Lo único con estado es Postgres (volumen `crow_pgdata`). Backup diario recomendado:

```bash
docker exec crow_db pg_dump -U crow crow_repuestos | gzip > backup-$(date +%F).sql.gz
```

Restaurar: `gunzip -c backup.sql.gz | docker exec -i crow_db psql -U crow crow_repuestos`.

Redis persiste en `crow_redisdata` (AOF) pero solo guarda estado efímero (rate limits, tokens revocados, cache del dashboard) — no necesita backup.

## Decisiones de seguridad ya cableadas

- `ENVIRONMENT=production` hace fail-fast si falta `SECRET_KEY`, si `REDIS_URL` está vacía, o si el CORS sigue apuntando a localhost. Swagger (`/docs`) queda deshabilitado.
- Solo Caddy publica puertos; API, Postgres y Redis viven en la red interna `crow_net` (subnet fija `172.28.0.0/16`, confiada vía `TRUSTED_PROXIES` para que `X-Forwarded-For` funcione).
- Cookies de auth: HttpOnly, `Secure` (solo HTTPS), SameSite=lax. Access token 30 min; refresh 7 días con rotación one-time-use.

## Troubleshooting

- **Caddy no emite el certificado**: verificá que el DNS ya propague (`dig +short $DOMAIN`) y que 80/443 estén abiertos. Logs: `docker logs crow_caddy`.
- **El API no arranca**: `docker logs crow_api` — los errores de configuración (SECRET_KEY, REDIS_URL, CORS) son RuntimeError con mensaje explícito.
- **502 en el sitio**: el API todavía está arrancando (migraciones); el healthcheck lo marca `healthy` cuando `/api/health` responde.
