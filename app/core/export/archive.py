"""Arhiva ZIP lunara: PDF-uri, XML-uri semnate, recipise.

Ce se pune inauntru, in ordinea importantei legale:

  1. `zip_spv/` — arhivele descarcate din SPV. Contin XML-ul procesat si sigiliul
     Ministerului Finantelor. ASTA e originalul legal (constrangerea 15).
  2. `xml/` — XML-urile trimise de noi. Utile la reconciliere; nu tin loc de
     original, pentru ca nu poarta sigiliul.
  3. `pdf/` — reprezentarile grafice. Rol informativ.
  4. `jurnal.csv` si sectiunile SAF-T.

Arhiva se face lunar pentru ca fereastra SPV e de 60 de zile: dupa ea, ANAF sterge
si nu mai exista de unde. O arhiva anuala ar fi deja prea tarziu pentru ianuarie.
"""

from __future__ import annotations

import io
import zipfile
from dataclasses import dataclass, field
from datetime import date
from pathlib import Path
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.export import journal, saft


@dataclass
class ArchiveReport:
    """Ce a intrat si ce lipseste. Lipsurile conteaza mai mult decat continutul."""

    added: int = 0
    missing_spv_archive: list[str] = field(default_factory=list)
    missing_pdf: list[str] = field(default_factory=list)
    missing_files: list[str] = field(default_factory=list)

    @property
    def complete(self) -> bool:
        return not (self.missing_spv_archive or self.missing_pdf
                    or self.missing_files)


def build(session: Session, company_id: UUID, period_start: date,
          period_end: date, *, variant: saft.Variant = "test"
          ) -> tuple[bytes, ArchiveReport]:
    """Construieste arhiva in memorie si raporteaza ce lipseste.

    Nu ridica exceptie pentru fisiere lipsa: o arhiva partiala plus lista a ce
    lipseste e mai utila decat un esec. Dar `complete` trebuie verificat —
    un ZIP fara arhivele SPV nu contine niciun original legal.
    """
    report = ArchiveReport()
    buffer = io.BytesIO()

    documents = session.execute(text("""
        SELECT d.id, d.bt1_invoice_id, d.rendered_pdf_path,
               j.zip_path, j.signature_path, j.xml_ubl, j.index_incarcare
        FROM document d
        LEFT JOIN efactura_job j ON j.document_id = d.id
        WHERE d.company_id = :company
          AND d.doc_status = 'issued'
          AND d.bt2_issue_date BETWEEN :start AND :end
        ORDER BY d.bt2_issue_date, d.series_name, d.number
    """), {"company": str(company_id), "start": period_start,
           "end": period_end}).all()

    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as archive:
        for row in documents:
            name = row.bt1_invoice_id

            if row.zip_path:
                if Path(row.zip_path).exists():
                    archive.write(row.zip_path, f"zip_spv/{name}.zip")
                    report.added += 1
                else:
                    report.missing_files.append(row.zip_path)
            else:
                report.missing_spv_archive.append(name)

            if row.signature_path and Path(row.signature_path).exists():
                archive.write(row.signature_path, f"zip_spv/{name}-semnatura.xml")

            if row.xml_ubl:
                archive.writestr(f"xml/{name}.xml", row.xml_ubl)

            if row.rendered_pdf_path:
                if Path(row.rendered_pdf_path).exists():
                    archive.write(row.rendered_pdf_path, f"pdf/{name}.pdf")
                else:
                    report.missing_files.append(row.rendered_pdf_path)
            else:
                report.missing_pdf.append(name)

        archive.writestr(
            "jurnal-vanzari.csv",
            journal.export(session, company_id, period_start, period_end)
            .encode("utf-8-sig"))
        archive.writestr(
            "saft-SalesInvoices.xml",
            saft.export_sales_invoices(session, company_id, period_start,
                                       period_end, variant=variant))
        archive.writestr(
            "saft-Payments.xml",
            saft.export_payments(session, company_id, period_start, period_end,
                                 variant=variant))
        archive.writestr("CITESTE.txt", _readme(period_start, period_end, report))

    return buffer.getvalue(), report


def _readme(period_start: date, period_end: date, report: ArchiveReport) -> str:
    lines = [
        f"Arhiva {period_start:%d.%m.%Y} - {period_end:%d.%m.%Y}",
        "",
        "zip_spv/  arhivele din SPV: XML procesat + sigiliul Ministerului",
        "          Finantelor. ACESTA este documentul fiscal original.",
        "xml/      XML-urile trimise de noi. Fara sigiliu, deci nu tin loc de",
        "          original; utile la reconciliere.",
        "pdf/      reprezentari grafice, rol informativ.",
        "",
        "jurnal-vanzari.csv        pentru contabilitate",
        "saft-SalesInvoices.xml    sectiune D406",
        "saft-Payments.xml         sectiune D406",
        "",
    ]
    if report.complete:
        lines.append("Arhiva este completa.")
    else:
        lines.append("ATENTIE, arhiva este INCOMPLETA:")
        if report.missing_spv_archive:
            lines.append(f"  fara arhiva SPV: {', '.join(report.missing_spv_archive)}")
            lines.append("  (fara ele, arhiva nu contine documentele originale)")
        if report.missing_pdf:
            lines.append(f"  fara PDF: {', '.join(report.missing_pdf)}")
        if report.missing_files:
            lines.append(f"  fisiere lipsa de pe disc: {len(report.missing_files)}")
    return "\n".join(lines) + "\n"
