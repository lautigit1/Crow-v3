# Apply: dev-pg-trgm-autofix

## Archivos modificados

- `backend/app/main.py` — import de `text` de sqlalchemy; en la rama de
  desarrollo del `lifespan`, después de `create_all()`, se ejecuta
  `CREATE EXTENSION IF NOT EXISTS pg_trgm` contra Postgres (solo si el
  dialecto es `postgresql`; se saltea en SQLite/tests). Envuelto en
  try/except para no romper el arranque si el usuario de DB no tiene
  permisos de superusuario -- en ese caso queda un warning en el log.

## Verificación

- Lectura completa de `main.py` tras el cambio -- sintaxis e indentación
  correctas, no rompe el flujo existente de `TESTING`/producción.
- No se pudo reiniciar un contenedor real ni correr `pytest` en este
  sandbox para confirmar en caliente. Recomiendo:
  1. `docker compose down -v && docker compose up --build` (recrea todo
     desde cero) y confirmar en los logs la línea
     `pg_trgm extension ensured (dev mode)`.
  2. Buscar en `/catalogo` con texto -- ya no debería tirar 503.

## Nota — deuda técnica relacionada (no resuelta acá)

Este mismo problema (constraints/índices declarados solo en Alembic, no en
los modelos de SQLAlchemy) afecta también a los `CHECK` constraints de la
migración 005 y a los índices de las migraciones 006/008: en modo
desarrollo con `create_all()`, ninguno de esos se aplica tampoco. A
diferencia de `pg_trgm`, su ausencia no rompe ninguna feature activa (los
constraints son una capa de seguridad extra a nivel DB, los índices son
solo de performance), así que no es urgente, pero corresponde documentarlo:
si en algún momento se quiere una base de dev 100% fiel a producción, la
solución de fondo es dejar de usar `create_all()` en dev y correr
`alembic upgrade head` desde una base vacía en todos los entornos.

## Desviaciones del plan

- Ninguna.
