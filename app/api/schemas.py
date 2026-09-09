"""Modelele de intrare si iesire ale API-ului.

Doua reguli care se vad in tot fisierul:

**Sumele sunt `Decimal`, niciodata `float`.** Pydantic serializeaza `Decimal` ca
STRING in JSON, deci `1210.00` pleaca pe fir ca `"1210.00"` si ajunge inapoi
exact, fara sa treaca prin binar. Daca ar deveni `float`, 0,1 + 0,2 ar strica
un total la a doua zecimala, iar UBL-ul cere corelatii exacte. Exista un test
care pazeste asta (`test_api.py::test_sumele_pleaca_pe_fir_ca_string`).

**Modelele de intrare nu contin campuri de stare.** `doc_status`,
`payment_status`, `spv_status`, `number`, `bt1_invoice_id` nu se pot trimite din
afara: le stabileste serverul. Altfel un client ar putea marca „emisa" o ciorna,
sau ar sari peste alocarea numarului dupa validare (constrangerea 9).
"""

from __future__ import annotations

from datetime import date
from decimal import Decimal
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

# --- nomenclatoare, ca sa nu se strecoare text liber ------------------------

DocType = Literal["factura", "proforma", "aviz", "chitanta", "bon_comanda"]
PaymentType = Literal[
    "Chitanta", "Bon fiscal", "Bon fiscal card", "Alta incasare numerar",
    "Ordin de plata", "Mandat postal", "Card", "CEC", "Bilet ordin",
    "Alta incasare banca", "Ramburs",
]


