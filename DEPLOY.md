# Deploy a producción — Crow Repuestos

Stack de producción: `docker-compose.prod.yml` (Postgres + pgbouncer + Redis + FastAPI + nginx + Caddy con TLS automático).

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

3. Levantar (ver "Versionado y rollback" abajo para qué es `IMAGE_TAG`; `latest` alcanza para el primer deploy):

   ```bash
   docker compose -f docker-compose.prod.yml pull
   docker compose -f docker-compose.prod.yml up -d
   ```

   En el arranque el API corre `alembic upgrade head` (migraciones) y el seed idempotente (solo crea el admin; en producción no se carga producto demo).

4. Verificar:

   ```bash
   docker compose -f docker-compose.prod.yml ps          # todo healthy
   curl -s https://$DOMAIN/api/health                     # {"status":"ok",...}
   ```

## Actualizaciones

```bash
git pull                                          # solo para traer el docker-compose.prod.yml/.env.example más nuevos
docker compose -f docker-compose.prod.yml pull    # baja la imagen `latest` (o la que esté en IMAGE_TAG) desde GHCR
docker compose -f docker-compose.prod.yml up -d
```

Las migraciones nuevas se aplican solas en el arranque del API. `api`/`web` corren sobre imágenes ya construidas (`image:`, no `build:` -- ver más abajo), así que este paso no rebuildea nada en el servidor: solo descarga y reinicia.

## Versionado y rollback

`api`/`web` son imágenes publicadas en GitHub Container Registry (GHCR), no se buildean en el servidor. `.github/workflows/release.yml` las construye y publica automáticamente cada vez que se pushea un tag `vX.Y.Z` a git (mismo esquema SemVer que ya documenta `CONTRIBUTING.md`), taggeando ambas imágenes con esa versión y con `latest`:

```bash
git tag -a v1.4.0 -m "v1.4.0"
git push origin v1.4.0
# unos minutos después: ghcr.io/lautigit1/crow-v3-api:1.4.0 y crow-v3-web:1.4.0 ya existen
```

### Desplegar una versión específica

`docker-compose.prod.yml` lee la variable `IMAGE_TAG` (default `latest`). Para fijar una versión exacta en vez de seguir siempre la última:

```bash
# en .env
IMAGE_TAG=1.4.0
```

```bash
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

### Rollback

Si una versión nueva rompe algo en producción, volver a la anterior es el mismo procedimiento con un tag más viejo -- **no requiere rebuildear nada** (esa es la razón de ser de este esquema: la imagen vieja ya existe en GHCR, intacta):

```bash
# en .env
IMAGE_TAG=1.3.2   # la última versión conocida como buena
```

```bash
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml ps           # confirmar healthy
curl -s https://$DOMAIN/api/health
```

**Cuidado con las migraciones de base de datos.** El API corre `alembic upgrade head` automáticamente en cada arranque -- eso significa que si la versión rota ya corrió una migración nueva antes de fallar, volver a una imagen vieja del *código* no revierte el *schema*. Antes de bajar `IMAGE_TAG`, revisar si el deploy roto agregó una migración (`backend/alembic/versions/`, buscar las más recientes con `git log --oneline -- backend/alembic/versions/` en el tag roto vs. el anterior):

- **Si no hay migración nueva de por medio**: el rollback de arriba alcanza, sin pasos extra.
- **Si hay una migración nueva y es reversible** (tiene un `downgrade()` real, no `pass`): correr `alembic downgrade -1` manualmente contra la base *antes* de bajar la imagen (`docker compose -f docker-compose.prod.yml exec api alembic downgrade -1`, o desde un contenedor temporal con la imagen vieja si el `api` ya no levanta).
- **Si hay una migración nueva no reversible, o no se puede confirmar rápido cuál es el estado del schema**: no forzar un `alembic downgrade` a ciegas -- restaurar el último backup de Postgres de antes del deploy roto es más seguro (`./deploy/restore-postgres.sh deploy/backups/<archivo>.sql.gz`, ver la sección de Backups) y recién ahí bajar `IMAGE_TAG`.

En cualquier caso, `web` (el frontend estático) no tiene este problema -- es un rollback sin estado, cambiar su tag es siempre seguro.

## Backups

Lo único con estado real es Postgres (volumen `crow_pgdata`). `deploy/backup-postgres.sh` automatiza lo que antes era un comando manual que nadie corría en la práctica:

```bash
./deploy/backup-postgres.sh
```

Hace `pg_dump` + gzip con nombre timestampeado en `deploy/backups/` (ignorado por git), y borra automáticamente los backups de más de 14 días (`RETENTION_DAYS`, configurable). Para automatizarlo con cron, todos los días a las 3am:

```bash
crontab -e
# agregar:
0 3 * * * /ruta/al/repo/deploy/backup-postgres.sh >> /var/log/crow-backup.log 2>&1
```

Restaurar (pide confirmación explícita antes de sobreescribir la DB):

```bash
./deploy/restore-postgres.sh deploy/backups/crow-repuestos-20260713-030000.sql.gz
```

**Importante — esto no es un backup offsite.** Vive en el mismo disco que la base de datos, así que no protege contra la pérdida del servidor completo. Complementalo con una copia periódica a almacenamiento externo (`rclone`, `aws s3 cp`, etc.) después de correr el script — no está automatizado en este repo porque depende de qué proveedor de storage se use.

Redis persiste en `crow_redisdata` (AOF) pero solo guarda estado efímero (rate limits, tokens revocados, cache del dashboard) — no necesita backup.

## Decisiones de seguridad ya cableadas

- `ENVIRONMENT=production` hace fail-fast si falta `SECRET_KEY`, si `REDIS_URL` está vacía, o si el CORS sigue apuntando a localhost. Swagger (`/docs`) queda deshabilitado.
- Solo Caddy publica puertos; API, Postgres y Redis viven en la red interna `crow_net` (subnet fija `172.28.0.0/16`, confiada vía `TRUSTED_PROXIES` para que `X-Forwarded-For` funcione).
- Cookies de auth: HttpOnly, `Secure` (solo HTTPS), SameSite=lax. Access token 30 min; refresh 7 días con rotación one-time-use.

## Troubleshooting

- **Caddy no emite el certificado**: verificá que el DNS ya propague (`dig +short $DOMAIN`) y que 80/443 estén abiertos. Logs: `docker logs crow_caddy`.
- **El API no arranca**: `docker logs crow_api` — los errores de configuración (SECRET_KEY, REDIS_URL, CORS) son RuntimeError con mensaje explícito.
- **502 en el sitio**: el API todavía está arrancando (migraciones); el healthcheck lo marca `healthy` cuando `/api/health` responde.
- **El API no conecta a la base**: revisar `docker logs crow_pgbouncer` — el API pega a `pgbouncer:6432`, no directo a `db:5432` (ver comentario en el servicio `pgbouncer` de `docker-compose.prod.yml`). Las migraciones de Alembic van directo a `db` vía `ALEMBIC_DATABASE_URL`, así que un problema de pgbouncer no bloquea el arranque de `alembic upgrade head` pero sí las queries normales del API.
