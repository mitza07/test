"""Schema initiala, din docs/schema_facturare_v2.sql

Migratia executa fisierul SQL de referinta. De la 0002 incolo se scriu
migratii normale, incrementale.

Revision ID: 0001
"""
from pathlib import Path

from alembic import op

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None

SQL_FILE = Path(__file__).resolve().parents[2] / "docs" / "schema_facturare_v2.sql"


def upgrade() -> None:
    sql = SQL_FILE.read_text(encoding="utf-8")
    op.execute(sql)


def downgrade() -> None:
    raise NotImplementedError(
        "Downgrade-ul schemei initiale nu este suportat. "
        "Recreeaza baza de la zero in dev; in productie, restaureaza din backup."
    )
