"""add pdf and document media types

Revision ID: daf7859fa703
Revises: 963eda42301b
Create Date: 2026-09-08 05:52:30.059705

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'daf7859fa703'
down_revision: Union[str, None] = '963eda42301b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Postgres enum values can't be removed once added, and ADD VALUE must be its own statement
    # (can't be combined with other DDL/DML that uses the new value in the same transaction) --
    # this migration does nothing else, so that's satisfied.
    op.execute("ALTER TYPE mediatype ADD VALUE IF NOT EXISTS 'pdf'")
    op.execute("ALTER TYPE mediatype ADD VALUE IF NOT EXISTS 'document'")


def downgrade() -> None:
    # Removing Postgres enum values isn't straightforward/safe (would require rebuilding the type
    # and every column using it) -- deliberately a no-op.
    pass
