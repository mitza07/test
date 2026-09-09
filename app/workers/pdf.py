"""Jobul de randare PDF. Ruleaza EXCLUSIV aici, niciodata in procesul API.

WeasyPrint blocheaza firul principal prin operatiuni native C (Pango, Cairo,
libxml2). Un API care randeaza sincron se opreste pentru toata lumea cat dureaza
un PDF. De asta coada `pdf` e separata si are `job_timeout` propriu.

## Ce se intampla la a doua randare

Nimic, daca factura e emisa si are deja PDF. Constrangerea 7: imutabilitatea
acopera si reprezentarea. O regenerare foloseste versiunea de sablon INREGISTRATA
pe document, nu pe cea curenta, si daca hash-ul iese diferit inseamna ca sablonul
acela a fost editat dupa emitere — ceea ce nu are voie sa se intample. Jobul
semnaleaza, nu suprascrie.
"""

from __future__ import annotations

import logging
from pathlib import Path
from uuid import UUID

from sqlalchemy import text

from app.config import get_settings
from app.core import documents, pdf
from app.db import tenant_session

logger = logging.getLogger(__name__)


class TemplateChanged(RuntimeError):
    """Sablonul inregistrat pe o factura emisa produce alt continut decat la emitere."""


def _storage_path(company_id: str, year: int, invoice_id: str) -> Path:
    root = Path(get_settings().storage_path) / str(company_id) / str(year) / "pdf"
    root.mkdir(parents=True, exist_ok=True)
    return root / f"{invoice_id}.pdf"


def render_document(company_id: str, document_id: str, *,
                    force: bool = False) -> str:
    """Randeaza si arhiveaza PDF-ul unei facturi emise.

    `force` re-randeaza cu ACEEASI versiune de sablon, pentru cazul in care
    fisierul s-a pierdut de pe disc. Nu schimba niciodata versiunea.
    """
    with tenant_session(company_id) as session:
        row = session.execute(text("""
            SELECT id, bt1_invoice_id, bt2_issue_date, doc_status, company_id,
                   template_version, rendered_pdf_sha256, rendered_pdf_path
            FROM document WHERE id = :id
        """), {"id": document_id}).one_or_none()
        if row is None:
            raise documents.DocumentNotFound(
                f"Documentul {document_id} nu exista sau nu e vizibil aici.")
        if row.doc_status != "issued":
            raise RuntimeError(
                f"Se randeaza doar facturile emise; aceasta e '{row.doc_status}'. "
                "Pentru ciorne exista previzualizarea, care nu se arhiveaza.")
        if row.rendered_pdf_sha256 and not force:
            logger.debug("Factura %s are deja PDF.", row.bt1_invoice_id)
            return row.rendered_pdf_path

        # Versiunea inregistrata are prioritate: o factura veche NU se regenereaza
        # cu sablonul curent.
        version = row.template_version or pdf.CURRENT_TEMPLATE_VERSION
        document = documents.load(session, UUID(document_id))
        rendered = pdf.render(document, version=version)

        if row.rendered_pdf_sha256 and rendered.sha256 != row.rendered_pdf_sha256:
            raise TemplateChanged(
                f"Sablonul {version} produce acum alt PDF pentru factura "
                f"{row.bt1_invoice_id} (hash {rendered.sha256[:12]} fata de "
                f"{row.rendered_pdf_sha256[:12]}). Un sablon nu se editeaza dupa "
                "ce a randat o factura emisa; se creeaza o versiune noua.")

        path = _storage_path(str(row.company_id), row.bt2_issue_date.year,
                             row.bt1_invoice_id)
        path.write_bytes(rendered.content)

        session.execute(text("""
            UPDATE document SET
              template_id = 'factura',
              template_version = :version,
              rendered_pdf_path = :path,
              rendered_pdf_sha256 = :sha,
              rendered_at = now()
            WHERE id = :id
        """), {"id": document_id, "version": version, "path": str(path),
               "sha": rendered.sha256})

        # Arhiva: `is_legal_original` ramane false. Originalul e XML-ul semnat de
        # ANAF; PDF-ul e reprezentare grafica, cu rol informativ.
        session.execute(text("""
            INSERT INTO archive_entry (company_id, document_id, kind,
                                       is_legal_original, file_path, sha256,
                                       size_bytes, retain_until)
            VALUES (:company, :doc, 'pdf', false, :path, :sha, :size, :retain)
        """), {"company": str(row.company_id), "doc": document_id,
               "path": str(path), "sha": rendered.sha256,
               "size": rendered.size,
               "retain": pdf.retention_deadline(row.bt2_issue_date)})

    logger.info("PDF randat pentru %s: %s", row.bt1_invoice_id, path)
    return str(path)


def preview_html(company_id: str, document_id: str) -> str:
    """HTML pentru previzualizarea din editor. Nu atinge discul si nu arhiveaza.

    Previzualizarea unei ciorne e permisa; randarea si arhivarea nu. Interfata
    genereaza asta dupa o pauza de editare, nu la fiecare tasta, si marcheaza
    rezultatul cand e vechi.
    """
    with tenant_session(company_id) as session:
        return pdf.render_html(documents.load(session, UUID(document_id)))
