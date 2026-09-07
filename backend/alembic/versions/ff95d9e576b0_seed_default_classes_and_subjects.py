"""seed default classes and subjects

Revision ID: ff95d9e576b0
Revises: 504b58c8e13c
Create Date: 2026-09-06 18:50:57.013806

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ff95d9e576b0'
down_revision: Union[str, None] = '504b58c8e13c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


school_classes = sa.table("school_classes", sa.column("name", sa.String), sa.column("order", sa.Integer))
subjects = sa.table("subjects", sa.column("name", sa.String))

CLASS_NAMES = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"]
SUBJECT_NAMES = ["Science", "Mathematics", "English", "Social Studies", "Hindi", "Computer Science"]


def upgrade() -> None:
    op.bulk_insert(school_classes, [{"name": name, "order": i} for i, name in enumerate(CLASS_NAMES)])
    op.bulk_insert(subjects, [{"name": name} for name in SUBJECT_NAMES])


def downgrade() -> None:
    conn = op.get_bind()
    conn.execute(school_classes.delete().where(school_classes.c.name.in_(CLASS_NAMES)))
    conn.execute(subjects.delete().where(subjects.c.name.in_(SUBJECT_NAMES)))
