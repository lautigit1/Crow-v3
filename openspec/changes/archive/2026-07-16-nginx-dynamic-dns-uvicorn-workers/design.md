# Design: nginx-dynamic-dns-uvicorn-workers

## nginx: por qué una variable, y no solo agregar `resolver`

Agregar únicamente la directiva `resolver 127.0.0.11;` no alcanza. nginx solo vuelve a resolver un hostname en tiempo de ejecución cuando `proxy_pass` apunta a una **variable** -- si el argumento de `proxy_pass` es un literal (`http://api:8000/`), nginx lo resuelve una única vez al parsear la configuración (al arrancar o al hacer `nginx -s reload`), sin importar que el `resolver` esté declarado. Por eso el fix real es:

```nginx
resolver 127.0.0.11 valid=30s;
set $upstream_api http://api:8000;
...
proxy_pass $upstream_api/api/;
```

`127.0.0.11` es la IP fija del servidor DNS embebido que Docker inyecta en todo contenedor conectado a una red de Compose/bridge definida por el usuario (la red `crow_net` de este stack). `valid=30s` sobreescribe el TTL que ese DNS devuelva, forzando una re-resolución cada 30 segundos como máximo -- suficientemente rápido para que un `docker compose up -d --build api` (que crea un contenedor nuevo con IP nueva) se refleje en nginx sin reiniciarlo, y suficientemente espaciado para no generar tráfico DNS innecesario en cada request.

Se aplicó a ambos `location` que proxean al backend (`/api/*` y el bloque de `sitemap.xml`/`robots.txt`), que antes tenían el mismo problema por separado.

## uvicorn --workers: por qué el resto del stack ya estaba listo

Antes de tocar el `Dockerfile`, se verificó que agregar `--workers` no iba a introducir bugs de estado compartido entre procesos:

- **Rate limiting y blocklist de tokens**: `app/main.py`, en `lifespan()`, ya hace `raise RuntimeError` si `ENVIRONMENT=production` y `REDIS_URL` está vacía, con un mensaje que dice explícitamente que es "para que la revocación de tokens y el rate limiting sean consistentes entre workers". Es decir, el código ya asumía multi-worker y ya tenía la guarda -- solo faltaba efectivamente lanzar más de un worker.
- **Pool de conexiones a Postgres**: cada worker uvicorn es un proceso Python separado, así que cada uno abre su propio pool de SQLAlchemy (`DB_POOL_SIZE=5` + `DB_MAX_OVERFLOW` de overflow). Con N workers, eso son N pools independientes golpeando a la base. `docker-compose.prod.yml` ya corre `pgbouncer` (modo `transaction`, `MAX_CLIENT_CONN=200`, `DEFAULT_POOL_SIZE=20`) con un comentario que dice textualmente que está ahí para permitir "escalar el API... a `uvicorn --workers N`... sin tocar esto de nuevo". El pgbouncer ya fue diseñado anticipando este cambio exacto (cambio `pgbouncer-and-commit-conventions` de una sesión anterior).

Con ambas piezas ya confirmadas, agregar el flag fue seguro.

## Configurable vía env var, no hardcodeado

`--workers ${UVICORN_WORKERS:-2}` en el `CMD` del Dockerfile en vez de un número fijo: la cantidad óptima de workers depende de los cores disponibles en el servidor real (regla general ~2×cores), que varía según dónde se despliegue. Fijar un número en la imagen forzaría un rebuild para ajustarlo; con la env var, se cambia en `.env` y un `docker compose up -d` (sin `--build`) alcanza.

Defaults elegidos:
- **Dev** (`docker-compose.yml`): `2` -- alcanza para ejercitar el comportamiento multi-worker localmente (y así detectar temprano cualquier bug de estado no compartido) sin consumir de más en la máquina de desarrollo.
- **Prod** (`docker-compose.prod.yml`): `4` -- punto de partida razonable, documentado como ajustable según el servidor real.

## Verificación en este entorno (sin Docker)

No se pudo levantar el stack real (`docker compose up`) para confirmar en caliente que nginx redescubre un contenedor `api` recreado, ni que uvicorn efectivamente levanta 4 procesos -- limitación ya documentada en cambios anteriores de esta sesión (sin daemon de Docker en el sandbox). Se verificó lo que sí es posible sin Docker:

- `python3 -c "import yaml; yaml.safe_load(...)"` sobre `docker-compose.yml` y `docker-compose.prod.yml` -- ambos YAML válidos tras agregar `UVICORN_WORKERS`.
- `sh -n` sobre el `CMD` completo del Dockerfile (con la sustitución de variable incluida) -- sintaxis de shell válida.
- El patrón `resolver <docker-dns> valid=<ttl>; set $var http://host:port; proxy_pass $var/path;` es el patrón oficial y ampliamente documentado para este problema exacto en nginx dentro de Docker (no es una técnica experimental) -- se revisó manualmente contra la sintaxis de las directivas `resolver`, `set` y `proxy_pass` de la documentación de nginx.

La confirmación end-to-end (nginx sigue sirviendo tras recrear `api` con IP nueva; 4 procesos uvicorn visibles en `docker compose top api`) queda pendiente para el primer deploy real donde haya Docker disponible.
