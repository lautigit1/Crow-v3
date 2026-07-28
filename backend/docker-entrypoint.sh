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

# --- En qué estado viene la base --------------------------------------------
# Hay tres situaciones posibles y cada una necesita algo distinto. La consulta
# se hace una sola vez y devuelve una palabra, en vez de encadenar chequeos
# con exit codes: con `set -e` activo un comando suelto que devuelve 1 aborta
# el script entero, y acá "no" es una respuesta válida, no un error.
#
#   gestionada → ya tiene `alembic_version`. Caso normal: se aplican las
#                migraciones pendientes y listo.
#
#   legacy     → tiene las tablas pero ninguna fila en `alembic_version`. Es
#                un volumen viejo creado por `create_all()`. Alembic lo ve
#                como vacío e intenta correr 001, que falla con "relation
#                already exists". Se lo marca en 012 (el esquema que esas
#                bases tienen) y de ahí en adelante todo sigue normal.
#
#   vacia      → base recién creada, sin una sola tabla. Es el caso de CI y
#                el de cualquiera que arranque de cero.
#
# El caso `vacia` es el que rompió el CI de Playwright y merece explicación,
# porque la solución parece al revés de lo esperable.
#
# La cadena de migraciones NO contiene el esquema base: la 001 es
# "add_user_updated_at_last_login", que hace ALTER TABLE users. Nunca hubo
# una migración 000 que creara las tablas -- el proyecto empezó a usar
# Alembic cuando la base ya existía, y el esquema inicial siempre lo armó
# `create_all()` desde los modelos. Sobre una base vacía, entonces,
# `alembic upgrade head` muere en la primera migración con "relation users
# does not exist", el entrypoint se corta por `set -e` y el contenedor queda
# unhealthy. Que es exactamente lo que pasó.
#
# Así que para una base vacía el camino correcto es el de siempre: armar el
# esquema con `create_all()` (los modelos ya reflejan hasta la 018) y marcarla
# en head. Lo que create_all() no sabe hacer -- extensión pg_trgm, índices
# GIN, check constraints, que viven solo en las migraciones -- lo agrega
# `reconcile()` durante el seed, unas líneas más abajo.
#
# LIMITACIÓN CONOCIDA: en una base vacía las migraciones no se ejercen, que
# era justamente una de las dos razones para meter Alembic en desarrollo.
# Sí se ejercen sobre cualquier base existente, que es el caso más frecuente
# y el más riesgoso. Cerrar el hueco del todo requiere una migración 000 con
# el esquema base, y eso es un cambio propio, no algo para colar acá.
ESTADO_BASE="$(python - <<'PY'
from sqlalchemy import create_engine, inspect
from app.core.config import settings

engine = create_engine(settings.alembic_database_url)
tablas = set(inspect(engine).get_table_names())
if "alembic_version" in tablas:
    print("gestionada")
elif "products" in tablas:
    print("legacy")
else:
    print("vacia")
PY
)"

case "$ESTADO_BASE" in
  legacy)
    echo "→ Base preexistente sin control de Alembic: marcándola en la revisión 012"
    alembic stamp 012
    ;;
  vacia)
    echo "→ Base vacía: creando el esquema desde los modelos y marcándola al día"
    python -c "
from app.core.database import Base, engine
import app.models  # noqa: F401  -- registra todos los modelos en Base.metadata
Base.metadata.create_all(bind=engine)
print('  esquema creado')
"
    alembic stamp head
    ;;
esac

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
