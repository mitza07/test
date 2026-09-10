"""Citirea unui document din baza in forma pe care o consuma validatorul si UBL-ul.

Exista un singur dict intre baza de date, `app.core.validation.br_ro.validate` si
`app.core.ubl.generator.build`. Modulul asta il produce, si e singurul loc care
stie ambele nume ale fiecarui camp: cel din schema (`bt153_name`) si cel din dict
(`name`).

SQL scris de mana, prin `text()`, ca in `app.core.numbering` — proiectul nu are
modele ORM si `alembic/env.py` are `target_metadata = None`, adica migratiile se
scriu de mana. Nu introduc un al doilea stil.

Nota: `SELECT` fara `WHERE company_id` nu inseamna „vede tot". Politicile RLS
filtreaza (migratiile 0002 si 0003), cu conditia ca aplicatia sa fie conectata cu
un rol care nu le ocoleste — vezi `app.core.rls`.
"""

from __future__ import annotations

from decimal import Decimal
from typing import Any
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.rounding import Line, Totals, compute
from app.core.ubl.generator import CUSTOMIZATION_ID


class DocumentNotFound(LookupError):
    pass


def _party_from_company(row: Any) -> dict[str, Any]:
    """BG-4, vanzatorul.

    `legal_reg_id` ajunge in `PartyLegalEntity/CompanyID`. Specificatia, sectiunea
    1.6, cere acolo numarul de la Registrul Comertului (`J40/1234/2020`), dar
    schema nu are coloana separata pentru el — comentariul din `company` il pune
    in `bt33_legal_info`, impreuna cu capitalul social. Vezi TODO.md punctul 3.
    """
    return {
        "vat_id": row.bt31_vat_id,
        "legal_reg_id": row.bt32_legal_reg_id,
        "name": row.bt27_name,
        "trading_name": row.bt28_trading_name,
        "legal_info": row.bt33_legal_info,
        "electronic_address": row.bt34_electronic_addr,
        "address1": row.bt35_address1,
        "address2": row.bt36_address2,
        "address3": row.address3,
        "city": row.bt37_city,
        "postal_code": row.bt38_postal_code,
        "county": row.bt39_county,
        "country": row.bt40_country,
        "contact_name": row.contact_name,
        "contact_phone": row.contact_phone,
        "contact_email": row.contact_email,
    }


def _party_from_client(row: Any) -> dict[str, Any]:
    """BG-7, cumparatorul. `is_person` decide daca se verifica CNP sau CUI."""
    return {
        "vat_id": row.bt48_vat_id,
        "legal_reg_id": row.bt47_legal_reg_id,
        "is_person": row.is_person,
        "name": row.bt44_name,
        "trading_name": row.bt45_trading_name,
        "legal_info": row.legal_info,
        "electronic_address": row.bt49_electronic_addr,
        "address1": row.bt50_address1,
        "address2": row.bt51_address2,
        "address3": row.address3,
        "city": row.bt52_city,
        "postal_code": row.bt53_postal_code,
        "county": row.bt54_county,
        "country": row.bt55_country,
        "contact_name": row.contact_name,
        "contact_phone": row.contact_phone,
        "contact_email": row.contact_email,
    }


def load_seller(session: Session, company_id: UUID) -> dict[str, Any]:
    row = session.execute(
        text("SELECT * FROM company WHERE id = :id"), {"id": str(company_id)}
    ).one_or_none()
    if row is None:
        raise DocumentNotFound(f"Firma {company_id} nu exista.")
    return _party_from_company(row)


def load_buyer(session: Session, client_id: UUID) -> dict[str, Any]:
    row = session.execute(
        text("SELECT * FROM client WHERE id = :id"), {"id": str(client_id)}
    ).one_or_none()
    if row is None:
        raise DocumentNotFound(f"Clientul {client_id} nu exista.")
    return _party_from_client(row)


def _line_to_dict(row: Any) -> dict[str, Any]:
    return {
        "line_id": row.bt126_line_id,
        "name": row.bt153_name,
        "description": row.bt154_description,
        "note": row.bt127_note,
        "quantity": row.bt129_quantity,
        "unit_code": row.bt130_unit_code,
        "unit_price": row.bt146_item_price,
        "base_quantity": row.bt149_base_quantity,
        "net": row.bt131_line_net,
        "vat_category": row.bt151_vat_category,
        "vat_percent": row.bt152_vat_percent,
        "vat_included": row.vat_included,
        "saft_tax_code": row.saft_tax_code,
        "accounting_ref": row.bt133_accounting_ref,
        "seller_code": row.bt155_seller_code,
        "buyer_code": row.bt156_buyer_code,
        "gtin": row.bt157_gtin,
        "class_code": row.bt158_class_code,
        "class_scheme": row.bt158_class_scheme,
        "origin_country": row.bt159_origin_country,
    }


def to_calc_line(line: dict[str, Any]) -> Line:
    """Dictul de linie -> obiectul pe care il stie `app.core.rounding`."""
    percent = line.get("vat_percent")
    return Line(
        quantity=Decimal(str(line.get("quantity", 1))),
        unit_price=Decimal(str(line["unit_price"])),
        vat_category=line["vat_category"],
        vat_percent=None if percent is None else Decimal(str(percent)),
        vat_included=bool(line.get("vat_included")),
    )


