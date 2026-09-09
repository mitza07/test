"""Joburile si programatorul.

Redis si ANAF sunt inlocuite; ce se verifica e logica de decizie, si mai ales
lucrurile pe care joburile REFUZA sa le faca:

  - nu retrimit un upload cu index de incarcare deja primit;
  - nu retrimit un upload ramas in stare `unknown`;
  - nu pun la coada, la urmatorul tick, o factura in stare `unknown`.

Fiecare din cele trei, gresita, produce doua facturi identice in SPV.
"""

from datetime import datetime, timedelta

import pytest

from app.workers import scheduler, spv


class _Row:
    """Rand minim de job, cat sa treaca prin conditii."""

    def __init__(self, **fields):
        defaults = {
            "id": "job-1", "bt1_invoice_id": "FSIT0001", "index_incarcare": None,
            "is_unknown": False, "xml_ubl": "<Invoice/>", "company_id": "firma-1",
            "status_code": -1, "id_descarcare": None, "downloaded_at": None,
            "bt32_legal_reg_id": "8609468", "bt31_vat_id": "RO8609468",
        }
        defaults.update(fields)
        for key, value in defaults.items():
            setattr(self, key, value)


@pytest.fixture
def no_db(monkeypatch):
    """Inlocuieste tranzactia cu una goala: testam deciziile, nu SQL-ul."""
    from contextlib import contextmanager

    @contextmanager
    def fake_session(company_id):
        class Session:
            def execute(self, *args, **kwargs):
                raise AssertionError("jobul nu trebuia sa ajunga la baza de date")
        yield Session()

    monkeypatch.setattr(spv, "tenant_session", fake_session)


# --- ce refuza sa faca -----------------------------------------------------

def test_nu_retrimite_o_factura_cu_index_de_incarcare(no_db, monkeypatch):
    """Are index, deci ANAF a primit-o. Un al doilea upload o duplica."""
    monkeypatch.setattr(spv, "_job_row",
                        lambda session, job_id: _Row(index_incarcare="5001120362"))
    with pytest.raises(spv.NothingToDo, match="duplica"):
        spv.send_document("firma-1", "00000000-0000-0000-0000-000000000001")


def test_nu_retrimite_un_upload_in_stare_unknown(no_db, monkeypatch):
    """Regula centrala: `unknown` se lamureste cu lista de mesaje, nu cu upload."""
    monkeypatch.setattr(spv, "_job_row", lambda session, job_id: _Row(is_unknown=True))
    with pytest.raises(spv.NothingToDo, match="lista de mesaje"):
        spv.send_document("firma-1", "00000000-0000-0000-0000-000000000001")


def test_nu_descarca_de_doua_ori(no_db, monkeypatch):
    monkeypatch.setattr(spv, "_job_row", lambda session, job_id: _Row(
        id_descarcare="3001", downloaded_at=datetime.now()))
    with pytest.raises(spv.NothingToDo, match="deja descarcata"):
        spv.download_archive("firma-1", "00000000-0000-0000-0000-000000000001")


def test_nu_interogheaza_starea_fara_index(no_db, monkeypatch):
    monkeypatch.setattr(spv, "_job_row", lambda session, job_id: _Row())
    with pytest.raises(spv.NothingToDo, match="index de incarcare"):
        spv.poll_status("firma-1", "00000000-0000-0000-0000-000000000001")


def test_resolve_unknown_refuza_joburile_care_nu_sunt_unknown(no_db, monkeypatch):
    monkeypatch.setattr(spv, "_job_row", lambda session, job_id: _Row(is_unknown=False))
    with pytest.raises(spv.NothingToDo, match="nu e in stare unknown"):
        spv.resolve_unknown("firma-1", "00000000-0000-0000-0000-000000000001")


def test_cif_ul_se_normalizeaza_fara_prefix():
    """ANAF cere CUI numeric la upload; cu prefixul RO nu primesti erorile."""
    assert spv._cif(_Row(bt32_legal_reg_id="RO 8609468")) == "8609468"
    assert spv._cif(_Row(bt32_legal_reg_id=None, bt31_vat_id="RO8609468")) == "8609468"


# --- programatorul ---------------------------------------------------------

def test_interogarea_de_stare_exclude_explicit_unknown():
    """Nu e o subtilitate de SQL: daca `NOT j.is_unknown` dispare din interogare,
    scheduler-ul retrimite singur, la fiecare cinci minute, o factura care poate
    fi deja in SPV."""
    import inspect

    source = inspect.getsource(scheduler.queue_pending_uploads)
    assert "NOT j.is_unknown" in source
    assert "index_incarcare IS NULL" in source


def test_sarcinile_se_executa_la_intervalul_lor():
    calls = []
    task = scheduler.Task("proba", timedelta(minutes=5), lambda: calls.append(1))
    now = datetime(2026, 9, 9, 12, 0)

    assert task.due(now) is True, "prima rulare e mereu datorata"
    task.last_run = now
    assert task.due(now + timedelta(minutes=4)) is False
    assert task.due(now + timedelta(minutes=5)) is True


def test_o_sarcina_care_crapa_nu_opreste_schedulerul():
    """Daca alertele crapa, transmiterea facturilor cu termen legal trebuie sa
    continue."""
    executed = []

    def explode():
        raise RuntimeError("cade")

    tasks = [
        scheduler.Task("care_crapa", timedelta(seconds=1), explode),
        scheduler.Task("care_merge", timedelta(seconds=1),
                       lambda: executed.append(1)),
    ]
    scheduler.run(tasks, once=True, tick=0)
    assert executed == [1]


def test_sarcina_care_crapa_isi_marcheaza_totusi_rularea():
    """Altfel ar fi reincercata la fiecare tick, adica de doua ori pe minut."""
    task = scheduler.Task("care_crapa", timedelta(hours=1),
                          lambda: (_ for _ in ()).throw(RuntimeError("cade")))
    scheduler.run([task], once=True, tick=0)
    assert task.last_run is not None


def test_sarcinile_sunt_configurate():
    names = {task.name for task in scheduler.build_tasks()}
    assert names == {"trimitere_facturi", "verificare_stare", "randare_pdf",
                     "alerte_zilnice"}
    intervals = {task.name: task.interval for task in scheduler.build_tasks()}
    assert intervals["alerte_zilnice"] == timedelta(hours=24)
