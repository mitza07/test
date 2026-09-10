"""Termenul legal de transmitere in SPV."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date

from app.core.validation.holidays import add_working_days, working_days_between

TRANSMISSION_WORKING_DAYS = 5   # OUG 89/2025, din 01.01.2026
SPV_ARCHIVE_CALENDAR_DAYS = 60  # ANAF sterge arhiva din SPV dupa 60 de zile
DOWNLOAD_ALERT_DAYS = 45


def transmission_deadline(issue_date: date) -> date:
    """5 zile lucratoare de la data emiterii.

    Pana la 31.12.2025 erau 5 zile calendaristice (OUG 69/2024). O factura emisa
    inainte de 2026 se supune regulii de la data emiterii, nu celei curente.
    """
    if issue_date < date(2026, 1, 1):
        from datetime import timedelta
        return issue_date + timedelta(days=5)
    return add_working_days(issue_date, TRANSMISSION_WORKING_DAYS)


@dataclass(frozen=True)
class DeadlineStatus:
    deadline: date
    working_days_left: int
    overdue: bool


def deadline_status(issue_date: date, today: date | None = None) -> DeadlineStatus:
    today = today or date.today()
    deadline = transmission_deadline(issue_date)
    left = working_days_between(today, deadline)
    return DeadlineStatus(deadline=deadline, working_days_left=left, overdue=today > deadline)
