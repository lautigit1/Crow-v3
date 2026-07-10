"""
Verifica que los objetos de las migraciones 003, 005, 006, 008, 009, 010
y 011 existan de verdad en la base, y crea los que falten.

Por que hace falta esto:
Si la base se armo en algun momento con `Base.metadata.create_all()`
en vez de partir de Alembic desde cero, ese comando crea las tablas que
faltan con la forma *actual* del modelo, pero:

  1. NO altera una tabla que ya existe para agregarle una columna nueva
     (ej: `products.cost_price`/`margin_pct` de la migracion 010, o
     `orders.payment_method` de la 009) -- si la tabla ya estaba creada
     de una corrida anterior, esa columna nunca aparece.
  2. No sabe nada de extensiones, CHECK constraints ni indices parciales
     que solo viven en los archivos de `alembic/versions/` como SQL
     crudo (no estan declarados en los modelos de SQLAlchemy).

Si ademas se hizo `alembic stamp <rev>` para destrabar migraciones nuevas
(en vez de correr todo desde el principio), Alembic queda pensando que
esos objetos ya estan aplicados y nunca los vuelve a intentar -- aunque
en la base real no existan.

Idempotente: correrlo de nuevo no rompe nada, solo crea lo que falte.
Se corre automaticamente en cada arranque del contenedor (ver Dockerfile),
asi que en general no hace falta invocarlo a mano.

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
    # --- migracion 010: columnas nuevas en una tabla que ya podia existir ---
    (
        "columna", "products.cost_price",
        "SELECT 1 FROM information_schema.columns "
        "WHERE table_name = 'products' AND column_name = 'cost_price'",
        "ALTER TABLE products ADD COLUMN IF NOT EXISTS cost_price NUMERIC(12, 2)",
    ),
    (
        "columna", "products.margin_pct",
        "SELECT 1 FROM information_schema.columns "
        "WHERE table_name = 'products' AND column_name = 'margin_pct'",
        "ALTER TABLE products ADD COLUMN IF NOT EXISTS margin_pct NUMERIC(6, 2)",
    ),
    # --- migracion 009: columna con tipo ENUM nuevo en tabla que ya podia existir ---
    (
        "columna", "orders.payment_method",
        "SELECT 1 FROM information_schema.columns "
        "WHERE table_name = 'orders' AND column_name = 'payment_method'",
        "DO $$ BEGIN "
        "CREATE TYPE paymentmethod AS ENUM "
        "('Transferencia', 'Mercado Pago', 'Tarjeta', 'Retiro en local (efectivo)'); "
        "EXCEPTION WHEN duplicate_object THEN NULL; END $$; "
        "ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method paymentmethod",
    ),
    # --- migracion 011 ---
    (
        "unique constraint", "suppliers.name",
        "SELECT 1 FROM pg_constraint c "
        "JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey) "
        "WHERE c.conrelid = 'suppliers'::regclass AND c.contype = 'u' AND a.attname = 'name'",
        "ALTER TABLE suppliers ADD CONSTRAINT uq_suppliers_name UNIQUE (name)",
    ),
    (
        "indice parcial", "ix_products_active_category_stock",
        "SELECT 1 FROM pg_indexes WHERE indexname = 'ix_products_active_category_stock'",
        "CREATE INDEX IF NOT EXISTS ix_products_active_category_stock "
        "ON products (category_id, stock) WHERE is_deleted = false",
    ),
    (
        "check constraint", "ck_quotes_message_not_blank",
        "SELECT 1 FROM pg_constraint WHERE conname = 'ck_quotes_message_not_blank'",
        "ALTER TABLE quotes ADD CONSTRAINT ck_quotes_message_not_blank "
        "CHECK (length(btrim(message)) > 0)",
    ),
    # --- migracion 012: columna nueva en tabla que ya podia existir ---
    (
        "columna", "users.token_version",
        "SELECT 1 FROM information_schema.columns "
        "WHERE table_name = 'users' AND column_name = 'token_version'",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 0",
    ),
]


def reconcile(db, verbose: bool = True) -> None:
    """Aplica los CHECKS de arriba sobre una sesion ya abierta.

    Se reutiliza desde `app/seed.py` (mismo proceso, misma sesion, corrida
    ANTES de que se lea/escriba la tabla `products`) y desde este mismo
    archivo cuando se invoca standalone via CLI.

    No abre ni cierra la sesion, y no hace commit/rollback propio salvo
    el commit final de los objetos que crea -- el llamador decide el resto
    de su transaccion.
    """
    missing: list[tuple[str, str, str]] = []
    if verbose:
        print("Verificando objetos de las migraciones 003/005/006/008/009/010/011...\n")
    for kind, name, check_sql, fix_sql in CHECKS:
        exists = db.execute(text(check_sql)).first() is not None
        if verbose:
            status = "OK   " if exists else "FALTA"
            print(f"  {status}  {kind:<17} {name}")
        if not exists:
            missing.append((kind, name, fix_sql))

    if not missing:
        if verbose:
            print("\nTodo en orden -- no hay nada que aplicar.")
        return

    if verbose:
        print(f"\nAplicando {len(missing)} objeto(s) faltante(s)...")
    for kind, name, fix_sql in missing:
        db.execute(text(fix_sql))
        if verbose:
            print(f"  + creado: {name}")
    db.commit()
    if verbose:
        print("\nListo -- la base quedó reconciliada con las migraciones.")


def main() -> None:
    db = SessionLocal()
    try:
        reconcile(db)
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
