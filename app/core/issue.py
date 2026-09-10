"""Ciclul de viata al documentului: emitere, stornare, stergere.

Fluxul de emitere, in ordinea din TODO.md punctul 3:

    ciorna -> validare -> alocare numar -> UBL -> arhivare

Ordinea nu e o preferinta. Constrangerea 9 din CLAUDE.md spune ca numarul se
aloca DUPA ce validatorul trece: o factura care pica validarea nu consuma un
numar, ca sa nu ramana gauri in serie.

Ca sa functioneze, ambele trebuie sa se intample sub acelasi lock:

    1. `SELECT ... FOR UPDATE` pe `doc_series`  <- de aici nimeni altcineva nu aloca
    2. se calculeaza numarul pe care L-AR primi documentul
    3. se valideaza documentul cu acel numar (BT-1 e obligatoriu la validare)
    4. daca pica -> SAVEPOINT-ul se intoarce, `next_number` ramane neatins
    5. daca trece -> se incrementeaza, se genereaza UBL, se ingheata instantaneele

Intre pasii 2 si 5 nu exista fereastra: lock-ul e tinut tot timpul, iar validarea
e Python pur, deci scurta.

Tot ce urmeaza ruleaza intr-un SAVEPOINT propriu (`begin_nested`), nu intr-o
tranzactie globala. Constrangerea din CLAUDE.md: „Emiterea in lot: tranzactie per
document, nu una pentru tot lotul". Un document care pica nu are voie sa anuleze
lotul, si nici sa lase seria incrementata.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date
from decimal import Decimal
from typing import Any
from uuid import UUID, uuid4

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core import documents
from app.core.numbering import can_delete
from app.core.ubl.generator import CREDIT_NOTE_TYPE_CODE, build
from app.core.validation.br_ro import Report, validate
from app.core.validation.deadline import transmission_deadline

# Coduri de tip document permise la stornare (BR-RO-020_1 + regula de storno).
STORNO_TYPE_CODE = "384"          # factura corectata: cantitati negative
CREDIT_NOTE_CODE = CREDIT_NOTE_TYPE_CODE   # 381: document CreditNote, cantitati pozitive


class IssueError(RuntimeError):
    """Documentul nu poate fi emis din motive de stare, nu de continut."""


@dataclass(frozen=True)
class IssueResult:
    """Rezultatul unei incercari de emitere.

    `ok is False` inseamna ca documentul a picat validarea si a ramas ciorna.
    Nu s-a consumat niciun numar. `report` spune de ce, cu mesaje in romana.
    """

    ok: bool
    report: Report = field(default_factory=Report)
    invoice_id: str | None = None
    number: int | None = None
    xml: bytes | None = None
    job_id: UUID | None = None


def _lock_document(session: Session, document_id: UUID) -> Any:
    row = session.execute(
        text("SELECT * FROM document WHERE id = :id FOR UPDATE"),
        {"id": str(document_id)},
    ).one_or_none()
    if row is None:
        raise documents.DocumentNotFound(f"Documentul {document_id} nu exista.")
    return row


def _store_totals(session: Session, document_id: UUID, totals: Any) -> None:
    """BG-22 pe document si BG-23 in `vat_breakdown`.

    Defalcarea se calculeaza si se STOCHEAZA, nu se deriva la generare (decizia 6
    din specificatie, sectiunea 5): altfel nu poti audita ulterior de ce a picat
    o factura.
    """
    session.execute(text("""
        UPDATE document SET
          bt106_line_total = :line_total,
          bt107_allowance_total = :allowance_total,
          bt108_charge_total = :charge_total,
          bt109_tax_exclusive = :tax_exclusive,
          bt110_tax_amount = :tax_amount,
          bt112_tax_inclusive = :tax_inclusive,
          bt113_prepaid = :prepaid,
          bt114_rounding = :rounding,
          bt115_payable = :payable,
          updated_at = now()
        WHERE id = :id
    """), {
        "id": str(document_id),
        "line_total": totals.line_total,
        "allowance_total": totals.allowance_total,
        "charge_total": totals.charge_total,
        "tax_exclusive": totals.tax_exclusive,
        "tax_amount": totals.tax_amount,
        "tax_inclusive": totals.tax_inclusive,
        "prepaid": totals.prepaid,
        "rounding": totals.rounding,
        "payable": totals.payable,
    })

    session.execute(text("DELETE FROM vat_breakdown WHERE document_id = :id"),
                    {"id": str(document_id)})
    for group in totals.breakdown:
        session.execute(text("""
            INSERT INTO vat_breakdown (document_id, bt118_category, bt119_percent,
                                       bt116_taxable, bt117_tax_amount,
                                       bt120_exempt_reason, bt121_exempt_code)
            VALUES (:doc, :category, :percent, :taxable, :tax, :reason, :code)
        """), {
            "doc": str(document_id),
            "category": group.category,
            "percent": group.percent,
            "taxable": group.taxable,
            "tax": group.tax_amount,
            # Motivul de scutire vine de pe cota (`vat_rate`), nu din calcul.
            # Se completeaza inainte de emitere; validatorul cere BT-120 sau
            # BT-121 pentru E, K, G, O, AE si Z (BR-E-10).
            "reason": None,
            "code": None,
        })


def _carry_exemption_reasons(session: Session, document_id: UUID) -> None:
    """Copiaza motivul de scutire de pe cota pe grupul de TVA corespunzator.

    `vat_rate` tine `exempt_reason`/`exempt_code` per cota, pe firma. Grupul BG-23
    are nevoie de ele ca sa treaca BR-E-10. Legatura se face pe (categorie, procent),
    exact cum sunt grupate liniile.
    """
    # In `UPDATE ... FROM`, aliasul tintei nu poate fi referit in `ON`-ul unui
    # JOIN; corelatia sta in WHERE. Cota se alege dupa `valid_from`/`valid_to`,
    # nu oricare: cotele sunt versionate, iar o factura veche trebuie stornata
    # cu cota de la data ei (21% e din 01.08.2025, inainte era 19%).
    session.execute(text("""
        UPDATE vat_breakdown b SET
          bt120_exempt_reason = r.exempt_reason,
          bt121_exempt_code   = r.exempt_code
        FROM document d, vat_rate r
        WHERE b.document_id = d.id
          AND d.id = :id
          AND r.company_id = d.company_id
          AND r.category_code = b.bt118_category
          AND coalesce(r.percent, 0) = coalesce(b.bt119_percent, 0)
          AND r.valid_from <= d.bt2_issue_date
          AND (r.valid_to IS NULL OR r.valid_to >= d.bt2_issue_date)
          AND (r.exempt_reason IS NOT NULL OR r.exempt_code IS NOT NULL)
    """), {"id": str(document_id)})


def issue(session: Session, document_id: UUID, *,
          expected_version: int | None = None) -> IssueResult:
    """Emite o ciorna. Intoarce raportul cand pica; nu ridica exceptie pentru continut.

    Exceptiile sunt rezervate problemelor de STARE — document inexistent, deja
    emis, serie inactiva — pentru ca alea sunt erori de program sau de flux, nu
    lucruri pe care le corecteaza operatorul in formular.
    """
    savepoint = session.begin_nested()
    try:
        document = _lock_document(session, document_id)

        if document.doc_status != "draft":
            raise IssueError(
                f"Documentul este in starea '{document.doc_status}'. Se pot emite "
                "doar ciornele; o factura emisa nu se modifica, se storneaza."
            )
        if expected_version is not None and document.draft_version != expected_version:
            raise IssueError(
                f"Ciorna a fost modificata intre timp (versiunea {document.draft_version}, "
                f"asteptata {expected_version}). Reincarca si verifica inainte de emitere."
            )

        # 1. Lock pe serie. De aici nimeni altcineva nu poate aloca din ea.
        series = session.execute(text("""
            SELECT id, name, next_number, padding, is_active
            FROM doc_series WHERE id = :id FOR UPDATE
        """), {"id": str(document.series_id)}).one_or_none()
        if series is None:
            raise IssueError("Seria documentului nu exista.")
        if not series.is_active:
            raise IssueError(f"Seria {series.name} este inactiva.")

        # 2. Numarul pe care L-AR primi. Inca nu se consuma nimic.
        prospective_number = series.next_number
        prospective_id = f"{series.name}{str(prospective_number).zfill(series.padding)}"

        # 3. Totalurile se recalculeaza din linii, la fiecare emitere. O ciorna
        #    editata si nesalvata corect nu are voie sa se emita cu totaluri vechi.
        loaded = documents.load(session, document_id, invoice_id=prospective_id)
        totals = documents.compute_document_totals(
            loaded["lines"], loaded["allowances"],
            prepaid=Decimal(str(document.bt113_prepaid or 0)),
            rounding=Decimal(str(document.bt114_rounding or 0)))
        _store_totals(session, document_id, totals)
        _carry_exemption_reasons(session, document_id)

        # 4. Validarea, cu numarul prospectiv si totalurile proaspete.
        candidate = documents.load(session, document_id, invoice_id=prospective_id)
        report = validate(candidate)
        if not report.ok:
            savepoint.rollback()
            return IssueResult(ok=False, report=report)

        # 5. Abia acum se consuma numarul.
        session.execute(
            text("UPDATE doc_series SET next_number = next_number + 1 WHERE id = :id"),
            {"id": str(series.id)})

        xml = build(candidate)

        # 6. Instantaneele se ingheata: constrangerea 6 acopera si datele partilor.
        #    O redenumire a clientului nu are voie sa schimbe o factura veche.
        session.execute(text("""
            UPDATE document SET
              number = :number,
              series_name = :series_name,
              bt1_invoice_id = :invoice_id,
              seller_snapshot = CAST(:seller AS jsonb),
              client_snapshot = CAST(:buyer AS jsonb),
              doc_status = 'issued',
              updated_at = now()
            WHERE id = :id
        """), {
            "id": str(document_id),
            "number": prospective_number,
            "series_name": series.name,
            "invoice_id": prospective_id,
            "seller": _json(candidate["seller"]),
            "buyer": _json(candidate["buyer"]),
        })

        # 7. Jobul SPV, cu termenul legal calculat de acum. Nu se trimite aici:
        #    trimiterea e treaba workerului (punctul 4 din TODO).
        job_id = uuid4()
        session.execute(text("""
            INSERT INTO efactura_job (id, document_id, standard, xml_ubl,
                                      xml_size_bytes, legal_deadline, status_code)
            VALUES (:id, :doc, :standard, :xml, :size, :deadline, -1)
        """), {
            "id": str(job_id),
            "doc": str(document_id),
            "standard": "CN" if candidate["invoice_type_code"] == CREDIT_NOTE_CODE else "UBL",
            "xml": xml.decode("utf-8"),
            "size": len(xml),
            # 5 zile lucratoare de la emitere (OUG 89/2025), cu sarbatorile legale.
            "deadline": transmission_deadline(candidate["issue_date"]),
        })

        savepoint.commit()
        return IssueResult(ok=True, report=report, invoice_id=prospective_id,
                           number=prospective_number, xml=xml, job_id=job_id)
    except Exception:
        if savepoint.is_active:
            savepoint.rollback()
        raise


def _json(value: Any) -> str:
    import json

    def default(item: Any) -> str:
        if isinstance(item, date):
            return item.isoformat()
        if isinstance(item, Decimal):
            return str(item)
        return str(item)

    return json.dumps(value, default=default, ensure_ascii=False)


def issue_batch(session: Session, document_ids: list[UUID]) -> dict[UUID, IssueResult]:
    """Emitere in lot, cu tranzactie per document.

    Un document care pica validarea nu anuleaza lotul si nu consuma numar.
    Cel care ridica exceptie de stare o propaga — aia inseamna ca fluxul e gresit,
    nu ca datele sunt gresite.
    """
    results: dict[UUID, IssueResult] = {}
    for document_id in document_ids:
        results[document_id] = issue(session, document_id)
    return results


def create_storno(session: Session, document_id: UUID, *,
                  type_code: str = STORNO_TYPE_CODE,
                  issue_date: date | None = None) -> UUID:
    """Creeaza ciorna de storno pentru un document emis.

    O factura emisa nu se modifica (constrangerea 6): corectia e un document NOU,
    cu referinta BG-3 la cel corectat.

    Doua forme, amandoua acceptate de validator:

      - `384` — factura corectata, cu cantitati NEGATE. Pretul unitar ramane
        pozitiv: BR-27 interzice pretul negativ, deci semnul sta pe cantitate.
      - `381` — nota de creditare, cu cantitati pozitive. Tipul documentului
        exprima el insusi inversarea, iar radacina XML devine CreditNote.

    Documentul rezultat e CIORNA: trece prin `issue()` ca oricare altul, deci
    primeste numar doar dupa ce valideaza.
    """
    if type_code not in (STORNO_TYPE_CODE, CREDIT_NOTE_CODE):
        raise IssueError(
            f"Stornarea foloseste codul {STORNO_TYPE_CODE} (factura corectata) sau "
            f"{CREDIT_NOTE_CODE} (nota de creditare), nu '{type_code}'.")

    original = session.execute(
        text("SELECT * FROM document WHERE id = :id"), {"id": str(document_id)}
    ).one_or_none()
    if original is None:
        raise documents.DocumentNotFound(f"Documentul {document_id} nu exista.")
    if original.doc_status != "issued":
        raise IssueError(
            f"Se storneaza doar documentele emise; acesta este '{original.doc_status}'.")

    storno_id = uuid4()
    negate = type_code == STORNO_TYPE_CODE

    session.execute(text("""
        INSERT INTO document (
            id, company_id, doc_type, bt3_type_code, bt24_customization_id,
            series_id, series_name, number, bt1_invoice_id,
            client_id, client_snapshot, seller_snapshot, delivery_snapshot,
            bt2_issue_date, bt5_currency, bt6_tax_currency,
            bt25_preceding_invoice_id, bt26_preceding_invoice_date,
            ref_document_id, ref_kind, doc_status, language
        )
        SELECT :new_id, company_id, doc_type, :type_code, bt24_customization_id,
               series_id, series_name, NULL, NULL,
               client_id, client_snapshot, seller_snapshot, delivery_snapshot,
               :issue_date, bt5_currency, bt6_tax_currency,
               bt1_invoice_id, bt2_issue_date,
               id, 'storno', 'draft', language
        FROM document WHERE id = :source
    """), {
        "new_id": str(storno_id),
        "type_code": type_code,
        "issue_date": issue_date or date.today(),
        "source": str(document_id),
    })

    sign = "-1" if negate else "1"
    session.execute(text(f"""
        INSERT INTO document_line (
            document_id, bt126_line_id, position, product_id,
            bt153_name, name_translation, bt154_description,
            bt155_seller_code, bt156_buyer_code, bt157_gtin,
            bt158_class_code, bt158_class_scheme, bt159_origin_country,
            bt129_quantity, bt130_unit_code, unit_translation,
            bt146_item_price, bt149_base_quantity, bt131_line_net,
            bt127_note, bt133_accounting_ref,
            bt151_vat_category, bt152_vat_percent, vat_name,
            saft_tax_code, saft_tax_type, vat_included
        )
        SELECT :new_id, bt126_line_id, position, product_id,
               bt153_name, name_translation, bt154_description,
               bt155_seller_code, bt156_buyer_code, bt157_gtin,
               bt158_class_code, bt158_class_scheme, bt159_origin_country,
               bt129_quantity * {sign}, bt130_unit_code, unit_translation,
               bt146_item_price, bt149_base_quantity, bt131_line_net * {sign},
               bt127_note, bt133_accounting_ref,
               bt151_vat_category, bt152_vat_percent, vat_name,
               saft_tax_code, saft_tax_type, vat_included
        FROM document_line WHERE document_id = :source ORDER BY position
    """), {"new_id": str(storno_id), "source": str(document_id)})

    return storno_id


def delete_document(session: Session, document_id: UUID) -> tuple[bool, str | None]:
    """Sterge un document, daca are voie.

    Verificarea si stergerea se fac in ACEEASI tranzactie (constrangerea 8):
    intre momentul in care interfata afiseaza butonul si click poate aparea alt
    document in serie, iar atunci acesta nu mai e ultimul.
    """
    allowed, reason = can_delete(session, document_id)
    if not allowed:
        return False, reason

    # Marcare, nu DELETE fizic: `numbering.can_delete` se uita la `max(number)`
    # printre documentele nesterse, iar jurnalul de evenimente trebuie sa ramana.
    session.execute(text("""
        UPDATE document SET doc_status = 'deleted', updated_at = now()
        WHERE id = :id
    """), {"id": str(document_id)})
    return True, None
