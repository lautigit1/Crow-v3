"""
Verifica que los objetos de las migraciones 003, 005, 006 y 008 -- los
que se agregan con SQL crudo y NO están declarados en los modelos de
SQLAlchemy -- existan de verdad en la base, y crea los que falten.

Por que hace falta esto:
Si la base se armo en algun momento con `Base.metadata.create_all()`
en vez de partir de Alembic desde cero, ese comando crea las columnas
que estan en los modelos, pero no sabe nada de extensiones, CHECK
constraints ni indices parciales que solo viven en los archivos de
`alembic/versions/`. Si despues se hizo `alembic stamp <rev>` para
destrabar migraciones nuevas (en vez de correr todo desde el principio),
Alembic queda pensando que esos objetos ya estan aplicados y nunca los
vuelve a intentar -- aunque en la base real no existan.

Idempotente: correrlo de nuevo no rompe nada, solo crea lo que falte.

Correr dentro del contenedor:
    docker compose exec api python scripts/verify_db_integrity.py
Si el contenedor no esta levantado o esta reiniciando:
    docker compose run --rm api python scripts/verify_db_integrity.py
"""
import sys

sys.path.insert(0, "/app")

from sqlalchemy import text  # noqa: E402

from app.core.database import SessionLocal  # noqa: E402

# (tipo, nombre, sql de chequeo, sql para crearlo si falta)
CHECKS: list[tuple[str, str, str, str]] = [
    (
        "extension", "pg_trgm",
        "SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm'",
        "CREATE EXTENSION IF NOT EXISTS pg_trgm",
    ),
    (
        "indice GIN", "ix_products_name_trgm",
        "SELECT 1 FROM pg_indexes WHERE indexname = 'ix_products_name_trgm'",
        "CREATE INDEX IF NOT EXISTS ix_products_name_trgm "
        "ON products USING gin (name gin_trgm_ops)",
    ),
    (
        "indice GIN", "ix_products_description_trgm",
        "SELECT 1 FROM pg_indexes WHERE indexname = 'ix_products_description_trgm'",
        "CREATE INDEX IF NOT EXISTS ix_products_description_trgm "
        "ON products USING gin (description gin_trgm_ops)",
    ),
    (
        "indice GIN", "ix_products_sku_trgm",
        "SELECT 1 FROM pg_indexes WHERE indexname = 'ix_products_sku_trgm'",
        "CREATE INDEX IF NOT EXISTS ix_products_sku_trgm "
        "ON products USING gin (sku gin_trgm_ops)",
    ),
    (
        "check constraint", "ck_products_stock_nonnegative",
        "SELECT 1 FROM pg_constraint WHERE conname = 'ck_products_stock_nonnegative'",
        "ALTER TABLE products ADD CONSTRAINT ck_products_stock_nonnegative "
        "CHECK (stock >= 0)",
    ),
    (
        "check constraint", "ck_products_price_positive",
        "SELECT 1 FROM pg_constraint WHERE conname = 'ck_products_price_positive'",
        "ALTER TABLE products ADD CONSTRAINT ck_products_price_positive "
        "CHECK (price IS NULL OR price > 0)",
    ),
    (
        "indice parcial", "ix_products_active_category",
        "SELECT 1 FROM pg_indexes WHERE indexname = 'ix_products_active_category'",
        "CREATE INDEX IF NOT EXISTS ix_products_active_category "
        "ON products (category_id) WHERE is_deleted = false",
    ),
    (
        "indice parcial", "ix_products_active_brand",
        "SELECT 1 FROM pg_indexes WHERE indexname = 'ix_products_active_brand'",
        "CREATE INDEX IF NOT EXISTS ix_products_active_brand "
        "ON products (brand_id) WHERE is_deleted = false",
    ),
    (
        "indice parcial", "ix_products_active_vehicle",
        "SELECT 1 FROM pg_indexes WHERE indexname = 'ix_products_active_vehicle'",
        "CREATE INDEX IF NOT EXISTS ix_products_active_vehicle "
        "ON products (vehicle_type) WHERE is_deleted = false",
    ),
    (
        "indice parcial", "ix_products_active_featured",
        "SELECT 1 FROM pg_indexes WHERE indexname = 'ix_products_active_featured'",
        "CREATE INDEX IF NOT EXISTS ix_products_active_featured "
        "ON products (is_featured) WHERE is_deleted = false",
    ),
    (
        "indice", "ix_quotes_user_id",
        "SELECT 1 FROM pg_indexes WHERE indexname = 'ix_quotes_user_id'",
        "CREATE INDEX IF NOT EXISTS ix_quotes_user_id ON quotes (user_id)",
    ),
    (
        "indice", "ix_audit_logs_created_at",
        "SELECT 1 FROM pg_indexes WHERE indexname = 'ix_audit_logs_created_at'",
        "CREATE INDEX IF NOT EXISTS ix_audit_logs_created_at "
        "ON audit_logs (created_at DESC)",
    ),
]


def main() -> None:
    db = SessionLocal()
    missing: list[tuple[str, str, str]] = []
    try:
        print("Verificando objetos de las migraciones 003/005/006/008...\n")
        for kind, name, check_sql, fix_sql in CHECKS:
            exists = db.execute(text(check_sql)).first() is not None
            status = "OK   " if exists else "FALTA"
            print(f"  {status}  {kind:<17} {name}")
            if not exists:
                missing.append((kind, name, fix_sql))

        if not missing:
            print("\nTodo en orden -- no hay nada que aplicar.")
            return

        print(f"\nAplicando {len(missing)} objeto(s) faltante(s)...")
        for kind, name, fix_sql in missing:
            db.execute(text(fix_sql))
            print(f"  + creado: {name}")
        db.commit()
        print("\nListo -- la base quedó reconciliada con las migraciones.")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
