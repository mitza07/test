"""Row Level Security si pe tabelele-copil ale documentului.

Migratia 0002 a pus politici pe cele 12 tabele care au coloana `company_id`.
Tabelele-copil nu au coloana, deci au ramas descoperite — si exact ele contin
continutul facturii.

Verificat pe Postgres 16, cu un rol NEPRIVILEGIAT si cu `app.company_id` setat
corect pe firma X:

    document       ->  1 rand    (corect, are politica din 0002)
    document_line  ->  2 randuri (ambele firme)
    efactura_job   ->  2 randuri (ambele firme)

    SELECT bt153_name FROM document_line  ->  'SECRET FIRMA X', 'SECRET FIRMA Y'
    SELECT xml_ubl    FROM efactura_job   ->  XML-ul complet al ambelor firme

Deci nu era o problema de configurare, ca aceea cu superuserul: persista si cu
totul configurat corect. `efactura_job.xml_ubl` e factura intreaga.

CLAUDE.md promite „un query fara filtru returneaza zero randuri" si listeaza la
Interzis „query fara `company_id` in context (RLS il prinde, dar nu te baza pe
el)". Un plasa de siguranta care nu acopera tabelele cu date nu e o plasa.

## De ce prin subinterogare si nu prin coloana `company_id` denormalizata

Politica de mai jos deleaga catre parinte:

    USING (EXISTS (SELECT 1 FROM document d WHERE d.id = document_line.document_id))

Subinterogarea e ea insasi filtrata de politica lui `document`, pentru ca ruleaza
cu drepturile aceluiasi rol. Deci linia e vizibila daca si numai daca documentul
ei e vizibil. Doua consecinte bune:

  - zero schimbari de schema, zero backfill;
  - `company_id` nu poate ajunge desincronizat de parinte, pentru ca nu exista.

Costul e o subinterogare pe rand. Indexul pe cheia straina o face ieftina, dar la
scanari mari de tot pe `document_line` se simte. Daca devine o problema, varianta
cu coloana denormalizata ramane deschisa — atunci va fi nevoie si de un trigger
care sa o tina sincronizata, pentru ca altfel muta problema, nu o rezolva.

Revision ID: 0003
"""
from alembic import op

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None

# tabela -> (coloana de legatura, tabela parinte, coloana parinte)
# Parintele are deja politica din 0002, direct (document, client) sau tranzitiv
# (document_line, care e acoperita mai jos si devine parinte pentru atribute).
CHILD_TABLES = [
    ("document_line", "document_id", "document", "id"),
    ("document_note", "document_id", "document", "id"),
    ("vat_breakdown", "document_id", "document", "id"),
    ("allowance_charge", "document_id", "document", "id"),
    ("payment_means", "document_id", "document", "id"),
    ("document_attachment", "document_id", "document", "id"),
    ("payment", "document_id", "document", "id"),
    ("efactura_job", "document_id", "document", "id"),
    ("validation_result", "document_id", "document", "id"),
    ("client_location", "client_id", "client", "id"),
    # Al doilea nivel: atributele de articol atarna de linie, iar linia de document.
    # Ordinea din lista conteaza doar pentru citit; politicile se evalueaza la query.
    ("line_item_attribute", "line_id", "document_line", "id"),
]


def upgrade() -> None:
    for table, column, parent, parent_column in CHILD_TABLES:
        visible = (f"EXISTS (SELECT 1 FROM {parent} p "
                   f"WHERE p.{parent_column} = {table}.{column})")
        op.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY;")
        op.execute(f"ALTER TABLE {table} FORCE ROW LEVEL SECURITY;")
        op.execute(f"""
            CREATE POLICY tenant_isolation ON {table}
              USING ({visible})
              WITH CHECK ({visible});
        """)
        # Fara indexul pe cheia straina, subinterogarea din politica devine
        # scumpa exact acolo unde tabela e mare.
        op.execute(f"CREATE INDEX IF NOT EXISTS ix_{table}_{column} "
                   f"ON {table} ({column});")


def downgrade() -> None:
    for table, column, _parent, _parent_column in CHILD_TABLES:
        op.execute(f"DROP POLICY IF EXISTS tenant_isolation ON {table};")
        op.execute(f"ALTER TABLE {table} DISABLE ROW LEVEL SECURITY;")
        op.execute(f"DROP INDEX IF EXISTS ix_{table}_{column};")
