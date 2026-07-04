# Apply: prod-readiness-fixes

## Archivos modificados

### Backend
- `backend/docker-compose.yml` — eliminado `volumes: - ./:/app`. El contenedor
  ya no monta el código fuente del host; corre solo con lo copiado en el
  build de la imagen.
- `backend/README.md` — aclarado que este Compose es exclusivamente para
  desarrollo local y que el stack de producción es el `docker-compose.yml`
  raíz.
- `backend/app/core/config.py` — nueva property `has_insecure_cors` en
  `Settings`, detecta si algún origin de `BACKEND_CORS_ORIGINS` contiene
  `localhost` o `127.0.0.1`.
- `backend/app/main.py` — nuevo guard en `lifespan()`: si
  `ENVIRONMENT=production` y `has_insecure_cors`, el arranque falla con
  `RuntimeError` (mismo patrón que el guard existente de `SECRET_KEY`).
- `backend/alembic/versions/008_quote_audit_indexes.py` — nueva migración:
  índice `ix_quotes_user_id` en `quotes.user_id` e índice descendente
  `ix_audit_logs_created_at` en `audit_logs.created_at`.

## Verificación

- Se leyó el contenido completo de cada archivo modificado/creado
  (`config.py`, `main.py`, `docker-compose.yml`, migración 008) para
  confirmar sintaxis correcta y consistencia con el resto del código.
- **No se pudo correr `pytest`** en este sandbox: no hay acceso de red a
  PyPI para instalar `requirements.txt`/`requirements-dev.txt` (proxy
  devuelve 403). Se recomienda correr `pytest` en un entorno con las
  dependencias instaladas antes de mergear, aunque el cambio es de bajo
  riesgo (un guard de arranque adicional que replica un patrón ya testeado,
  dos índices nuevos que no alteran ningún query existente, y la remoción de
  un bind mount de Docker que no afecta código Python).

## Desviaciones del plan

- Ninguna. Se implementó tal como estaba diseñado en `design.md`.

## Nota sobre el resto de la auditoría

- El ítem de "CHECK constraints faltantes en DB" que se había marcado como
  pendiente en una revisión anterior **ya estaba resuelto** desde la
  migración `005_product_check_constraints.py` (`stock >= 0`, `price > 0`).
  No requirió trabajo adicional en este change.
