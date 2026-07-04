# Design: dev-pg-trgm-autofix

## `backend/app/main.py` — lifespan, rama de desarrollo

Justo después de `Base.metadata.create_all(bind=engine)`, se intenta crear
la extensión con `CREATE EXTENSION IF NOT EXISTS` (idempotente -- no hace
nada si ya existe). Solo aplica a Postgres; en SQLite (tests) se saltea
sin generar ruido en el log.

```python
from sqlalchemy import text
# ...

elif not settings.is_production:
    Base.metadata.create_all(bind=engine)
    logger.info("DB tables ensured (create_all -- dev mode)")
    if engine.dialect.name == "postgresql":
        try:
            with engine.begin() as conn:
                conn.execute(text("CREATE EXTENSION IF NOT EXISTS pg_trgm"))
            logger.info("pg_trgm extension ensured (dev mode)")
        except Exception as exc:
            logger.warning(f"No se pudo asegurar la extension pg_trgm: {exc}")
```

No se toca la rama de producción (`else: logger.info("Production mode --
expecting Alembic migrations to have run")`) -- ahí se asume que
`alembic upgrade head` ya corrió como parte del proceso de deploy, que es
donde vive la migración 003 que crea esta misma extensión.

## Por qué acá y no en otro lado

- Es el mismo lugar donde ya se hace `create_all()` -- coherente con el
  patrón existente de "modo dev arma su propio schema on-the-fly".
- Es puramente aditivo: `CREATE EXTENSION IF NOT EXISTS` nunca falla por
  "ya existe", y el `try/except` evita que un usuario de DB sin permisos
  de superusuario rompa el arranque completo de la API por esto.
