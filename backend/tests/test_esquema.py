"""
El esquema que arman las migraciones tiene que ser el que describen los modelos.

La suite corre sobre una base armada con `alembic upgrade head` (ver
conftest.py). Estos tests comparan esa base contra `Base.metadata`, así que
fallan en los dos casos que antes pasaban en silencio:

- se cambia un modelo y nadie escribe la migración;
- una migración crea algo distinto de lo que dice el modelo.

La cadena vieja de migraciones tenía exactamente el segundo problema -- la 007
creaba el enum `orderstatus` con 'Pendiente' cuando el ORM guarda 'PENDIENTE'
-- y nadie lo vio en meses porque ninguna base se armaba con ella. Ver
alembic/versions/021_esquema_base.py.
"""

from alembic.autogenerate import compare_metadata
from alembic.migration import MigrationContext
from sqlalchemy import Enum, text

import app.models  # noqa: F401 -- registra todos los modelos en Base.metadata
from app.core.database import Base
from tests.conftest import engine


def test_las_migraciones_arman_el_esquema_de_los_modelos():
    with engine.connect() as conn:
        ctx = MigrationContext.configure(
            conn, opts={"compare_type": True, "compare_server_default": True}
        )
        diferencias = compare_metadata(ctx, Base.metadata)

    assert diferencias == [], (
        "Modelos y migraciones no coinciden. Si cambiaste un modelo, generá la "
        "migración con `alembic revision --autogenerate`. Diferencias:\n"
        + "\n".join(repr(d) for d in diferencias)
    )


def test_los_enums_de_la_base_tienen_las_etiquetas_que_guarda_el_orm():
    """`compare_metadata` no compara los valores de un ENUM, solo que exista.

    SQLAlchemy persiste el NOMBRE del miembro ("SIN_COBRAR"), no su valor
    legible ("Sin cobrar"). Un tipo creado con los valores anda hasta el primer
    INSERT real, que revienta con "invalid input value for enum".
    """
    esperados = {
        columna.type.name: list(columna.type.enums)
        for tabla in Base.metadata.tables.values()
        for columna in tabla.columns
        if isinstance(columna.type, Enum)
    }
    assert esperados, "no se encontró ningún enum en los modelos"

    with engine.connect() as conn:
        filas = conn.execute(
            text(
                "SELECT t.typname, array_agg(e.enumlabel ORDER BY e.enumsortorder) "
                "FROM pg_type t JOIN pg_enum e ON e.enumtypid = t.oid GROUP BY t.typname"
            )
        ).all()
    en_la_base = {nombre: list(etiquetas) for nombre, etiquetas in filas}

    assert en_la_base == esperados
