# Design: proxy-level-rate-limiting

## nginx sobre Caddy: la razón real

Caddy es el borde real de internet en producción (único servicio que publica 80/443, ver `docker-compose.prod.yml`), así que en principio parecería el lugar más natural para rate limiting. Pero Caddy core no trae rate limiting -- requiere el módulo de terceros `caddy-ratelimit` (`github.com/mholt/caddy-ratelimit`), que no viene en la imagen oficial `caddy:2-alpine` y exige compilar un binario custom con `xcaddy` (un Dockerfile propio para Caddy, que hoy no existe en este repo). Eso es viable pero es una pieza de infraestructura nueva.

nginx, en cambio, trae `limit_req`/`limit_req_zone` de fábrica en cualquier build estándar (incluida la imagen `nginxinc/nginx-unprivileged:alpine` que ya usa `frontend/Dockerfile`) -- cero dependencias nuevas. Y a diferencia de Caddy, nginx está en el camino de cada request tanto en producción (detrás de Caddy) como en desarrollo (`docker-compose.yml`, donde no hay Caddy y `web` se expone directo en `:8080`) -- protegiendo un único punto en vez de dos, y permitiendo probarlo en dev sin necesitar el stack de producción completo.

## Dos zonas, no una sola

- **`api_general`** (20 req/s, burst 40, nodelay): cubre cualquier `/api/*` que no sea auth. El número se eligió mirando el patrón de uso real de la UI -- el catálogo dispara varios requests en paralelo al paginar/filtrar (categorías, marcas, proveedores para selects, la lista de productos), y el panel de admin hace lo mismo en `AdminProductsPage` (3 selects de soporte en paralelo al montar). 20r/s con burst 40 absorbe esos picos de uso normal sin rozar el límite; solo un flood sostenido por encima de eso lo activa.
- **`api_auth`** (5 req/s, burst 10, nodelay): más estricta para `/api/auth/*` (login, registro, refresh, reset). No reemplaza a `LoginRateLimiter` (que sigue siendo la defensa real: por IP+email, con lockout persistente en Redis) -- esta capa corta un flood de volumen alto contra esos endpoints antes de que cada intento dispare una consulta real a Redis/Postgres, complementando al limiter de aplicación con algo más barato y más temprano en el pipeline.

`nodelay` en ambas: sin él, `limit_req` encola los requests dentro del burst y los sirve espaciados (`delay`), lo cual introduce latencia artificial en tráfico legítimo que solo estaba en una ráfaga corta. Con `nodelay`, los requests dentro del burst se sirven inmediatamente y solo se rechaza lo que excede burst -- mejor UX para el caso común, sin perder la protección contra el caso de abuso.

## IP real detrás de Caddy: `ngx_http_realip_module`

Sin esto, en producción `$remote_addr` visto por nginx sería siempre la IP del contenedor `caddy` (el único peer directo de `web` en `crow_net`) -- **todo** el tráfico de **todos** los visitantes caería en el mismo balde de `limit_req`, y un solo usuario abusivo bastaría para que nginx empiece a rechazar con 429 a cualquier otro visitante real. Se agregó:

```nginx
set_real_ip_from 172.28.0.0/16;
real_ip_header X-Forwarded-For;
real_ip_recursive on;
```

Mismo criterio que ya usa el backend (`TRUSTED_PROXIES=172.28.0.0/16` en `app/core/config.py`, documentado en `client_ip()` de `audit.py`): se confía en el `X-Forwarded-For` solo cuando viene de un peer dentro de la subnet fija del stack (Caddy, en este caso). En dev, sin Caddy delante, no hay ningún peer en esa subnet mandando ese header hacia nginx desde fuera de confianza, así que `$remote_addr` sigue siendo el peer real sin cambios.

Este cambio no afecta lo que el backend ya calculaba como IP del cliente (`client_ip()` sigue tomando el primer elemento de la cadena `X-Forwarded-For`, que ya era la IP real del visitante desde antes de este cambio -- Caddy la agrega primero en la cadena). Es una corrección puramente del lado de nginx, para que su propio cálculo de rate limiting sea correcto.

## `429`, no el `503` default

`limit_req_status 429` hace que nginx devuelva el código HTTP semánticamente correcto para "demasiados requests" en vez del `503` (Service Unavailable) que usa por default -- permite en el futuro que el frontend distinga "el servidor está caído" de "estoy pidiendo demasiado, esperá" si se quisiera un manejo especial (hoy `apiError()` no lo distingue, cae al mensaje fallback genérico, que es un comportamiento aceptable para una situación que no debería ocurrir en uso normal).

## Verificación en este entorno

No se pudo levantar el stack real (`docker compose up`) para confirmar en caliente que los límites no rechazan tráfico legítimo (ej. correr los 12 tests de Playwright contra este nginx y ver que ninguno reciba 429) -- limitación ya documentada en cambios anteriores de esta sesión (sin Docker en el sandbox de verificación). Se verificó lo que sí es posible sin Docker:

- Revisión sintáctica manual: llaves balanceadas, cada directiva termina en `;`, `{` o `}` (script de Python que recorre línea por línea).
- Confirmación de que `limit_req_zone`/`limit_req_status` son válidos en contexto `http` (el archivo se incluye dentro del `http {}` de la imagen base de nginx vía `/etc/nginx/conf.d/*.conf`, patrón estándar de las imágenes oficiales de nginx en Docker) y que `limit_req`/`set_real_ip_from`/`real_ip_header`/`real_ip_recursive` son válidos en los contextos donde se usaron (`server`/`location`).
- Revisión de los 5 tests de `frontend/e2e/auth.spec.ts` para estimar el volumen real de requests a `/api/auth/*` que dispararía una corrida de E2E -- muy por debajo del burst configurado (10), incluso corriendo en paralelo.

La confirmación real de que esto no genera falsos positivos contra tráfico legítimo (incluyendo la corrida de E2E en CI) queda pendiente del primer `docker compose up` real -- si algún test de `e2e.yml` empezara a fallar con 429 después de este cambio, la zona/burst correspondiente necesitaría ajustarse.
