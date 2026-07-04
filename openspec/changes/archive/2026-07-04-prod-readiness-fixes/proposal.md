# Proposal: prod-readiness-fixes

## What

Cerrar los últimos puntos pendientes de la auditoría técnica de Crow v3 que
todavía no estaban resueltos tras `critical-fixes`, `trusted-proxy` y
`redis-integration`:

1. `backend/docker-compose.yml` monta el código fuente del host dentro del
   contenedor (`volumes: - ./:/app`).
2. No hay ninguna validación que impida que la API arranque en
   `ENVIRONMENT=production` con `BACKEND_CORS_ORIGINS` todavía apuntando a
   `localhost`.
3. Faltan índices en `quotes.user_id` y `audit_logs.created_at`, señalados en
   la auditoría original como necesarios para las queries más comunes
   (historial de cotizaciones por usuario, listado de auditoría por fecha).

## Why

- **Volumen de código fuente**: si el contenedor de `backend/docker-compose.yml`
  se usa fuera de desarrollo local, un proceso comprometido podría escribir
  directamente sobre el código fuente del host. No hay ningún indicio en el
  Compose de que ese archivo es solo para desarrollo.
- **CORS permisivo**: `BACKEND_CORS_ORIGINS` tiene como default
  `http://localhost:5173,http://127.0.0.1:5173`. Si alguien deploya a
  producción sin sobreescribir esa variable, la API acepta requests
  credenciales desde localhost — el mismo patrón de riesgo que ya se corrigió
  para `SECRET_KEY` (arranque inseguro por defecto no detectado).
- **Índices faltantes**: `GET /quotes/me` y `GET /audit` hacen table scans a
  medida que crecen esas tablas. Ya existe el patrón de partial indexes
  (migración 006), así que agregar estos dos es de bajo costo y alto
  beneficio.

## Non-goals

- No se agrega un `docker-compose.prod.yml` separado (fuera de scope; se
  corrige el archivo existente).
- No se migra el rate limiter ni el blocklist (ya resuelto en
  `redis-integration`).
- No se agregan más índices que los dos señalados explícitamente en la
  auditoría (queda para un change futuro si aparecen otros patrones lentos).

## Success criteria

- `backend/docker-compose.yml` ya no monta el código fuente del host; el
  contenedor corre únicamente con lo que se copió en el build de la imagen.
- Si `ENVIRONMENT=production` y `BACKEND_CORS_ORIGINS` contiene
  `localhost`/`127.0.0.1`, el arranque de FastAPI falla con un mensaje claro
  (mismo patrón que la validación de `SECRET_KEY`).
- `quotes.user_id` tiene un índice B-tree.
- `audit_logs.created_at` tiene un índice descendente.
- Los tests de backend existentes siguen pasando.
