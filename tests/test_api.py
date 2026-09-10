"""API-ul REST.

Testele fara baza de date verifica granitele care nu au voie sa depinda de ea:
antetul de firma, forma sumelor pe fir, campurile pe care modelele le refuza.

Restul ruleaza pe Postgres real, cand exista `TEST_DATABASE_URL`. Nu se pot
verifica altfel: alocarea numarului, refuzul editarii unei facturi emise si
recalcularea starii de incasare sunt proprietati ale tranzactiei, nu ale
codului Python din jurul ei.
"""

import os
from datetime import date
from decimal import Decimal
from uuid import uuid4

import pytest

pytest.importorskip("fastapi")
from fastapi.testclient import TestClient  # noqa: E402
from pydantic import ValidationError  # noqa: E402

from app.api import schemas  # noqa: E402

D = Decimal
TEST_DATABASE_URL = os.environ.get("TEST_DATABASE_URL")

COMPANY = "44444444-4444-4444-4444-444444444444"
OTHER = "55555555-5555-5555-5555-555555555555"


@pytest.fixture(scope="module")
def client_app():
    os.environ.setdefault("DATABASE_URL", "postgresql+psycopg://x:x@localhost/x")
    os.environ.setdefault("TOKEN_ENCRYPTION_KEY",
                          "dGVzdC1jaGVpZS1udW1haS1wZW50cnUtY2k9PQ==")
    from app.main import app
    with TestClient(app) as test_client:
        yield test_client


# --- granite care nu ating baza de date ------------------------------------

def test_fara_antetul_de_firma_nu_se_interogheaza_nimic(client_app):
    """`docs/decizii.md`: nicio interogare fara `company_id` in context.

    400, nu o firma implicita. O valoare implicita ar transforma o greseala de
    configurare din frontend intr-o scriere linistita in firma gresita.
    """
    response = client_app.get("/api/clients")
    assert response.status_code == 400
    assert "X-Company-Id" in response.json()["detail"]


def test_antet_de_firma_invalid_da_400(client_app):
    response = client_app.get("/api/clients", headers={"X-Company-Id": "firma-1"})
    assert response.status_code == 400
    assert "UUID" in response.json()["detail"]


def test_sumele_pleaca_pe_fir_ca_string():
    """`float` pentru sume e interzis, si asta include serializarea JSON.

    Pydantic scrie `Decimal` ca string. Daca cineva schimba tipul in `float`,
    testul pica aici, nu peste doua luni intr-o corelatie BR-CO.
    """
    state = schemas.PaymentState(payments=[], total_collected=D("1210.00"),
                                 payable=D("1210.00"), payment_status="paid")
    body = state.model_dump_json()
    assert '"total_collected":"1210.00"' in body
    assert "1210.0," not in body


def test_ciorna_nu_accepta_campuri_de_stare():
    """Starea o stabileste serverul. Altfel un client ar putea marca „emisa" o
    ciorna, sarind peste alocarea numarului dupa validare."""
    with pytest.raises(ValidationError):
        schemas.DraftIn(series_id=uuid4(), doc_status="issued")
    with pytest.raises(ValidationError):
        schemas.DraftIn(series_id=uuid4(), number=7)


def test_pretul_unitar_negativ_e_respins():
    """BR-27: pretul unitar nu poate fi negativ. La storno, semnul sta pe cantitate."""
    with pytest.raises(ValidationError):
        schemas.LineIn(name="Consultanta", quantity=D(1), unit_price=D("-100"))
    line = schemas.LineIn(name="Storno", quantity=D(-1), unit_price=D("100"))
    assert line.quantity == D(-1)


def test_seria_nu_isi_poate_muta_numarul_prin_api():
    """`next_number` se misca doar prin emitere, sub lock, dupa validare."""
    assert "next_number" not in schemas.SeriesUpdate.model_fields
    with pytest.raises(ValidationError):
        schemas.SeriesUpdate(next_number=100)


# --- pe Postgres real ------------------------------------------------------

dbtest = pytest.mark.skipif(
    not TEST_DATABASE_URL,
    reason="TEST_DATABASE_URL nu e setat; fluxul de emitere cere Postgres",
)

pytest.importorskip("sqlalchemy")
from sqlalchemy import create_engine, text  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402


