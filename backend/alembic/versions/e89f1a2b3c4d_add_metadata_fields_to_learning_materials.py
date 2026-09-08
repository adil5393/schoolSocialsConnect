"""add metadata fields to learning materials

Revision ID: e89f1a2b3c4d
Revises: daf7859fa703
Create Date: 2026-09-08 20:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e89f1a2b3c4d'
down_revision: Union[str, None] = 'daf7859fa703'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('learning_materials', sa.Column('category', sa.String(length=64), nullable=True, server_default='learn'))
    op.add_column('learning_materials', sa.Column('resource_type', sa.String(length=64), nullable=True))
    op.add_column('learning_materials', sa.Column('description', sa.String(length=1024), nullable=True))
    op.add_column('learning_materials', sa.Column('source', sa.String(length=255), nullable=True))
    op.add_column('learning_materials', sa.Column('tags', sa.String(length=512), nullable=True))


def downgrade() -> None:
    op.drop_column('learning_materials', 'tags')
    op.drop_column('learning_materials', 'source')
    op.drop_column('learning_materials', 'description')
    op.drop_column('learning_materials', 'resource_type')
    op.drop_column('learning_materials', 'category')
