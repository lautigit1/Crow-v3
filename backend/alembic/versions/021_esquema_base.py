"""Esquema base: consolida las migraciones 001-021 en una sola.

Revision ID: 021
Revises:
Create Date: 2026-09-17

Por qué existe esta migración y no la cadena anterior:

La cadena 001-021 nunca tuvo migración base -- la 001 ya hacía ALTER TABLE
sobre `users` -- así que ninguna base vacía podía armarse con Alembic. Toda
base (desarrollo, CI, y producción cuando existiera) salía de `create_all()`
más `alembic stamp head`, y los objetos que vivían solo en las migraciones
los agregaba a mano `scripts/verify_db_integrity.py`. Eran dos definiciones
del esquema, y la de las migraciones estaba mal y nunca se había ejercido:
la 007 y la 009 creaban los enums `orderstatus` y `paymentmethod` con los
valores legibles ('Pendiente', 'Mercado Pago') cuando SQLAlchemy persiste
los nombres ('PENDIENTE', 'MERCADO_PAGO'), y varios nombres de constraints no
coincidían con los de las bases reales.

Esta migración se generó con autogenerate desde los modelos contra una base
vacía, y los modelos se habían verificado antes contra el esquema real de
desarrollo con `compare_metadata` (cero diferencias). Conserva el id "021"
a propósito: cualquier base existente ya está marcada en 021 y con este
esquema, así que queda al día sin tocarla. La cadena vieja está en el
historial de git (hasta el commit 6945a1f).

`tests/test_esquema.py` falla si modelos y migraciones vuelven a separarse.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '021'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Los índices trigram del buscador de productos la necesitan.
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")

    op.create_table('brands',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('name', sa.String(length=80), nullable=False),
    sa.Column('slug', sa.String(length=80), nullable=False),
    sa.Column('logo_url', sa.String(length=255), nullable=True),
    sa.Column('is_deleted', sa.Boolean(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_brands_is_deleted'), 'brands', ['is_deleted'], unique=False)
    op.create_index(op.f('ix_brands_name'), 'brands', ['name'], unique=True)
    op.create_index(op.f('ix_brands_slug'), 'brands', ['slug'], unique=True)
    op.create_table('categories',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('name', sa.String(length=80), nullable=False),
    sa.Column('slug', sa.String(length=80), nullable=False),
    sa.Column('description', sa.String(length=255), nullable=True),
    sa.Column('is_deleted', sa.Boolean(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_categories_is_deleted'), 'categories', ['is_deleted'], unique=False)
    op.create_index(op.f('ix_categories_name'), 'categories', ['name'], unique=True)
    op.create_index(op.f('ix_categories_slug'), 'categories', ['slug'], unique=True)
    op.create_table('settings',
    sa.Column('key', sa.String(length=80), nullable=False),
    sa.Column('value', sa.Text(), nullable=False),
    sa.PrimaryKeyConstraint('key')
    )
    op.create_table('suppliers',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('name', sa.String(length=120), nullable=False),
    sa.Column('contact_name', sa.String(length=120), nullable=True),
    sa.Column('phone', sa.String(length=40), nullable=True),
    sa.Column('email', sa.String(length=255), nullable=True),
    sa.Column('city', sa.String(length=80), nullable=True),
    sa.Column('notes', sa.Text(), nullable=True),
    sa.Column('is_active', sa.Boolean(), nullable=False),
    sa.Column('column_mapping', postgresql.JSONB(astext_type=sa.Text()), server_default='{}', nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('name')
    )
    op.create_table('users',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('full_name', sa.String(length=120), nullable=False),
    sa.Column('email', sa.String(length=255), nullable=False),
    sa.Column('hashed_password', sa.String(length=255), nullable=False),
    sa.Column('phone', sa.String(length=40), nullable=True),
    sa.Column('role', sa.Enum('USER', 'ADMIN', name='userrole'), nullable=False),
    sa.Column('is_active', sa.Boolean(), nullable=False),
    sa.Column('token_version', sa.Integer(), server_default='0', nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('last_login_at', sa.DateTime(timezone=True), nullable=True),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)
    op.create_table('audit_logs',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('actor_id', sa.Integer(), nullable=True),
    sa.Column('actor_email', sa.String(length=255), nullable=True),
    sa.Column('action', sa.String(length=60), nullable=False),
    sa.Column('entity', sa.String(length=60), nullable=True),
    sa.Column('entity_id', sa.String(length=60), nullable=True),
    sa.Column('detail', sa.String(length=500), nullable=True),
    sa.Column('ip_address', sa.String(length=64), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['actor_id'], ['users.id'], ondelete='SET NULL'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_audit_logs_created_at', 'audit_logs', [sa.text('created_at DESC')], unique=False)
    op.create_table('import_batches',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('supplier_id', sa.Integer(), nullable=False),
    sa.Column('filename', sa.String(length=255), nullable=False),
    sa.Column('file_content', sa.LargeBinary(), nullable=True),
    sa.Column('content_type', sa.String(length=100), nullable=True),
    sa.Column('file_hash', sa.String(length=64), nullable=True),
    sa.Column('declared_total', sa.Numeric(precision=14, scale=2), nullable=True),
    sa.Column('status', sa.Enum('BORRADOR', 'CONFIRMADO', 'REVERTIDO', name='importstatus'), nullable=False),
    sa.Column('notes', sa.Text(), nullable=True),
    sa.Column('created_by_id', sa.Integer(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('confirmed_at', sa.DateTime(timezone=True), nullable=True),
    sa.ForeignKeyConstraint(['created_by_id'], ['users.id'], ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['supplier_id'], ['suppliers.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_import_batches_file_hash'), 'import_batches', ['file_hash'], unique=False)
    op.create_index(op.f('ix_import_batches_supplier_id'), 'import_batches', ['supplier_id'], unique=False)
    op.create_table('notifications',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.Column('type', sa.Enum('ORDER_STATUS', 'ORDER_PAYMENT', 'QUOTE_ANSWERED', name='notificationtype'), nullable=False),
    sa.Column('title', sa.String(length=120), nullable=False),
    sa.Column('body', sa.String(length=400), nullable=True),
    sa.Column('link', sa.String(length=200), nullable=True),
    sa.Column('read_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_notifications_user_created', 'notifications', ['user_id', 'created_at'], unique=False)
    op.create_index('ix_notifications_user_unread', 'notifications', ['user_id', 'read_at'], unique=False)
    op.create_table('orders',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.Column('status', sa.Enum('PENDIENTE', 'CONFIRMADO', 'EN_PROCESO', 'ENVIADO', 'ENTREGADO', 'CANCELADO', name='orderstatus'), nullable=False),
    sa.Column('payment_method', sa.Enum('TRANSFERENCIA', 'MERCADO_PAGO', 'TARJETA', 'EFECTIVO_LOCAL', name='paymentmethod'), nullable=True),
    sa.Column('payment_status', sa.Enum('SIN_COBRAR', 'LINK_ENVIADO', 'PAGADO', name='paymentstatus'), server_default='SIN_COBRAR', nullable=False),
    sa.Column('notes', sa.Text(), nullable=True),
    sa.Column('admin_notes', sa.Text(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_orders_user_id'), 'orders', ['user_id'], unique=False)
    op.create_table('products',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('name', sa.String(length=160), nullable=False),
    sa.Column('sku', sa.String(length=40), nullable=False),
    sa.Column('description', sa.Text(), nullable=True),
    sa.Column('price', sa.Numeric(precision=12, scale=2), nullable=True),
    sa.Column('cost_price', sa.Numeric(precision=12, scale=2), nullable=True),
    sa.Column('margin_pct', sa.Numeric(precision=6, scale=2), nullable=True),
    sa.Column('stock', sa.Integer(), nullable=False),
    sa.Column('image_url', sa.String(length=255), nullable=True),
    sa.Column('vehicle_type', sa.String(length=40), nullable=False),
    sa.Column('is_featured', sa.Boolean(), nullable=False),
    sa.Column('is_active', sa.Boolean(), nullable=False),
    sa.Column('is_deleted', sa.Boolean(), nullable=False),
    sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('category_id', sa.Integer(), nullable=True),
    sa.Column('brand_id', sa.Integer(), nullable=True),
    sa.Column('supplier_id', sa.Integer(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.CheckConstraint('price IS NULL OR price > 0', name='ck_products_price_positive'),
    sa.CheckConstraint('stock >= 0', name='ck_products_stock_nonnegative'),
    sa.ForeignKeyConstraint(['brand_id'], ['brands.id'], ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['category_id'], ['categories.id'], ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['supplier_id'], ['suppliers.id'], ondelete='SET NULL'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_products_active_brand', 'products', ['brand_id'], unique=False, postgresql_where=sa.text('is_deleted = false'))
    op.create_index('ix_products_active_category', 'products', ['category_id'], unique=False, postgresql_where=sa.text('is_deleted = false'))
    op.create_index('ix_products_active_category_stock', 'products', ['category_id', 'stock'], unique=False, postgresql_where=sa.text('is_deleted = false'))
    op.create_index('ix_products_active_featured', 'products', ['is_featured'], unique=False, postgresql_where=sa.text('is_deleted = false'))
    op.create_index('ix_products_active_vehicle', 'products', ['vehicle_type'], unique=False, postgresql_where=sa.text('is_deleted = false'))
    op.create_index('ix_products_description_trgm', 'products', ['description'], unique=False, postgresql_using='gin', postgresql_ops={'description': 'gin_trgm_ops'})
    op.create_index(op.f('ix_products_is_active'), 'products', ['is_active'], unique=False)
    op.create_index(op.f('ix_products_is_deleted'), 'products', ['is_deleted'], unique=False)
    op.create_index(op.f('ix_products_name'), 'products', ['name'], unique=False)
    op.create_index('ix_products_name_trgm', 'products', ['name'], unique=False, postgresql_using='gin', postgresql_ops={'name': 'gin_trgm_ops'})
    op.create_index(op.f('ix_products_sku'), 'products', ['sku'], unique=True)
    op.create_index('ix_products_sku_trgm', 'products', ['sku'], unique=False, postgresql_using='gin', postgresql_ops={'sku': 'gin_trgm_ops'})
    op.create_table('import_lines',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('batch_id', sa.Integer(), nullable=False),
    sa.Column('row_number', sa.Integer(), nullable=False),
    sa.Column('sku', sa.String(length=40), nullable=False),
    sa.Column('name', sa.String(length=160), nullable=False),
    sa.Column('quantity', sa.Integer(), nullable=False),
    sa.Column('unit_cost', sa.Numeric(precision=12, scale=2), nullable=True),
    sa.Column('resolution', sa.Enum('NUEVO', 'REPOSICION', 'CONFLICTO', 'IGNORAR', name='lineresolution'), nullable=False),
    sa.Column('is_auto', sa.Boolean(), server_default='false', nullable=False),
    sa.Column('product_id', sa.Integer(), nullable=True),
    sa.ForeignKeyConstraint(['batch_id'], ['import_batches.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['product_id'], ['products.id'], ondelete='SET NULL'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_import_lines_batch_id'), 'import_lines', ['batch_id'], unique=False)
    op.create_table('order_items',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('order_id', sa.Integer(), nullable=False),
    sa.Column('product_id', sa.Integer(), nullable=True),
    sa.Column('sku_snapshot', sa.String(length=80), nullable=False),
    sa.Column('name_snapshot', sa.String(length=200), nullable=False),
    sa.Column('unit_price_snapshot', sa.Numeric(precision=12, scale=2), nullable=True),
    sa.Column('quantity', sa.Integer(), nullable=False),
    sa.ForeignKeyConstraint(['order_id'], ['orders.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['product_id'], ['products.id'], ondelete='SET NULL'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_order_items_order_id'), 'order_items', ['order_id'], unique=False)
    op.create_table('quotes',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('customer_name', sa.String(length=120), nullable=False),
    sa.Column('customer_email', sa.String(length=255), nullable=True),
    sa.Column('customer_phone', sa.String(length=40), nullable=True),
    sa.Column('vehicle', sa.String(length=160), nullable=True),
    sa.Column('message', sa.Text(), nullable=False),
    sa.Column('status', sa.Enum('NUEVA', 'EN_REVISION', 'RESPONDIDA', 'FINALIZADA', name='quotestatus'), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=True),
    sa.Column('product_id', sa.Integer(), nullable=True),
    sa.Column('answered_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('order_id', sa.Integer(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.CheckConstraint('length(trim(message)) > 0', name='ck_quotes_message_not_blank'),
    sa.ForeignKeyConstraint(['order_id'], ['orders.id'], ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['product_id'], ['products.id'], ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='SET NULL'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_quotes_user_id', 'quotes', ['user_id'], unique=False)
    op.create_table('stock_movements',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('product_id', sa.Integer(), nullable=False),
    sa.Column('delta', sa.Integer(), nullable=False),
    sa.Column('stock_after', sa.Integer(), nullable=False),
    sa.Column('reason', sa.Enum('ALTA', 'AJUSTE', 'VENTA', 'CANCELACION', 'COMPRA', name='stockreason'), nullable=False),
    sa.Column('note', sa.Text(), nullable=True),
    sa.Column('order_id', sa.Integer(), nullable=True),
    sa.Column('actor_id', sa.Integer(), nullable=True),
    sa.Column('import_batch_id', sa.Integer(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['actor_id'], ['users.id'], ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['import_batch_id'], ['import_batches.id'], ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['order_id'], ['orders.id'], ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['product_id'], ['products.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_stock_movements_created_at'), 'stock_movements', ['created_at'], unique=False)
    op.create_index(op.f('ix_stock_movements_import_batch_id'), 'stock_movements', ['import_batch_id'], unique=False)
    op.create_index(op.f('ix_stock_movements_product_id'), 'stock_movements', ['product_id'], unique=False)
    op.create_table('user_favorites',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.Column('product_id', sa.Integer(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['product_id'], ['products.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('user_id', 'product_id', name='uq_user_favorites_user_product')
    )
    op.create_index(op.f('ix_user_favorites_user_id'), 'user_favorites', ['user_id'], unique=False)
    op.create_table('quote_options',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('quote_id', sa.Integer(), nullable=False),
    sa.Column('title', sa.String(length=120), nullable=False),
    sa.Column('detail', sa.String(length=400), nullable=True),
    sa.Column('unit_price', sa.Numeric(precision=12, scale=2), nullable=False),
    sa.Column('quantity', sa.Integer(), server_default='1', nullable=False),
    sa.Column('lead_time', sa.String(length=60), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['quote_id'], ['quotes.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_quote_options_quote_id', 'quote_options', ['quote_id'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_quote_options_quote_id', table_name='quote_options')
    op.drop_table('quote_options')
    op.drop_index(op.f('ix_user_favorites_user_id'), table_name='user_favorites')
    op.drop_table('user_favorites')
    op.drop_index(op.f('ix_stock_movements_product_id'), table_name='stock_movements')
    op.drop_index(op.f('ix_stock_movements_import_batch_id'), table_name='stock_movements')
    op.drop_index(op.f('ix_stock_movements_created_at'), table_name='stock_movements')
    op.drop_table('stock_movements')
    op.drop_index('ix_quotes_user_id', table_name='quotes')
    op.drop_table('quotes')
    op.drop_index(op.f('ix_order_items_order_id'), table_name='order_items')
    op.drop_table('order_items')
    op.drop_index(op.f('ix_import_lines_batch_id'), table_name='import_lines')
    op.drop_table('import_lines')
    op.drop_index('ix_products_sku_trgm', table_name='products', postgresql_using='gin', postgresql_ops={'sku': 'gin_trgm_ops'})
    op.drop_index(op.f('ix_products_sku'), table_name='products')
    op.drop_index('ix_products_name_trgm', table_name='products', postgresql_using='gin', postgresql_ops={'name': 'gin_trgm_ops'})
    op.drop_index(op.f('ix_products_name'), table_name='products')
    op.drop_index(op.f('ix_products_is_deleted'), table_name='products')
    op.drop_index(op.f('ix_products_is_active'), table_name='products')
    op.drop_index('ix_products_description_trgm', table_name='products', postgresql_using='gin', postgresql_ops={'description': 'gin_trgm_ops'})
    op.drop_index('ix_products_active_vehicle', table_name='products', postgresql_where=sa.text('is_deleted = false'))
    op.drop_index('ix_products_active_featured', table_name='products', postgresql_where=sa.text('is_deleted = false'))
    op.drop_index('ix_products_active_category_stock', table_name='products', postgresql_where=sa.text('is_deleted = false'))
    op.drop_index('ix_products_active_category', table_name='products', postgresql_where=sa.text('is_deleted = false'))
    op.drop_index('ix_products_active_brand', table_name='products', postgresql_where=sa.text('is_deleted = false'))
    op.drop_table('products')
    op.drop_index(op.f('ix_orders_user_id'), table_name='orders')
    op.drop_table('orders')
    op.drop_index('ix_notifications_user_unread', table_name='notifications')
    op.drop_index('ix_notifications_user_created', table_name='notifications')
    op.drop_table('notifications')
    op.drop_index(op.f('ix_import_batches_supplier_id'), table_name='import_batches')
    op.drop_index(op.f('ix_import_batches_file_hash'), table_name='import_batches')
    op.drop_table('import_batches')
    op.drop_index('ix_audit_logs_created_at', table_name='audit_logs')
    op.drop_table('audit_logs')
    op.drop_index(op.f('ix_users_email'), table_name='users')
    op.drop_table('users')
    op.drop_table('suppliers')
    op.drop_table('settings')
    op.drop_index(op.f('ix_categories_slug'), table_name='categories')
    op.drop_index(op.f('ix_categories_name'), table_name='categories')
    op.drop_index(op.f('ix_categories_is_deleted'), table_name='categories')
    op.drop_table('categories')
    op.drop_index(op.f('ix_brands_slug'), table_name='brands')
    op.drop_index(op.f('ix_brands_name'), table_name='brands')
    op.drop_index(op.f('ix_brands_is_deleted'), table_name='brands')
    op.drop_table('brands')
    # Los tipos ENUM sobreviven al DROP TABLE en Postgres: sin esto, volver a
    # aplicar la migración falla con "type already exists". La extensión
    # pg_trgm no se borra, puede tener otros usos en la base.
    for tipo in (
        "userrole", "importstatus", "notificationtype", "orderstatus", "paymentmethod",
        "paymentstatus", "lineresolution", "quotestatus", "stockreason",
    ):
        op.execute(f"DROP TYPE IF EXISTS {tipo}")