@pytest.fixture(scope="module")
def api(client_app):
    """Leaga aplicatia de baza de test si pregateste firma, cota si seria."""
    if not TEST_DATABASE_URL:
        pytest.skip("fara TEST_DATABASE_URL")

    import app.db as db

    engine = create_engine(TEST_DATABASE_URL, future=True)
    db._engine = engine
    db._session_factory = sessionmaker(bind=engine, expire_on_commit=False)

    with engine.begin() as connection:
        _clean(connection)
        for company in (COMPANY, OTHER):
            connection.execute(text("""
                INSERT INTO company (id, bt32_legal_reg_id, bt31_vat_id, bt27_name,
                                     bt35_address1, bt37_city, bt39_county,
                                     bt40_country, bt33_legal_info)
                VALUES (:c, '8609468', 'RO8609468', 'Full Stack IT SRL',
                        'Str. Fabricii nr. 10', 'SECTOR1', 'RO-B', 'RO',
                        'J40/1234/2020')
            """), {"c": company})
            connection.execute(text("""
                INSERT INTO vat_rate (company_id, name, percent, category_code,
                                      saft_tax_code, is_default)
                VALUES (:c, 'Normala', 21, 'S', '20', true)
            """), {"c": company})
    yield client_app
    with engine.begin() as connection:
        _clean(connection)
    engine.dispose()


def _clean(connection) -> None:
    for company in (COMPANY, OTHER):
        connection.execute(text(
            "DELETE FROM payment WHERE document_id IN "
            "(SELECT id FROM document WHERE company_id = :c)"), {"c": company})
        for table in ("document", "doc_series", "client", "product", "vat_rate",
                      "company"):
            connection.execute(
                text(f"DELETE FROM {table} WHERE "  # noqa: S608 - nume fix, din tuplu
                     + ("id = :c" if table == "company" else "company_id = :c")),
                {"c": company})


def _headers(company: str = COMPANY) -> dict[str, str]:
    return {"X-Company-Id": company}


@pytest.fixture
def series(api):
    response = api.post("/api/series", headers=_headers(),
                        json={"name": f"FS{uuid4().hex[:4].upper()}",
                              "doc_type": "factura"})
    assert response.status_code == 201, response.text
    return response.json()


@pytest.fixture
def buyer(api):
    response = api.post("/api/clients", headers=_headers(), json={
        "name": "Studio Nord SRL", "legal_reg_id": "8609468",
        "address1": "Str. Atelierului nr. 5", "city": "Cluj-Napoca",
        "county": "RO-CJ", "country": "RO"})
    assert response.status_code == 201, response.text
    return response.json()


def _draft(api, series, buyer, **overrides):
    payload = {
        "series_id": series["id"], "client_id": buyer["id"],
        "issue_date": str(date(2026, 9, 9)),
        "lines": [{"name": "Consultanta IT", "quantity": "10",
                   "unit_price": "100.00", "unit_code": "HUR",
                   "vat_category": "S", "vat_percent": "21"}],
    }
    payload.update(overrides)
    response = api.post("/api/documents", headers=_headers(), json=payload)
    assert response.status_code == 201, response.text
    return response.json()


def _next_number(api, series_id: str) -> int:
    return api.get(f"/api/series/{series_id}", headers=_headers()).json()["next_number"]


# --- constrangerea 11 si 12: identificatorii ------------------------------

@dbtest
def test_cui_ul_se_normalizeaza_la_salvare(api):
    """Un spatiu sau prefixul RO in campul numeric invalideaza D406."""
    response = api.post("/api/clients", headers=_headers(), json={
        "name": "Client Cu Spatii SRL", "legal_reg_id": "RO 8609468",
        "address1": "Str. A 1", "city": "Cluj-Napoca", "county": "RO-CJ"})
    assert response.status_code == 201, response.text
    assert response.json()["legal_reg_id"] == "8609468"


@dbtest
def test_checksum_ul_gresit_e_respins_local(api):
    """ANAF respinge separat, cu ERRIdentif, dupa ce factura a consumat un numar."""
    response = api.post("/api/clients", headers=_headers(), json={
        "name": "Client Gresit SRL", "legal_reg_id": "8609469",
        "address1": "Str. A 1", "city": "Cluj-Napoca", "county": "RO-CJ"})
    assert response.status_code == 422
    assert "cifra de control" in response.json()["detail"]


