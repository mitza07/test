"""Ciorna nu are numar. Coloanele devin NULL-abile.

Constrangerea 9 din CLAUDE.md: „Numarul de serie se aloca DUPA ce validatorul
local trece. O factura care pica validarea nu consuma un numar. Fara gauri in
serie."

Schema initiala face asta imposibil de reprezentat:

    number         bigint NOT NULL
    bt1_invoice_id text   NOT NULL CHECK (bt1_invoice_id ~ '[0-9]')
    UNIQUE (company_id, doc_type, series_name, number)

O ciorna trebuie deci sa poarte un numar inainte sa aiba unul. Si pentru ca
toate ciornele ar purta acelasi marcaj, a doua ciorna din aceeasi serie pica:

    ERROR: duplicate key value violates unique constraint
    DETAIL: Key (company_id, doc_type, series_name, number)=(..., factura, FZ, 0)
            already exists.

Verificat pe Postgres 16. Consecinta nu e cosmetica: blocheaza direct punctul 7
din TODO.md — „job de noapte: genereaza ciornele lunii si le trece prin
validator". Nu poti genera ciornele lunii daca incape o singura ciorna pe serie.

## Solutia

`number` si `bt1_invoice_id` devin NULL-abile. O ciorna are `NULL`, adica exact
ce e adevarat despre ea: nu are inca numar.

Nu e nevoie de index partial. In Postgres, `NULL` nu e egal cu `NULL` intr-un
index unic, deci constrangerea existenta accepta oricate ciorne si ramane in
vigoare pentru documentele emise. Verificat: trei ciorne in aceeasi serie trec,
iar doua documente emise cu numarul 1 sunt in continuare respinse.

CHECK-ul de pe `bt1_invoice_id` ramane neatins: in SQL, un CHECK trece automat
pe NULL, deci continua sa ceara o cifra pentru valorile reale (BR-RO-010).

Revision ID: 0004
"""
from alembic import op

revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TABLE document ALTER COLUMN number DROP NOT NULL;")
    op.execute("ALTER TABLE document ALTER COLUMN bt1_invoice_id DROP NOT NULL;")
    op.execute("""
        COMMENT ON COLUMN document.number IS
          'NULL cat timp documentul e ciorna. Numarul se aloca la emitere, dupa '
          'ce validatorul trece (constrangerea 9).';
    """)
    op.execute("""
        COMMENT ON COLUMN document.bt1_invoice_id IS
          'BT-1. NULL cat timp documentul e ciorna; se compune din series_name '
          'si number la emitere.';
    """)


def downgrade() -> None:
    # Documentele fara numar nu pot deveni NOT NULL. Se sterg ciornele intai —
    # nu au numar alocat, deci nu lasa gauri in serie.
    op.execute("DELETE FROM document WHERE number IS NULL OR bt1_invoice_id IS NULL;")
    op.execute("ALTER TABLE document ALTER COLUMN number SET NOT NULL;")
    op.execute("ALTER TABLE document ALTER COLUMN bt1_invoice_id SET NOT NULL;")
