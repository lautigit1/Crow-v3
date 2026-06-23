"""add updated_at and last_login_at to users

Revision ID: 001
Revises:
Create Date: 2026-06-22

"""
from alembic import op
import sqlalchemy as sa

revision = "001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # updated_at: default NOW() so existing rows get a valid timestamp
    op.add_column(
        "users",
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("NOW()"),
            nullable=False,
        ),
    )
    # last_login_at: nullable, no default needed
    op.add_column(
        "users",
        sa.Column("last_login_at", sa.DateTime(timezone=True), nullable=True),
    )
    # Extend audit_logs.detail from 255 → 500 chars
    op.alter_column(
        "audit_logs",
        "detail",
        existing_type=sa.String(255),
        type_=sa.String(500),
        existing_nullable=True,
    )


def downgrade() -> None:
    op.drop_column("users", "updated_at")
    op.drop_column("users", "last_login_at")
    op.alter_column(
        "audit_logs",
        "detail",
        existing_type=sa.String(500),
        type_=sa.String(255),
        existing_nullable=True,
    )
