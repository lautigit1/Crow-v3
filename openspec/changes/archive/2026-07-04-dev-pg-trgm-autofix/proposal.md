# Proposal: dev-pg-trgm-autofix

## What

Asegurar automáticamente la extensión `pg_trgm` de Postgres al arrancar en
modo desarrollo, para que una base de datos nueva (`docker compose down -v`
+ `up`, o cualquier entorno recién creado) no rompa la búsqueda del catálogo.

## Why

Se detectó en producción-local: el usuario reinició su entorno con una base
nueva y cualquier búsqueda en `/catalogo` devolvía 503:

```
psycopg2.errors.UndefinedFunction: operator does not exist: character varying %% unknown
```

Causa raíz: en modo desarrollo (`ENVIRONMENT != production`, el default),
`main.py` usa `Base.metadata.create_all(bind=engine)` para crear el schema
en vez de correr las migraciones de Alembic. `create_all()` solo conoce
tablas/columnas/índices que están **declarados en los modelos de
SQLAlchemy** -- no ejecuta SQL arbitrario. La extensión `pg_trgm` (migración
003) se crea con `op.execute("CREATE EXTENSION ...")`, que vive únicamente
en el archivo de migración, sin ningún reflejo en los modelos. Resultado:
en cualquier base nueva levantada en modo dev, la extensión nunca se
instala, y el código de búsqueda (`products.py`) que usa el operador `%%`
de trigram falla en cuanto se hace estan cualquier extensión de Postgres.

## Non-goals

- No se resuelve el problema de fondo más amplio (que en modo dev
  `create_all()` tampoco aplica los `CHECK` constraints ni los índices
  extra agregados por Alembic en las migraciones 005/006/008 -- esos no
  rompen nada si faltan, a diferencia de `pg_trgm` que rompe una feature
  activa). Documentado como seguimiento pendiente, no se ataca en este
  change para no tocar de más bajo presión.
- No se reemplaza `create_all()` por `alembic upgrade head` en dev -- eso
  requeriría reconciliar todo el historial de migraciones con lo que
  `create_all()` ya crea (varias migraciones harían `ADD COLUMN`/`CREATE
  TABLE` sobre objetos que `create_all()` ya creó, y fallarían por "ya
  existe"). Es un cambio de arquitectura más grande, fuera de alcance acá.

## Success criteria

- Una base de datos Postgres completamente nueva, levantada en modo
  desarrollo, tiene la extensión `pg_trgm` instalada automáticamente al
  arrancar la API -- sin pasos manuales.
- Si la extensión no se puede crear (ej. permisos insuficientes del usuario
  de DB), el arranque de la API no se rompe: se loguea un warning y el
  proceso sigue. (La búsqueda seguiría fallando en ese caso puntual --
  hacer que `products.py` degrade a solo `LIKE` cuando la extensión falta
  queda fuera de este change, ver Non-goals.)