def compute_document_totals(lines: list[dict[str, Any]],
                            allowances: list[dict[str, Any]] | None = None,
                            *, prepaid: Decimal = Decimal(0),
                            rounding: Decimal = Decimal(0)) -> Totals:
    """BG-22 si BG-23 din liniile documentului.

    Deducerile si taxele de document se insumeaza separat: `compute` le primeste
    ca doua totaluri, nu ca lista, pentru ca repartizarea pe cote se face acolo.
    """
    entries = allowances or []
    doc_allowances = sum(
        (Decimal(str(entry["amount"])) for entry in entries if not entry.get("is_charge")),
        Decimal(0))
    doc_charges = sum(
        (Decimal(str(entry["amount"])) for entry in entries if entry.get("is_charge")),
        Decimal(0))
    return compute([to_calc_line(line) for line in lines],
                   doc_allowances=doc_allowances, doc_charges=doc_charges,
                   prepaid=prepaid, rounding=rounding)


def load(session: Session, document_id: UUID, *,
         invoice_id: str | None = None) -> dict[str, Any]:
    """Documentul, in forma pentru validare si serializare.

    `invoice_id` permite validarea unei ciorne cu numarul pe care URMEAZA sa il
    primeasca: numarul se aloca dupa ce validatorul trece (constrangerea 9), dar
    BT-1 e obligatoriu ca sa poata fi validat. Vezi `app.core.issue`.
    """
    document = session.execute(
        text("SELECT * FROM document WHERE id = :id"), {"id": str(document_id)}
    ).one_or_none()
    if document is None:
        raise DocumentNotFound(f"Documentul {document_id} nu exista.")

    lines = [_line_to_dict(row) for row in session.execute(
        text("SELECT * FROM document_line WHERE document_id = :id ORDER BY position"),
        {"id": str(document_id)}).all()]

    allowances = [{
        "is_charge": row.is_charge,
        "amount": row.amount,
        "base_amount": row.base_amount,
        "percentage": row.percentage,
        "reason": row.reason,
        "reason_code": row.reason_code,
        "vat_category": row.vat_category,
        "vat_percent": row.vat_percent,
    } for row in session.execute(
        text("SELECT * FROM allowance_charge WHERE document_id = :id AND line_id IS NULL"),
        {"id": str(document_id)}).all()]

    breakdown = [{
        "category": row.bt118_category,
        "percent": row.bt119_percent,
        "taxable": row.bt116_taxable,
        "tax_amount": row.bt117_tax_amount,
        "exemption_reason": row.bt120_exempt_reason,
        "exemption_code": row.bt121_exempt_code,
    } for row in session.execute(
        text("SELECT * FROM vat_breakdown WHERE document_id = :id "
             "ORDER BY bt118_category, bt119_percent"),
        {"id": str(document_id)}).all()]

    notes = list(session.execute(
        text("SELECT bt22_note FROM document_note WHERE document_id = :id "
             "ORDER BY position"), {"id": str(document_id)}).scalars().all())

    payment_row = session.execute(
        text("SELECT * FROM payment_means WHERE document_id = :id LIMIT 1"),
        {"id": str(document_id)}).one_or_none()
    payment = None if payment_row is None else {
        "means_code": payment_row.bt81_code,
        "means_name": payment_row.bt82_name,
        "payment_id": payment_row.bt83_remittance_info,
        "iban": payment_row.bt84_iban,
        "account_name": payment_row.bt85_account_name,
        "bic": payment_row.bt86_bic,
    }

    # Dupa emitere se folosesc instantaneele, nu randurile curente: constrangerea 6
    # spune ca documentul emis e imuabil, iar asta include si datele partilor.
    # O redenumire a clientului nu are voie sa schimbe o factura veche.
    if document.doc_status == "draft":
        seller = load_seller(session, document.company_id)
        buyer = (load_buyer(session, document.client_id)
                 if document.client_id else dict(document.client_snapshot or {}))
    else:
        seller = dict(document.seller_snapshot or {})
        buyer = dict(document.client_snapshot or {})

    return {
        "invoice_id": invoice_id if invoice_id is not None else document.bt1_invoice_id,
        "customization_id": document.bt24_customization_id or CUSTOMIZATION_ID,
        "invoice_type_code": document.bt3_type_code or "380",
        "issue_date": document.bt2_issue_date,
        "due_date": document.bt9_due_date,
        "tax_point_date": document.bt7_tax_point_date,
        "tax_point_code": document.bt8_tax_point_code,
        "delivery_date": document.bt72_delivery_date,
        "period_start": document.bt73_period_start,
        "period_end": document.bt74_period_end,
        "currency": document.bt5_currency,
        "tax_currency": document.bt6_tax_currency,
        "tax_amount_accounting": document.bt111_tax_amount_ron,
        "buyer_reference": document.bt10_buyer_reference,
        "contract_number": document.bt12_contract_number,
        "order_number": document.bt13_order_number,
        "sales_order": document.bt14_sales_order,
        "reception_notice": document.bt15_reception_notice,
        "despatch_notice": document.bt16_despatch_notice,
        "tender_reference": document.bt17_tender_reference,
        "buyer_accounting_ref": document.bt19_buyer_accounting,
        "payment_terms": document.bt20_payment_terms,
        "preceding_invoice_id": document.bt25_preceding_invoice_id,
        "preceding_invoice_date": document.bt26_preceding_invoice_date,
        "is_storno": document.ref_kind == "storno",
        "is_credit_note": document.bt3_type_code == "381",
        "seller": seller,
        "buyer": buyer,
        "delivery": dict(document.delivery_snapshot) if document.delivery_snapshot else None,
        "payment": payment,
        "lines": lines,
        "allowances": allowances,
        "vat_breakdown": breakdown,
        "notes": notes,
        "line_total": document.bt106_line_total,
        "allowance_total": document.bt107_allowance_total,
        "charge_total": document.bt108_charge_total,
        "tax_exclusive": document.bt109_tax_exclusive,
        "tax_amount": document.bt110_tax_amount,
        "tax_inclusive": document.bt112_tax_inclusive,
        "prepaid": document.bt113_prepaid,
        "rounding": document.bt114_rounding,
        "payable": document.bt115_payable,
    }
