# Design: db-integrity-verify

## Estructura del script

Sigue el mismo patrón que `backend/scripts/reset_admin.py` (ya existente):
`sys.path.insert(0, "/app")`, usa `SessionLocal` de `app.core.database`,
pensado para correr con `docker compose exec api python scripts/...`.

Una lista `CHECKS` de tuplas `(kind, name, check_sql, fix_sql)`:

- `check_sql`: `SELECT 1 FROM pg_indexes WHERE indexname = '...'` para
  índices, `SELECT 1 FROM pg_extension WHERE extname = '...'` para la
  extensión, `SELECT 1 FROM pg_constraint WHERE conname = '...'` para
  los CHECK constraints.
- `fix_sql`: el `CREATE INDEX IF NOT EXISTS` / `CREATE EXTENSION IF NOT
  EXISTS` / `ALTER TABLE ... ADD CONSTRAINT ...` correspondiente --
  copiado literal de la migración original (003/005/006/008) para no
  introducir divergencia entre lo que Alembic *cree* que aplicó y lo
  que este script aplica de verdad.

`main()` recorre la lista, imprime `OK`/`FALTA` por cada objeto, y al
final aplica (en una sola transacción, con `commit()` al terminar) solo
los que faltan. Si no falta nada, no toca la base.

## Por qué no usar `alembic downgrade` + `upgrade` en su lugar

Sería más "correcto" en teoría, pero downgradear 003/005/006/008 (que
also incluyen `drop_column`/`drop_index` de otras cosas por el camino
en migraciones intermedias como la 004) es más arriesgado en una base
con datos reales que ya tiene todo lo demás bien. El script dirigido es
más seguro: toca únicamente los objetos puntuales que están en duda, sin
tocar nada que ya sabemos que está bien (columnas, que sí las creó
`create_all()`).

## Qué NO hace

- No valida datos existentes contra los nuevos CHECK constraints antes
  de crearlos (si hubiera algún `stock < 0` cargado a mano, el
  `ALTER TABLE ADD CONSTRAINT` fallaría con un error claro de Postgres
  -- aceptable, no se espera que pase en esta base).
- No se agrega a CI ni a ningún healthcheck -- es una herramienta de
  reconciliación manual, para correr una vez y no pensar más en esto.
