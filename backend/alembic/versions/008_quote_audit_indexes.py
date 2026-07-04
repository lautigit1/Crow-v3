"""add index on quotes.user_id and audit_logs.created_at

Revision ID: 008
Revises: 007
Create Date: 2026-07-04

Agrega los dos índices señalados en la auditoría técnica que todavía
faltaban:

  - quotes.user_id        -> usado por GET /api/quotes/me
  - audit_logs.created_at -> usado por GET /api/audit (orden descendente
                              por fecha, listado más reciente primero)
"""

import sqlalchemy as sa
from alembic import op

revision      = "008"
down_revision = "007"
branch_labels = None
depends_on    = None


def upgrade() -> None:
    op.create_index("ix_quotes_user_id", "quotes", ["user_id"])
    op.create_index(
        "ix_audit_logs_created_at",
        "audit_logs",
        [sa.text("created_at DESC")],
    )


def downgrade() -> None:
    op.drop_index("ix_audit_logs_created_at", table_name="audit_logs")
    op.drop_index("ix_quotes_user_id", table_name="quotes")