class Base(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


# --- clienti ---------------------------------------------------------------

class ClientIn(Base):
    """Judetul e cod ISO 3166-2:RO, iar la `RO-B` localitatea e `SECTOR1..6`.

    Nu se verifica aici: `county` e cheie straina catre tabelul `county`, iar
    regula sectoarelor e un CHECK in schema. O validare in Python ar fi a doua
    sursa de adevar, care se poate desincroniza de prima.
    """

    name: str = Field(max_length=200)
    legal_reg_id: str | None = Field(default=None, max_length=20)
    vat_id: str | None = Field(default=None, max_length=20)
    is_person: bool = False
    vat_payer: bool = False
    trading_name: str | None = None
    legal_info: str | None = None
    address1: str | None = Field(default=None, max_length=150)
    address2: str | None = Field(default=None, max_length=100)
    city: str | None = Field(default=None, max_length=50)
    postal_code: str | None = Field(default=None, max_length=20)
    county: str | None = Field(default=None, min_length=4, max_length=5)
    country: str = Field(default="RO", min_length=2, max_length=2)
    electronic_addr: str | None = None
    contact_name: str | None = None
    contact_phone: str | None = None
    contact_email: str | None = None
    iban: str | None = None
    bank: str | None = None
    code: str | None = None
    payment_days: int | None = Field(default=None, ge=0, le=365)


class ClientOut(ClientIn):
    id: UUID


# --- produse ---------------------------------------------------------------

class ProductIn(Base):
    """`unit_code` e cod UN/ECE Rec 20 (`H87`, `HUR`, `MON`), nu eticheta locala."""

    name: str = Field(max_length=100)
    description: str | None = Field(default=None, max_length=200)
    unit_code: str = "H87"
    product_type: str = "Serviciu"
    price: Decimal | None = None
    currency: str = Field(default="RON", min_length=3, max_length=3)
    seller_code: str | None = None
    buyer_code: str | None = None
    gtin: str | None = None
    class_code: str | None = None
    class_scheme: str | None = None
    origin_country: str | None = Field(default=None, min_length=2, max_length=2)
    vat_included: bool = False
    is_salable: bool = True


class ProductOut(ProductIn):
    id: UUID


# --- serii -----------------------------------------------------------------

class SeriesIn(Base):
    doc_type: DocType = "factura"
    name: str = Field(max_length=20)
    start_number: int = Field(default=1, ge=1)
    padding: int = Field(default=4, ge=1, le=10)
    description: str | None = None
    is_default: bool = False
    is_active: bool = True


class SeriesOut(Base):
    id: UUID
    doc_type: DocType
    name: str
    start_number: int
    next_number: int
    padding: int
    description: str | None
    is_default: bool
    is_active: bool


class SeriesUpdate(Base):
    """`next_number` lipseste intentionat.

    Numerotarea se muta doar prin emitere. Un endpoint care o rescrie ar putea
    lasa gauri in serie sau ar putea suprapune un numar deja emis — exact ce
    interzice constrangerea 9.
    """

    name: str | None = Field(default=None, max_length=20)
    description: str | None = None
    is_default: bool | None = None
    is_active: bool | None = None


# --- documente -------------------------------------------------------------

class LineIn(Base):
    name: str = Field(max_length=100)
    quantity: Decimal
    unit_price: Decimal = Field(ge=0)   # BR-27: pretul unitar nu e negativ
    unit_code: str = "H87"
    vat_category: str = Field(default="S", min_length=1, max_length=2)
    vat_percent: Decimal | None = None
    description: str | None = Field(default=None, max_length=200)
    note: str | None = Field(default=None, max_length=300)
    product_id: UUID | None = None
    seller_code: str | None = None
    buyer_code: str | None = None
    saft_tax_code: str | None = None
    vat_included: bool = False


class LineOut(LineIn):
    id: UUID
    position: int
    line_net: Decimal


class DraftIn(Base):
    """Ciorna. Fara numar: acela se aloca dupa ce validatorul trece."""

    series_id: UUID
    client_id: UUID | None = None
    doc_type: DocType = "factura"
    type_code: Literal["380", "381", "384", "389", "751"] = "380"
    issue_date: date | None = None
    due_date: date | None = None
    currency: str = Field(default="RON", min_length=3, max_length=3)
    tax_currency: str = Field(default="RON", min_length=3, max_length=3)
    payment_terms: str | None = Field(default=None, max_length=300)
    buyer_reference: str | None = None
    contract_number: str | None = Field(default=None, max_length=200)
    order_number: str | None = Field(default=None, max_length=200)
    internal_note: str | None = None
    notes: list[str] = Field(default_factory=list, max_length=20)
    lines: list[LineIn] = Field(default_factory=list)


class DraftUpdate(DraftIn):
    """Acelasi continut, plus versiunea pe care o inlocuieste.

    `draft_version` face concurenta optimista: doua ferestre deschise pe aceeasi
    ciorna nu se suprascriu tacut, a doua primeste 409.
    """

    draft_version: int | None = None


class DocumentSummary(Base):
    """Randul din lista. Cele trei axe de stare sunt separate, nu una singura.

    O factura poate fi simultan emisa, respinsa de SPV si incasata — de asta
    `doc_status`, `spv_status` si `payment_status` sunt coloane distincte.
    """

    id: UUID
    doc_type: DocType
    series_name: str
    number: int | None
    invoice_id: str | None
    issue_date: date
    due_date: date | None
    client_name: str | None
    currency: str
    payable: Decimal
    total_collected: Decimal
    doc_status: str
    payment_status: str
    spv_status: str


class FindingOut(Base):
    rule: str
    severity: str
    field_path: str
    message: str
    bt_ref: str | None = None


class ReportOut(Base):
    ok: bool
    findings: list[FindingOut] = Field(default_factory=list)


class IssueOut(Base):
    ok: bool
    invoice_id: str | None = None
    number: int | None = None
    report: ReportOut


class StornoIn(Base):
    type_code: Literal["384", "381"] = "384"
    issue_date: date | None = None


# --- incasari --------------------------------------------------------------

class PaymentIn(Base):
    payment_type: PaymentType
    value: Decimal = Field(gt=0)
    issue_date: date | None = None
    document_number: str | None = None
    series_id: UUID | None = None
    mentions: str | None = None


class PaymentOut(PaymentIn):
    id: UUID
    document_id: UUID


class PaymentState(Base):
    """Ce s-a schimbat pe document dupa incasare."""

    payments: list[PaymentOut]
    total_collected: Decimal
    payable: Decimal
    payment_status: str
