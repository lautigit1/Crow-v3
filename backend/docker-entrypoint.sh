#!/bin/sh
set -e

# Arranque del contenedor de la API.
#
# Alembic es la única fuente del esquema, en todos los entornos y también
# sobre una base vacía: `alembic upgrade head` la arma entera desde la
# migración base (021). Antes no había migración base -- la cadena vieja
# arrancaba con un ALTER TABLE -- y las bases vacías salían de `create_all()`
# más un `stamp head`, con lo que las migraciones no se ejercían nunca. Ver el
# docstring de alembic/versions/021_esquema_base.py.

# --- Base con tablas pero sin control de Alembic ----------------------------
# Solo puede ser un volumen creado por `create_all()` antes de que existiera la
# migración base. Alembic lo vería como vacío e intentaría crear las tablas
# encima, así que se corta acá con un mensaje en vez de un "relation already
# exists" a mitad de camino. Si el esquema coincide con el de la 021 (cualquier
# volumen de desarrollo de antes de la consolidación), alcanza con marcarla:
#     docker compose run --rm api alembic stamp 021
#
# La consulta devuelve una palabra en vez de un exit code: con `set -e`, un
# comando suelto que devuelve 1 aborta el script entero.
ESTADO_BASE="$(python - <<'PY'
from sqlalchemy import create_engine, inspect
from app.core.config import settings

engine = create_engine(settings.alembic_database_url)
tablas = set(inspect(engine).get_table_names())
print("sin_alembic" if tablas and "alembic_version" not in tablas else "ok")
PY
)"

if [ "$ESTADO_BASE" = "sin_alembic" ]; then
  echo "✗ La base tiene tablas pero no tabla alembic_version: no se sabe en qué revisión está." >&2
  echo "  Si es un volumen de desarrollo creado antes de la migración base, marcalo con:" >&2
  echo "      docker compose run --rm api alembic stamp 021" >&2
  exit 1
fi

# Se imprime la revisión antes y después para que el log diga sin ambigüedad
# si el esquema cambió o ya estaba al día. Sin esto, `alembic upgrade head`
# sobre una base actualizada no imprime nada y es imposible distinguir "no
# había nada que aplicar" de "no llegó a correr".
#
# `alembic current` manda su ruido informativo a stderr, así que se descarta;
# lo que queda en stdout es la revisión sola.
REV_ANTES="$(alembic current 2>/dev/null | head -1)"
echo "→ Esquema de la base antes: ${REV_ANTES:-sin migrar}"

echo "→ Aplicando migraciones pendientes (alembic upgrade head)"
alembic upgrade head

REV_DESPUES="$(alembic current 2>/dev/null | head -1)"
if [ "$REV_ANTES" = "$REV_DESPUES" ]; then
  echo "✓ La base ya estaba al día en la revisión ${REV_DESPUES}. No se aplicó ninguna migración."
else
  echo "✓ Esquema actualizado: ${REV_ANTES:-sin migrar} → ${REV_DESPUES}"
fi

echo "→ Seed idempotente"
python -m app.seed

exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers "${UVICORN_WORKERS:-2}"