@dbtest
def test_bucuresti_ca_localitate_e_respins(api):
    """Constrangerea 4: la RO-B localitatea e SECTOR1..SECTOR6."""
    response = api.post("/api/clients", headers=_headers(), json={
        "name": "Client Bucuresti SRL", "legal_reg_id": "8609468",
        "address1": "Str. A 1", "city": "Bucuresti", "county": "RO-B"})
    assert response.status_code == 422
    assert "SECTOR" in response.json()["detail"]


@dbtest
def test_judetul_ca_text_liber_e_respins(api):
    response = api.post("/api/clients", headers=_headers(), json={
        "name": "Client Cluj SRL", "legal_reg_id": "8609468",
        "address1": "Str. A 1", "city": "Cluj-Napoca", "county": "CJ"})
    assert response.status_code == 422


# --- constrangerea 10: TaxCode pe fiecare linie ---------------------------

@dbtest
def test_linia_fara_cota_definita_e_respinsa(api, series, buyer):
    """`TaxCode` vine din `vat_rate`. Fara el, D406 pica — dar abia luna viitoare."""
    response = api.post("/api/documents", headers=_headers(), json={
        "series_id": series["id"], "client_id": buyer["id"],
        "lines": [{"name": "Serviciu scutit", "quantity": "1",
                   "unit_price": "100.00", "vat_category": "E", "vat_percent": "0"}]})
    assert response.status_code == 422
    assert "TaxCode" in response.json()["detail"]


# --- constrangerea 9: numarul se aloca dupa validare ----------------------

@dbtest
def test_verificarea_nu_consuma_numar(api, series, buyer):
    """Ctrl+Enter din editor ajunge aici. Daca ar consuma un numar, fiecare
    verificare ar lasa o gaura in serie."""
    draft = _draft(api, series, buyer)
    before = _next_number(api, series["id"])

    response = api.post(f"/api/documents/{draft['id']}/check", headers=_headers())
    assert response.status_code == 200, response.text
    assert response.json()["ok"] is True, response.json()["findings"]
    assert _next_number(api, series["id"]) == before


@dbtest
def test_emiterea_aloca_numarul_si_ciorna_devine_factura(api, series, buyer):
    draft = _draft(api, series, buyer)
    before = _next_number(api, series["id"])

    response = api.post(f"/api/documents/{draft['id']}/issue", headers=_headers())
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["ok"] is True
    assert body["number"] == before
    assert body["invoice_id"].endswith(str(before).zfill(4))
    assert _next_number(api, series["id"]) == before + 1

    detail = api.get(f"/api/documents/{draft['id']}", headers=_headers()).json()
    assert detail["doc_status"] == "issued"
    assert detail["payable"] == "1210.00"


@dbtest
def test_emiterea_care_pica_validarea_nu_consuma_numar(api, series):
    """Constrangerea 9, partea care conteaza: o factura care pica nu arde un numar."""
    incomplete = api.post("/api/clients", headers=_headers(), json={
        "name": "Client Fara Adresa SRL", "legal_reg_id": "8609468",
        "city": "Cluj-Napoca", "county": "RO-CJ"}).json()
    draft = _draft(api, series, incomplete)
    before = _next_number(api, series["id"])

    response = api.post(f"/api/documents/{draft['id']}/issue", headers=_headers())
    assert response.status_code == 422, response.text
    assert response.json()["ok"] is False
    assert response.json()["report"]["findings"]
    assert _next_number(api, series["id"]) == before

    still = api.get(f"/api/documents/{draft['id']}", headers=_headers()).json()
    assert still["doc_status"] == "draft"


# --- constrangerea 6: factura emisa nu se modifica ------------------------

@dbtest
def test_factura_emisa_nu_se_mai_editeaza(api, series, buyer):
    draft = _draft(api, series, buyer)
    api.post(f"/api/documents/{draft['id']}/issue", headers=_headers())

    response = api.put(f"/api/documents/{draft['id']}", headers=_headers(), json={
        "series_id": series["id"], "client_id": buyer["id"],
        "lines": [{"name": "Alt serviciu", "quantity": "1", "unit_price": "1.00",
                   "vat_category": "S", "vat_percent": "21"}]})
    assert response.status_code == 409
    assert "storno" in response.json()["detail"]


