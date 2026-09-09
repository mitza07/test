"""Sabloane recurente si evidenta generarilor.

CLAUDE.md: „Recurentele sunt in MVP, nu extensie." Schema de referinta nu le
acopera, deci tabelele se adauga aici.

## Doua decizii care se vad in schema

**`day_of_month` e limitat la 28.** Un sablon setat pe 31 ar sari februarie, si
ar sari-o TACUT: jobul de noapte nu ar gasi nicio zi potrivita si nu ar genera
nimic. Cu 28 ca maxim, orice sablon are o zi in orice luna. Cine vrea „ultima zi
a lunii" are nevoie de alt camp, nu de 31.

**`UNIQUE (template_id, period)` e garantia de idempotenta.** Jobul de noapte
poate rula de doua ori — dupa o repornire, dupa o restaurare din backup, sau
pentru ca cineva l-a pornit manual. Fara constrangerea asta, a doua rulare
produce inca o ciorna pentru aceeasi luna, iar dimineata cineva aproba doua
facturi identice.

Nota din `docs/decizii.md`: restaurarea din backup poate reporni automatizari
deja executate. Aici, constrangerea o opreste in loc sa se bazeze pe disciplina.

Revision ID: 0005
"""
from alembic import op

revision = "0005"
down_revision = "0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
        CREATE TABLE recurring_template (
            id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            company_id    uuid NOT NULL REFERENCES company(id) ON DELETE CASCADE,
            name          text NOT NULL,
            client_id     uuid NOT NULL REFERENCES client(id) ON DELETE RESTRICT,
            series_id     uuid NOT NULL REFERENCES doc_series(id) ON DELETE RESTRICT,

            frequency     text NOT NULL DEFAULT 'monthly'
                          CHECK (frequency IN ('monthly','quarterly','yearly')),
            -- Maximum 28: vezi docstring. O zi mai mare ar sari februarie, tacut.
            day_of_month  smallint NOT NULL DEFAULT 1
                          CHECK (day_of_month BETWEEN 1 AND 28),
            -- Cu cate zile inainte de data facturii se genereaza ciorna, ca sa
            -- fie gata de aprobat dimineata.
            lead_days     smallint NOT NULL DEFAULT 1
                          CHECK (lead_days BETWEEN 0 AND 15),

            bt5_currency  char(3) NOT NULL DEFAULT 'RON',
            payment_days  smallint,
            bt20_payment_terms text,
            note          text,

            start_date    date NOT NULL DEFAULT CURRENT_DATE,
            end_date      date,
            is_active     boolean NOT NULL DEFAULT true,
            created_at    timestamptz NOT NULL DEFAULT now(),

            CONSTRAINT ck_recurring_period CHECK (end_date IS NULL
                                                  OR end_date >= start_date)
        );
        CREATE INDEX ON recurring_template (company_id) WHERE is_active;
    """)

    op.execute("""
        CREATE TABLE recurring_template_line (
            id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            template_id       uuid NOT NULL REFERENCES recurring_template(id)
                              ON DELETE CASCADE,
            position          smallint NOT NULL,
            product_id        uuid REFERENCES product(id),
            bt153_name        text NOT NULL CHECK (length(bt153_name) <= 100),
            bt154_description text CHECK (length(bt154_description) <= 200),
            bt129_quantity    numeric(18,4) NOT NULL DEFAULT 1,
            bt130_unit_code   text NOT NULL REFERENCES measuring_unit(code),
            bt146_item_price  numeric(18,4) NOT NULL CHECK (bt146_item_price >= 0),
            bt151_vat_category char(2) NOT NULL REFERENCES vat_category(code),
            bt152_vat_percent numeric(5,2),
            saft_tax_code     text,
            UNIQUE (template_id, position)
        );
    """)

    op.execute("""
        CREATE TABLE recurring_run (
            id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            template_id uuid NOT NULL REFERENCES recurring_template(id)
                        ON DELETE CASCADE,
            -- Prima zi a perioadei facturate. Cheia de idempotenta.
            period      date NOT NULL,
            document_id uuid REFERENCES document(id) ON DELETE SET NULL,
            status      text NOT NULL DEFAULT 'generated'
                        CHECK (status IN ('generated','validated','rejected',
                                          'issued','skipped')),
            -- Raportul validatorului, ca ecranul de aprobare sa arate de ce a
            -- picat o ciorna fara sa o revalideze.
            report      jsonb,
            created_at  timestamptz NOT NULL DEFAULT now(),
            UNIQUE (template_id, period)
        );
        CREATE INDEX ON recurring_run (status) WHERE status = 'validated';
    """)

    # RLS. `recurring_template` are company_id, deci politica directa, ca in 0002.
    # Copiii delega catre parinte, ca in 0003.
    op.execute("""
        ALTER TABLE recurring_template ENABLE ROW LEVEL SECURITY;
        ALTER TABLE recurring_template FORCE ROW LEVEL SECURITY;
        CREATE POLICY tenant_isolation ON recurring_template
          USING (company_id = current_company_id())
          WITH CHECK (company_id = current_company_id());
    """)
    for table in ("recurring_template_line", "recurring_run"):
        visible = ("EXISTS (SELECT 1 FROM recurring_template p "
                   f"WHERE p.id = {table}.template_id)")
        op.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY;")
        op.execute(f"ALTER TABLE {table} FORCE ROW LEVEL SECURITY;")
        op.execute(f"""
            CREATE POLICY tenant_isolation ON {table}
              USING ({visible}) WITH CHECK ({visible});
        """)
        op.execute(f"CREATE INDEX IF NOT EXISTS ix_{table}_template_id "
                   f"ON {table} (template_id);")


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS recurring_run;")
    op.execute("DROP TABLE IF EXISTS recurring_template_line;")
    op.execute("DROP TABLE IF EXISTS recurring_template;")
