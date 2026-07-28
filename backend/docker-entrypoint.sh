#!/bin/sh
set -e

# Arranque del contenedor de la API.
#
# Hasta ahora las migraciones corrían SOLO con ENVIRONMENT=production. En
# desarrollo el esquema lo armaba `Base.metadata.create_all()` desde el seed,
# que crea tablas faltantes pero nunca agrega columnas a una tabla que ya
# existe. Eso tenía dos consecuencias molestas:
#
#   1. Agregar una columna a un modelo rompía el contenedor de cualquiera que
#      ya tuviera el volumen creado -- el seed hacía SELECT de una columna que
#      Postgres no tenía y el arranque moría con "dependency api failed to
#      start", sin decir por qué.
#   2. Más grave: las migraciones no se ejecutaban nunca en desarrollo. Una
#      migración con un error se descubría recién en producción, que es el
#      único lugar donde no querés descubrirla.
#
# Ahora Alembic es la fuente de verdad del esquema en los dos entornos.

# --- Bases anteriores a este cambio -----------------------------------------
# Un volumen creado por `create_all()` tiene todas las tablas pero ninguna
# fila en `alembic_version`: Alembic lo ve como una base vacía e intenta
# correr 001 en adelante, que falla con "relation already exists". Se lo
# marca como que ya está en 012 (el esquema que esas bases tienen) y a partir
# de ahí las migraciones nuevas se aplican normalmente.
#
# El caso opuesto -- base recién creada, sin tablas -- no entra acá y corre
# la cadena completa desde 001, que es lo que se quiere: así el arranque de
# desarrollo ejerce las migraciones de verdad.
# El chequeo va como condición de un `if` y no como comando suelto seguido de
# `$?`: con `set -e` activo, un exit code distinto de 0 en un comando suelto
# aborta el script entero, y acá el "1" es una respuesta válida ("no es una
# base legacy"), no un error.
if python - <<'PY'
import sys
from sqlalchemy import create_engine, inspect
from app.core.config import settings

engine = create_engine(settings.alembic_database_url)
tablas = set(inspect(engine).get_table_names())
# "products existe pero alembic_version no" == base legacy de create_all()
sys.exit(0 if ("products" in tablas and "alembic_version" not in tablas) else 1)
PY
then
  echo "→ Base preexistente sin control de Alembic: marcándola en la revisión 012"
  alembic stamp 012
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