@dbtest
def test_doua_ferestre_pe_aceeasi_ciorna_nu_se_suprascriu(api, series, buyer):
    draft = _draft(api, series, buyer)
    payload = {"series_id": series["id"], "client_id": buyer["id"],
               "draft_version": 1,
               "lines": [{"name": "Modificat", "quantity": "1", "unit_price": "1.00",
                          "vat_category": "S", "vat_percent": "21"}]}
    assert api.put(f"/api/documents/{draft['id']}", headers=_headers(),
                   json=payload).status_code == 200
    second = api.put(f"/api/documents/{draft['id']}", headers=_headers(), json=payload)
    assert second.status_code == 409
    assert "modificata intre timp" in second.json()["detail"]


@dbtest
def test_stornarea_creeaza_ciorna_si_lasa_originalul_neatins(api, series, buyer):
    draft = _draft(api, series, buyer)
    api.post(f"/api/documents/{draft['id']}/issue", headers=_headers())

    response = api.post(f"/api/documents/{draft['id']}/storno", headers=_headers(),
                        json={"type_code": "384"})
    assert response.status_code == 201, response.text
    storno = response.json()
    assert storno["doc_status"] == "draft"

    original = api.get(f"/api/documents/{draft['id']}", headers=_headers()).json()
    assert original["doc_status"] == "issued"


# --- constrangerea 8: stergerea --------------------------------------------

@dbtest
def test_se_sterge_doar_ultimul_din_serie(api, series, buyer):
    first = _draft(api, series, buyer)
    api.post(f"/api/documents/{first['id']}/issue", headers=_headers())
    second = _draft(api, series, buyer)
    api.post(f"/api/documents/{second['id']}/issue", headers=_headers())

    refused = api.delete(f"/api/documents/{first['id']}", headers=_headers())
    assert refused.status_code == 409
    assert api.delete(f"/api/documents/{second['id']}",
                      headers=_headers()).status_code == 204


# --- incasari ---------------------------------------------------------------

@dbtest
def test_incasarea_partiala_si_completa(api, series, buyer):
    draft = _draft(api, series, buyer)
    api.post(f"/api/documents/{draft['id']}/issue", headers=_headers())

    partial = api.post(f"/api/documents/{draft['id']}/payments", headers=_headers(),
                       json={"payment_type": "Ordin de plata", "value": "210.00"})
    assert partial.status_code == 201, partial.text
    assert partial.json()["payment_status"] == "partial"
    assert partial.json()["total_collected"] == "210.00"

    full = api.post(f"/api/documents/{draft['id']}/payments", headers=_headers(),
                    json={"payment_type": "Ordin de plata", "value": "1000.00"})
    assert full.json()["payment_status"] == "paid"
    assert full.json()["total_collected"] == "1210.00"


@dbtest
def test_stergerea_unei_incasari_recalculeaza_starea(api, series, buyer):
    draft = _draft(api, series, buyer)
    api.post(f"/api/documents/{draft['id']}/issue", headers=_headers())
    added = api.post(f"/api/documents/{draft['id']}/payments", headers=_headers(),
                     json={"payment_type": "Card", "value": "1210.00"}).json()
    assert added["payment_status"] == "paid"

    payment_id = added["payments"][0]["id"]
    after = api.delete(f"/api/payments/{payment_id}", headers=_headers())
    assert after.status_code == 200
    assert after.json()["payment_status"] == "unpaid"
    assert after.json()["total_collected"] == "0.00"


@dbtest
def test_o_factura_poate_fi_emisa_si_incasata_si_netrimisa(api, series, buyer):
    """Cele trei axe sunt ortogonale: nu exista o singura „stare a facturii"."""
    draft = _draft(api, series, buyer)
    api.post(f"/api/documents/{draft['id']}/issue", headers=_headers())
    api.post(f"/api/documents/{draft['id']}/payments", headers=_headers(),
             json={"payment_type": "Card", "value": "1210.00"})

    row = api.get("/api/documents", headers=_headers(),
                  params={"payment_status": "paid"}).json()[0]
    assert row["doc_status"] == "issued"
    assert row["payment_status"] == "paid"
    assert row["spv_status"] == "not_sent"
