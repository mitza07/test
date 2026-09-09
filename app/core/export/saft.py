"""Sectiunile `SalesInvoices` si `Payments` pentru D406.

Programul asta NU genereaza tot D406-ul: restul ramane treaba programului de
contabilitate. Ce livreaza aici e partea pentru care e sursa de adevar, in asa
fel incat sa nu fie reintrodusa de mana (spec. sectiunea 4, consecinta
strategica).

## Avertisment despre structura

Numele exacte de elemente vin din XSD-ul D406 (v2.4.5), care NU e in repo si nu
era accesibil cand s-a scris modulul. Ce urmeaza e transcris din arborele
documentat in `docs/efactura_spec.md`, sectiunea 4, si urmeaza aceeasi disciplina
ca `app/core/ubl/sequence.py`: structura sta intr-un singur loc, verificabila si
corectabila.

**Inainte de prima depunere reala, valideaza iesirea pe XSD-ul oficial.**
Trateaza numele de elemente ca pe o ipoteza bine informata, nu ca pe un fapt.

Ce NU e ipoteza, si de-aia merita atentie:

  - `TaxCode` e obligatoriu pe FIECARE linie. Lipsa lui e eroarea numarul unu la
    validare: „elementul TaxCode ar fi trebuit sa apara de minimum 1 ori, dar
    apare efectiv de 0 ori". Nu e cota de TVA, e codul din TaxTable.
  - `index_incarcare` insoteste factura. ANAF cross-verifica automat e-Factura cu
    SalesInvoices — sume, date, CUI. Divergentele declanseaza control.
  - CUI-ul fara spatii. Un singur spatiu invalideaza fisierul.
  - Namespace-ul difera intre declaratia de test si cea reala. Confuzia dintre
    ele e cea mai frecventa eroare de structura raportata pe forumuri, si de asta
    alegerea e explicita, nu implicita.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from decimal import Decimal
from typing import Any, Literal
from uuid import UUID

from lxml import etree
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.rounding import q2
from app.core.validation.cui import normalize_cui

# Cea mai frecventa eroare de structura la D406: declaratia de test foloseste
# alt namespace decat cea reala. Alegerea se face explicit, printr-un parametru,
# nu dintr-o variabila de mediu pe care o uita cineva.
NS_PROD = "mfp:anaf:dgti:d406:declaratie:v1"
NS_TEST = "mfp:anaf:dgti:d406t:declaratie:v1"

Variant = Literal["prod", "test"]


class SaftError(ValueError):
    pass


def namespace_for(variant: Variant) -> str:
    if variant == "prod":
        return NS_PROD
    if variant == "test":
        return NS_TEST
    raise SaftError(
        f"Varianta '{variant}' nu exista. 'test' produce declaratia D406T, "
        "'prod' pe cea reala. Depunerea uneia in locul celeilalte e respinsa "
        "pe structura.")


@dataclass(frozen=True)
class InvoiceLine:
    number: int
    product_code: str
    description: str
    quantity: Decimal
    unit_code: str
    unit_price: Decimal
    amount: Decimal
    tax_code: str
    tax_type: str
    tax_percentage: Decimal | None
    tax_amount: Decimal


@dataclass(frozen=True)
class InvoiceEntry:
    invoice_id: str
    issue_date: date
    invoice_type: str
    customer_cui: str
    customer_name: str
    currency: str
    net_total: Decimal
    tax_total: Decimal
    gross_total: Decimal
    index_incarcare: str | None
    lines: list[InvoiceLine]


@dataclass(frozen=True)
class PaymentEntry:
    payment_id: str
    payment_date: date
    mechanism: str
    invoice_id: str
    customer_cui: str
    amount: Decimal


def _qualified(parent: etree._Element, tag: str) -> str:
    """Numele copilului, in namespace-ul parintelui.

    Fara asta, `SubElement(parent, "TaxCode")` creeaza elementul in AFARA
    namespace-ului. lxml il serializeaza totusi fara `xmlns=""`, deci fisierul
    scris iese corect — dar arborele din memorie nu coincide cu el, iar orice
    XPath pe arbore da alte rezultate decat pe fisierul reparsat. E o
    inconsecventa care asteapta sa devina bug.
    """
    namespace = etree.QName(parent).namespace
    return f"{{{namespace}}}{tag}" if namespace else tag


def _child(parent: etree._Element, tag: str) -> etree._Element:
    return etree.SubElement(parent, _qualified(parent, tag))


def _text(parent: etree._Element, tag: str, value: Any) -> None:
    if value is None or str(value).strip() == "":
        return
    element = etree.SubElement(parent, _qualified(parent, tag))
    element.text = str(value)


def _amount(value: Any) -> str:
    return f"{q2(Decimal(str(value or 0))):.2f}"


# --- citirea din baza ------------------------------------------------------

def collect_invoices(session: Session, company_id: UUID, period_start: date,
                     period_end: date) -> list[InvoiceEntry]:
    documents = session.execute(text("""
        SELECT d.id, d.bt1_invoice_id, d.bt2_issue_date, d.bt3_type_code,
               d.bt5_currency, d.bt109_tax_exclusive, d.bt110_tax_amount,
               d.bt112_tax_inclusive,
               d.client_snapshot->>'name' AS client_name,
               coalesce(d.client_snapshot->>'legal_reg_id',
                        d.client_snapshot->>'vat_id', '') AS client_cui,
               (SELECT j.index_incarcare FROM efactura_job j
                 WHERE j.document_id = d.id AND j.index_incarcare IS NOT NULL
                 ORDER BY j.created_at DESC LIMIT 1) AS index_incarcare
        FROM document d
        WHERE d.company_id = :company
          AND d.doc_status = 'issued'
          AND d.bt2_issue_date BETWEEN :start AND :end
        ORDER BY d.bt2_issue_date, d.series_name, d.number
    """), {"company": str(company_id), "start": period_start,
           "end": period_end}).all()

    entries: list[InvoiceEntry] = []
    for document in documents:
        line_rows = session.execute(text("""
            SELECT position, bt155_seller_code, bt153_name, bt129_quantity,
                   bt130_unit_code, bt146_item_price, bt131_line_net,
                   saft_tax_code, saft_tax_type, bt152_vat_percent
            FROM document_line WHERE document_id = :id ORDER BY position
        """), {"id": str(document.id)}).all()

        lines = []
        for row in line_rows:
            if not row.saft_tax_code:
                raise SaftError(
                    f"Linia {row.position} din factura {document.bt1_invoice_id} nu "
                    "are `saft_tax_code`. D406 il cere pe fiecare linie; lipsa lui "
                    "e eroarea numarul unu la validare. Se copiaza din `vat_rate` "
                    "la emitere.")
            percent = (Decimal(str(row.bt152_vat_percent))
                       if row.bt152_vat_percent is not None else None)
            lines.append(InvoiceLine(
                number=row.position,
                product_code=row.bt155_seller_code or f"ART{row.position:04d}",
                description=row.bt153_name,
                quantity=Decimal(str(row.bt129_quantity)),
                unit_code=row.bt130_unit_code,
                unit_price=Decimal(str(row.bt146_item_price)),
                amount=Decimal(str(row.bt131_line_net)),
                tax_code=row.saft_tax_code,
                tax_type=row.saft_tax_type or "TVA",
                tax_percentage=percent,
                tax_amount=q2(Decimal(str(row.bt131_line_net))
                              * (percent or Decimal(0)) / Decimal(100)),
            ))

        entries.append(InvoiceEntry(
            invoice_id=document.bt1_invoice_id,
            issue_date=document.bt2_issue_date,
            invoice_type=document.bt3_type_code or "380",
            customer_cui=normalize_cui(document.client_cui or ""),
            customer_name=document.client_name or "",
            currency=document.bt5_currency,
            net_total=document.bt109_tax_exclusive,
            tax_total=document.bt110_tax_amount,
            gross_total=document.bt112_tax_inclusive,
            index_incarcare=document.index_incarcare,
            lines=lines,
        ))
    return entries


def collect_payments(session: Session, company_id: UUID, period_start: date,
                     period_end: date) -> list[PaymentEntry]:
    rows = session.execute(text("""
        SELECT p.id, p.payment_type, p.issue_date, p.value, p.document_number,
               d.bt1_invoice_id,
               coalesce(d.client_snapshot->>'legal_reg_id',
                        d.client_snapshot->>'vat_id', '') AS client_cui
        FROM payment p JOIN document d ON d.id = p.document_id
        WHERE d.company_id = :company
          AND p.issue_date BETWEEN :start AND :end
        ORDER BY p.issue_date, p.id
    """), {"company": str(company_id), "start": period_start,
           "end": period_end}).all()
    return [PaymentEntry(
        payment_id=row.document_number or str(row.id),
        payment_date=row.issue_date,
        mechanism=row.payment_type,
        invoice_id=row.bt1_invoice_id,
        customer_cui=normalize_cui(row.client_cui or ""),
        amount=Decimal(str(row.value)),
    ) for row in rows]


# --- serializare -----------------------------------------------------------

def build_sales_invoices(entries: list[InvoiceEntry], *,
                         variant: Variant = "test") -> etree._Element:
    """Sectiunea SalesInvoices, la nivel de LINIE.

    Fiecare factura se raporteaza in doua locuri simultan: aici cu toate liniile,
    si in GeneralLedgerEntries cu impactul contabil. Pe a doua o alimenteaza
    contabilul; punctul de contact trebuie sa fie identic.
    """
    namespace = namespace_for(variant)
    root = etree.Element(f"{{{namespace}}}SalesInvoices", nsmap={None: namespace})

    _text(root, "NumberOfEntries", len(entries))
    _text(root, "TotalDebit", _amount(0))
    _text(root, "TotalCredit", _amount(
        sum((entry.gross_total for entry in entries), Decimal(0))))

    for entry in entries:
        invoice = _child(root, "Invoice")
        _text(invoice, "InvoiceNo", entry.invoice_id)
        _text(invoice, "InvoiceDate", entry.issue_date.isoformat())
        _text(invoice, "InvoiceType", entry.invoice_type)
        # Referinta e-Factura. ANAF cross-verifica automat sumele, datele si
        # CUI-ul intre e-Factura si D406; fara ea, corelatia se face manual.
        _text(invoice, "EFacturaIndex", entry.index_incarcare)

        customer = _child(invoice, "CustomerInfo")
        _text(customer, "CustomerID", entry.customer_cui)
        _text(customer, "CustomerName", entry.customer_name)

        for line in entry.lines:
            node = _child(invoice, "Line")
            _text(node, "LineNumber", line.number)
            _text(node, "ProductCode", line.product_code)
            _text(node, "ProductDescription", line.description)
            _text(node, "Quantity", line.quantity)
            _text(node, "UnitOfMeasure", line.unit_code)
            _text(node, "UnitPrice", _amount(line.unit_price))
            _text(node, "InvoiceLineAmount", _amount(line.amount))

            tax = _child(node, "TaxInformation")
            _text(tax, "TaxType", line.tax_type)
            # Obligatoriu. Nu e cota de TVA, e codul din TaxTable.
            _text(tax, "TaxCode", line.tax_code)
            if line.tax_percentage is not None:
                _text(tax, "TaxPercentage", line.tax_percentage)
            _text(tax, "TaxAmount", _amount(line.tax_amount))

        totals = _child(invoice, "DocumentTotals")
        _text(totals, "TaxPayable", _amount(entry.tax_total))
        _text(totals, "NetTotal", _amount(entry.net_total))
        _text(totals, "GrossTotal", _amount(entry.gross_total))

    return root


def build_payments(entries: list[PaymentEntry], *,
                   variant: Variant = "test") -> etree._Element:
    namespace = namespace_for(variant)
    root = etree.Element(f"{{{namespace}}}Payments", nsmap={None: namespace})

    _text(root, "NumberOfEntries", len(entries))
    _text(root, "TotalDebit", _amount(
        sum((entry.amount for entry in entries), Decimal(0))))
    _text(root, "TotalCredit", _amount(0))

    for entry in entries:
        payment = _child(root, "Payment")
        _text(payment, "PaymentRefNo", entry.payment_id)
        _text(payment, "TransactionDate", entry.payment_date.isoformat())
        _text(payment, "PaymentMechanism", entry.mechanism)
        _text(payment, "SourceDocumentID", entry.invoice_id)
        _text(payment, "CustomerID", entry.customer_cui)
        _text(payment, "PaymentAmount", _amount(entry.amount))
    return root


def serialize(element: etree._Element) -> bytes:
    return etree.tostring(element, xml_declaration=True, encoding="UTF-8",
                          pretty_print=True)


def export_sales_invoices(session: Session, company_id: UUID, period_start: date,
                          period_end: date, *, variant: Variant = "test") -> bytes:
    return serialize(build_sales_invoices(
        collect_invoices(session, company_id, period_start, period_end),
        variant=variant))


def export_payments(session: Session, company_id: UUID, period_start: date,
                    period_end: date, *, variant: Variant = "test") -> bytes:
    return serialize(build_payments(
        collect_payments(session, company_id, period_start, period_end),
        variant=variant))
