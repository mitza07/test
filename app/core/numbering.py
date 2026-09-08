"""Alocarea numerelor de serie.

Doua reguli:
  1. Numarul se aloca DUPA ce validatorul local trece. O factura care pica
     validarea nu consuma un numar — nu raman gauri in serie.
  2. Alocarea si incrementul se fac in ACEEASI tranzactie, cu blocare de rand.
     Doua emiteri simultane pe aceeasi serie nu pot primi acelasi numar.
"""

from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.orm import Session


@dataclass(frozen=True)
class AllocatedNumber:
    series_name: str
    number: int
    formatted: str


def allocate(session: Session, series_id: UUID) -> AllocatedNumber:
    """Rezerva urmatorul numar din serie. Se apeleaza in tranzactia de emitere."""
    row = session.execute(
        text("""
            SELECT name, next_number, padding, is_active
            FROM doc_series
            WHERE id = :sid
            FOR UPDATE
        """),
        {"sid": str(series_id)},
    ).one_or_none()

    if row is None:
        raise ValueError("Seria nu exista.")
    if not row.is_active:
        raise ValueError(f"Seria {row.name} este inactiva.")

    session.execute(
        text("UPDATE doc_series SET next_number = next_number + 1 WHERE id = :sid"),
        {"sid": str(series_id)},
    )
    formatted = f"{row.name}{str(row.next_number).zfill(row.padding)}"
    return AllocatedNumber(row.name, row.next_number, formatted)


def can_delete(session: Session, document_id: UUID) -> tuple[bool, str | None]:
    """Verificarea se face in aceeasi tranzactie cu stergerea, nu la randarea butonului.

    Intre momentul in care UI-ul afiseaza butonul si click poate aparea alt document
    in serie.
    """
    row = session.execute(
        text("""
            SELECT d.id, d.number, d.series_id, d.doc_status,
                   (SELECT max(number) FROM document
                     WHERE series_id = d.series_id
                       AND doc_status <> 'deleted') AS max_number,
                   EXISTS (SELECT 1 FROM efactura_job j
                            WHERE j.document_id = d.id
                              AND j.index_incarcare IS NOT NULL) AS sent_to_spv
            FROM document d
            WHERE d.id = :did
            FOR UPDATE OF d
        """),
        {"did": str(document_id)},
    ).one_or_none()

    if row is None:
        return False, "Documentul nu exista."
    if row.doc_status == "deleted":
        return False, "Documentul este deja sters."
    if row.number != row.max_number:
        return False, ("Se poate sterge doar ultimul document din serie. "
                       "Pentru celelalte, foloseste stornarea.")
    if row.sent_to_spv:
        return False, ("Documentul are index de incarcare in SPV. "
                       "Stergerea locala ar crea o discrepanta permanenta cu ANAF. "
                       "Foloseste stornarea.")
    return True, None
