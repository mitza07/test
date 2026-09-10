"""Row Level Security pe company_id.

Izolarea tenantului nu se face prin WHERE scris manual in fiecare query.
Un query fara `app.company_id` setat returneaza zero randuri, nu datele
altui client. Asta e diferenta care conteaza in ziua in care ai zece clienti
si un endpoint nou scris in graba.

Aplicatia seteaza, la inceputul fiecarei tranzactii:
    SET LOCAL app.company_id = '<uuid>';

Revision ID: 0002
"""
from alembic import op

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None

TENANT_TABLES = [
    "bank_account", "work_station", "vat_rate", "doc_series", "client",
    "product", "document", "spv_credential", "event_log", "archive_entry",
    "vat_threshold_tracker", "revenue_account_map",
]


def upgrade() -> None:
    op.execute("""
        CREATE OR REPLACE FUNCTION current_company_id() RETURNS uuid AS $$
          SELECT NULLIF(current_setting('app.company_id', true), '')::uuid
        $$ LANGUAGE sql STABLE;
    """)
    for table in TENANT_TABLES:
        op.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY;")
        op.execute(f"ALTER TABLE {table} FORCE ROW LEVEL SECURITY;")
        op.execute(f"""
            CREATE POLICY tenant_isolation ON {table}
              USING (company_id = current_company_id())
              WITH CHECK (company_id = current_company_id());
        """)


def downgrade() -> None:
    for table in TENANT_TABLES:
        op.execute(f"DROP POLICY IF EXISTS tenant_isolation ON {table};")
        op.execute(f"ALTER TABLE {table} DISABLE ROW LEVEL SECURITY;")
    op.execute("DROP FUNCTION IF EXISTS current_company_id();")
