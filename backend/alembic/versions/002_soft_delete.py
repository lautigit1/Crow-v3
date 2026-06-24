"""add is_deleted soft-delete flag to products, categories, brands

Revision ID: 002
Revises: 001
Create Date: 2026-06-24

Adds a boolean `is_deleted` column (default FALSE) to three tables.
Existing rows default to FALSE so nothing breaks.
An index is added on each column to keep filtered queries fast.
"""
from alembic import op
import sqlalchemy as sa

revision = "002"
down_revision = "001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    for table in ("products", "categories", "brands"):
        op.add_column(
            table,
            sa.Column(
                "is_deleted",
                sa.Boolean(),
                nullable=False,
                server_default=sa.text("FALSE"),
            ),
        )
        op.create_index(
            f"ix_{table}_is_deleted",
            table,
            ["is_deleted"],
        )


def downgrade() -> None:
    for table in ("products", "categories", "brands"):
        op.drop_index(f"ix_{table}_is_deleted", table_name=table)
        op.drop_column(table, "is_deleted")
