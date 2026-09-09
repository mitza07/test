"""Clientul e-Factura si OAuth-ul ANAF.

Reteaua e montata cu httpx.MockTransport. Testele de contoare si de alerte cer
Postgres si se sar fara el.

Cel mai important test din fisier este `test_timeoutul_da_unknown_nu_esec`.
Restul verifica lucruri care se repara usor; ala verifica lucrul care, gresit,
produce doua facturi identice in SPV, fara buton de anulare.
"""

import os
from datetime import UTC, date, datetime, timedelta
from uuid import uuid4

import httpx
import pytest

from app.core import crypto
from app.core.anaf import efactura, oauth

TEST_DATABASE_URL = os.environ.get("TEST_DATABASE_URL")
KEY = crypto.generate_key()

XML = b"<Invoice><cbc:ID>FSIT0001</cbc:ID></Invoice>"
CIF = "8609468"


def _client(handler):
    return httpx.Client(transport=httpx.MockTransport(handler))


def _json_responder(payload, status=200, capture=None):
    def handler(request):
        if capture is not None:
            capture["url"] = str(request.url)
            capture["headers"] = dict(request.headers)
            capture["content"] = request.content
        return httpx.Response(status, json=payload)
    return handler


# --- upload ----------------------------------------------------------------

def test_upload_reusit():
    captured = {}
    payload = {"dateResponse": "202601011200", "ExecutionStatus": 0,
               "index_incarcare": "5001120362"}
    with _client(_json_responder(payload, capture=captured)) as client:
        result = efactura.upload(XML, token="tok", cif=CIF, environment="test",
                                 client=client)
    assert result.ok is True
    assert result.index_incarcare == "5001120362"
    assert result.unknown is False
    assert "api.anaf.ro/test/FCTEL/rest/upload" in captured["url"]
    assert "standard=UBL" in captured["url"]
    assert f"cif={CIF}" in captured["url"]
    assert captured["headers"]["authorization"] == "Bearer tok"


def test_upload_respins_cu_erori():
    payload = {"ExecutionStatus": 1,
               "Errors": [{"errorMessage": "CUI cumparator incorect"}]}
    with _client(_json_responder(payload)) as client:
        result = efactura.upload(XML, token="tok", cif=CIF, environment="prod",
                                 client=client)
    assert result.ok is False
    assert result.unknown is False, "respingere clara, nu incertitudine"
    assert result.errors == ["CUI cumparator incorect"]


def test_cif_ul_cu_prefix_ro_e_refuzat():
    """Destinatarul erorilor cand emitentul nu e identificabil din XML. Cu
    prefixul lasat acolo, nu primesti erorile."""
    with pytest.raises(efactura.AnafError, match="fara prefixul RO"):
        efactura.upload(XML, token="tok", cif="RO8609468", environment="test")


def test_xml_peste_10mb_e_oprit_local():
    """ANAF raspunde 413; nu are rost sa consumam banda ca sa aflam."""
    with pytest.raises(efactura.AnafError, match="413"):
        efactura.upload(b"x" * (efactura.MAX_UPLOAD_BYTES + 1), token="tok",
                        cif=CIF, environment="test")


def test_b2c_foloseste_alt_endpoint():
    captured = {}
    with _client(_json_responder({"ExecutionStatus": 0, "index_incarcare": "1"},
                                 capture=captured)) as client:
        efactura.upload(XML, token="tok", cif=CIF, environment="prod",
                        b2c=True, client=client)
    assert "/uploadb2c" in captured["url"]


def test_parametrii_optionali_ajung_in_url():
    captured = {}
    with _client(_json_responder({"ExecutionStatus": 0, "index_incarcare": "1"},
                                 capture=captured)) as client:
        efactura.upload(XML, token="tok", cif=CIF, environment="prod",
                        extern=True, autofactura=True, client=client)
    assert "extern=DA" in captured["url"]
    assert "autofactura=DA" in captured["url"]


# --- regula care conteaza --------------------------------------------------

def test_timeoutul_da_unknown_nu_esec():
    """Constrangerea din CLAUDE.md: timeout NU inseamna esec si NU autorizeaza
    retrimiterea.

    Daca asta ar intoarce `ok=False` fara `unknown`, un flux rezonabil ar
    reincerca — si ar pune doua facturi identice in SPV, fara buton de anulare.
    """
    def explode(request):
        raise httpx.ReadTimeout("timeout")

    with _client(explode) as client:
        result = efactura.upload(XML, token="tok", cif=CIF, environment="prod",
                                 client=client)
    assert result.ok is False
    assert result.unknown is True
    assert "listaMesajeFactura" in result.errors[0], \
        "mesajul trebuie sa spuna cum se lamureste, nu doar ca a esuat"


@pytest.mark.parametrize("status", [502, 503, 504])
def test_erorile_de_gateway_sunt_tot_unknown(status):
    """Un 503 de la un proxy poate veni si dupa ce cererea a ajuns la ANAF."""
    with _client(_json_responder({}, status=status)) as client:
        result = efactura.upload(XML, token="tok", cif=CIF, environment="prod",
                                 client=client)
    assert result.unknown is True


def test_400_e_eroare_clara_nu_unknown():
    """Distinctia care conteaza: pe 400 stim ca nu a fost acceptata."""
    with _client(_json_responder({}, status=400)) as client:  # noqa: SIM117
        with pytest.raises(efactura.AnafError):
            efactura.upload(XML, token="tok", cif=CIF, environment="prod",
                            client=client)


# --- stareMesaj ------------------------------------------------------------

def _xml_responder(body, status=200):
    def handler(request):
        return httpx.Response(status, text=body)
    return handler


def test_stare_ok_da_id_de_descarcare():
    body = ('<header xmlns="mfp:anaf:dgti:efactura:stareMesajFactura:v1" '
            'stare="ok" id_descarcare="3001474425"/>')
    with _client(_xml_responder(body)) as client:
        state = efactura.message_state("5001120362", token="tok",
                                       environment="prod", client=client)
    assert state.stare == "ok"
    assert state.id_descarcare == "3001474425"
    assert state.status_code == 1
    assert state.finished is True


def test_stare_in_prelucrare_nu_e_terminala():
    body = ('<header xmlns="mfp:anaf:dgti:efactura:stareMesajFactura:v1" '
            'stare="in prelucrare"/>')
    with _client(_xml_responder(body)) as client:
        state = efactura.message_state("5001120362", token="tok",
                                       environment="prod", client=client)
    assert state.status_code == 0
    assert state.finished is False


def test_stare_nok_are_raport_de_erori():
    """La `nok`, `id_descarcare` contine raportul de erori, nu factura."""
    body = '<header stare="nok" id_descarcare="3001474426"/>'
    with _client(_xml_responder(body)) as client:
        state = efactura.message_state("5001120362", token="tok",
                                       environment="test", client=client)
    assert state.status_code == 2
    assert state.id_descarcare == "3001474426"
    assert state.finished is True


def test_stare_la_timeout_e_unknown():
    def explode(request):
        raise httpx.ConnectTimeout("timeout")

    with _client(explode) as client:
        state = efactura.message_state("5001120362", token="tok",
                                       environment="prod", client=client)
    assert state.unknown is True
    assert state.status_code == -1


def test_pollul_creste_dar_se_opreste_la_30s():
    """ANAF recomanda 5-30 de secunde. `stareMesaj` se repeta; uploadul nu."""
    delays = [efactura.next_poll_delay(n).total_seconds() for n in range(6)]
    assert delays[0] == 5
    assert delays == sorted(delays)
    assert max(delays) == 30


# --- descarcare si lista ---------------------------------------------------

def test_descarcarea_intoarce_zip_ul():
    def handler(request):
        return httpx.Response(200, content=b"PK\x03\x04zip")

    with _client(handler) as client:
        content = efactura.download("3001474425", token="tok",
                                    environment="prod", client=client)
    assert content.startswith(b"PK")


def test_lista_mesaje_valideaza_intervalul():
    with pytest.raises(efactura.AnafError, match="intre 1 si 60"):
        efactura.list_messages(CIF, token="tok", environment="prod", days=61)


def test_lista_mesaje_ridica_eroarea_anaf():
    with _client(_json_responder({"eroare": "Nu exista mesaje"})) as client:  # noqa: SIM117
        with pytest.raises(efactura.AnafError, match="Nu exista mesaje"):
            efactura.list_messages(CIF, token="tok", environment="prod", client=client)


def test_mediu_necunoscut():
    with pytest.raises(efactura.AnafError, match="Mediu necunoscut"):
        efactura.api_base("staging")


# --- OAuth -----------------------------------------------------------------

def test_url_ul_de_autorizare_cere_jwt():
    """Fara `token_content_type=jwt`, ANAF intoarce un token opac."""
    url = oauth.authorize_url("client-1", "https://exemplu.ro/cb", state="abc")
    assert url.startswith(oauth.AUTHORIZE_URL)
    assert "token_content_type=jwt" in url
    assert "response_type=code" in url
    assert "state=abc" in url


def test_schimbul_de_cod_produce_perechea():
    captured = {}
    payload = {"access_token": "acc", "refresh_token": "ref",
               "expires_in": 7776000, "refresh_expires_in": 31536000}
    with _client(_json_responder(payload, capture=captured)) as client:
        tokens = oauth.exchange_code("cod", client_id="id", client_secret="secret",
                                     redirect_uri="https://exemplu.ro/cb",
                                     client=client)
    assert tokens.access_token == "acc"
    assert (tokens.access_expires_at - datetime.now(UTC)).days == 89
    assert (tokens.refresh_expires_at - datetime.now(UTC)).days == 364
    assert captured["headers"]["authorization"].startswith("Basic ")


def test_refreshul_intoarce_ambele_tokenuri():
    """Refresh tokenul se roteste: cel vechi nu mai e bun dupa apel."""
    payload = {"access_token": "acc2", "refresh_token": "ref2"}
    with _client(_json_responder(payload)) as client:
        tokens = oauth.refresh("ref1", client_id="id", client_secret="secret",
                               client=client)
    assert tokens.access_token == "acc2"
    assert tokens.refresh_token == "ref2"
    assert tokens.refresh_token != "ref1"


def test_raspuns_fara_refresh_token_e_eroare():
    with _client(_json_responder({"access_token": "acc"})) as client:  # noqa: SIM117
        with pytest.raises(oauth.OAuthError, match="ambele tokenuri"):
            oauth.refresh("ref", client_id="id", client_secret="s", client=client)


def test_durata_implicita_cand_anaf_nu_o_trimite():
    """Lipsa lui `expires_in` nu inseamna „nu expira": se folosesc duratele
    documentate, 90 si 365 de zile."""
    with _client(_json_responder({"access_token": "a", "refresh_token": "r"})) as client:
        tokens = oauth.exchange_code("cod", client_id="i", client_secret="s",
                                     redirect_uri="https://x", client=client)
    assert (tokens.access_expires_at - datetime.now(UTC)).days == 89


# --- criptare --------------------------------------------------------------

def test_tokenul_se_cripteaza_si_se_decripteaza():
    assert crypto.decrypt(crypto.encrypt("token-secret", KEY), KEY) == "token-secret"


def test_valoarea_criptata_nu_contine_originalul():
    assert "token-secret" not in crypto.encrypt("token-secret", KEY)


def test_cheia_gresita_da_eroare_clara():
    other = crypto.generate_key()
    with pytest.raises(crypto.DecryptionFailed, match="reautorizata"):
        crypto.decrypt(crypto.encrypt("x", KEY), other)


def test_lipsa_cheii_opreste_totul(monkeypatch):
    monkeypatch.delenv(crypto.ENV_KEY, raising=False)
    with pytest.raises(crypto.EncryptionNotConfigured, match=crypto.ENV_KEY):
        crypto.encrypt("x")


def test_cheie_invalida_explica_cum_se_genereaza():
    with pytest.raises(crypto.EncryptionNotConfigured, match="Fernet.generate_key"):
        crypto.encrypt("x", "nu-e-o-cheie")


# --- contoare si alerte, pe Postgres ---------------------------------------

pytest_postgres = pytest.mark.skipif(
    not TEST_DATABASE_URL, reason="contoarele stau in baza de date")

if TEST_DATABASE_URL:
    from sqlalchemy import create_engine, text
    from sqlalchemy.orm import Session

COMPANY_Q = "88888888-8888-8888-8888-888888888888"


@pytest.fixture
def db():
    engine = create_engine(TEST_DATABASE_URL, future=True)
    series_id, client_id, document_id, job_id = uuid4(), uuid4(), uuid4(), uuid4()
    with engine.begin() as connection:
        connection.execute(text("DELETE FROM document WHERE company_id = :c"),
                           {"c": COMPANY_Q})
        connection.execute(text("DELETE FROM company WHERE id = :c"), {"c": COMPANY_Q})
        connection.execute(text("""
            INSERT INTO company (id, bt32_legal_reg_id, bt27_name, bt35_address1,
                                 bt37_city, bt39_county, bt40_country)
            VALUES (:c, '8609468', 'Firma Q SRL', 'Str Q', 'SECTOR1', 'RO-B', 'RO')
        """), {"c": COMPANY_Q})
        connection.execute(text("""
            INSERT INTO doc_series (id, company_id, doc_type, name)
            VALUES (:s, :c, 'factura', 'FQ')
        """), {"s": series_id, "c": COMPANY_Q})
        connection.execute(text("""
            INSERT INTO client (id, company_id, bt47_legal_reg_id, bt44_name,
                                bt50_address1, bt52_city, bt54_county)
            VALUES (:cl, :c, '8609468', 'Client Q', 'Str', 'Cluj-Napoca', 'RO-CJ')
        """), {"cl": client_id, "c": COMPANY_Q})
        connection.execute(text("""
            INSERT INTO document (id, company_id, doc_type, series_id, series_name,
                                  number, bt1_invoice_id, client_id, client_snapshot,
                                  seller_snapshot, bt2_issue_date, doc_status)
            VALUES (:d, :c, 'factura', :s, 'FQ', 1, 'FQ0001', :cl, '{}', '{}',
                    DATE '2026-09-09', 'issued')
        """), {"d": document_id, "c": COMPANY_Q, "s": series_id, "cl": client_id})
        connection.execute(text("""
            INSERT INTO efactura_job (id, document_id, legal_deadline, status_code)
            VALUES (:j, :d, DATE '2026-09-16', -1)
        """), {"j": job_id, "d": document_id})
    yield engine, job_id, document_id
    with engine.begin() as connection:
        connection.execute(text("DELETE FROM document WHERE company_id = :c"),
                           {"c": COMPANY_Q})
        connection.execute(text("DELETE FROM company WHERE id = :c"), {"c": COMPANY_Q})
    engine.dispose()


@pytest_postgres
def test_contorul_de_stare_se_opreste_la_limita(db):
    engine, job_id, _ = db
    with Session(engine) as session, session.begin():
        for _ in range(efactura.MAX_STATUS_QUERIES_PER_DAY):
            efactura.consume_status_quota(session, job_id)
        with pytest.raises(efactura.QuotaExceeded, match="100"):
            efactura.consume_status_quota(session, job_id)


@pytest_postgres
def test_contorul_de_descarcari_se_opreste_la_10(db):
    engine, job_id, _ = db
    with Session(engine) as session, session.begin():
        for _ in range(efactura.MAX_DOWNLOADS_PER_DAY):
            efactura.consume_download_quota(session, job_id)
        with pytest.raises(efactura.QuotaExceeded, match="10"):
            efactura.consume_download_quota(session, job_id)


@pytest_postgres
def test_contoarele_se_reseteaza_a_doua_zi(db):
    engine, job_id, _ = db
    with Session(engine) as session, session.begin():
        for _ in range(5):
            efactura.consume_status_quota(session, job_id)
        session.execute(text("UPDATE efactura_job SET quota_reset_date = "
                             "CURRENT_DATE - 1 WHERE id = :j"), {"j": job_id})
    with Session(engine) as session, session.begin():
        efactura.consume_status_quota(session, job_id)
        remaining = session.execute(text(
            "SELECT status_queries_today FROM efactura_job WHERE id = :j"),
            {"j": job_id}).scalar_one()
    assert remaining == 1, "contorul a repornit, nu a continuat de la 5"


@pytest_postgres
def test_uploadul_reusit_fixeaza_fereastra_de_60_de_zile(db):
    engine, job_id, _ = db
    sent = datetime(2026, 9, 9, 10, 0, tzinfo=UTC)
    with Session(engine) as session, session.begin():
        efactura.record_upload(session, job_id,
                               efactura.UploadResult(ok=True, index_incarcare="5001"),
                               sent_at=sent)
    with engine.connect() as connection:
        row = connection.execute(text("""
            SELECT index_incarcare, status_code, download_deadline, is_unknown
            FROM efactura_job WHERE id = :j"""), {"j": job_id}).one()
    assert row.index_incarcare == "5001"
    assert row.status_code == 0
    assert row.is_unknown is False
    assert row.download_deadline == date(2026, 11, 8), "9 septembrie + 60 de zile"


@pytest_postgres
def test_unknown_ul_ajunge_pe_lista_de_decizii_umane(db):
    engine, job_id, _ = db
    with Session(engine) as session, session.begin():
        efactura.record_upload(session, job_id,
                               efactura.UploadResult(ok=False, unknown=True,
                                                     errors=["timeout"]))
    with Session(engine) as session, session.begin():
        pending = efactura.needs_resend_decision(session)
    assert any(row["id"] == job_id for row in pending)


@pytest_postgres
def test_alerta_de_descarcare_la_45_de_zile(db):
    engine, job_id, _ = db
    with Session(engine) as session, session.begin():
        session.execute(text("""
            UPDATE efactura_job SET download_deadline = :deadline, status_code = 1
            WHERE id = :j"""), {"j": job_id, "deadline": date(2026, 11, 8)})
    # cu 15 zile ramase (60 - 45) alerta trebuie sa apara
    with Session(engine) as session, session.begin():
        alerts = efactura.download_window_alerts(session, today=date(2026, 10, 24))
        early = efactura.download_window_alerts(session, today=date(2026, 9, 20))
    assert any(row["id"] == job_id for row in alerts)
    assert not any(row["id"] == job_id for row in early)


@pytest_postgres
def test_termenul_legal_depasit_apare_in_raport(db):
    """Amenda e per factura si nu are reducerea de 50%. Lista se citeste zilnic."""
    engine, job_id, _ = db
    with Session(engine) as session, session.begin():
        overdue = efactura.transmission_overdue(session, today=date(2026, 9, 17))
        in_time = efactura.transmission_overdue(session, today=date(2026, 9, 15))
    assert any(row["id"] == job_id for row in overdue)
    assert not any(row["id"] == job_id for row in in_time)


@pytest_postgres
def test_tokenurile_ajung_criptate_in_baza(db):
    """Un dump al bazei nu trebuie sa contina tokenurile in clar."""
    engine, _, _ = db
    tokens = oauth.TokenPair(
        access_token="ACCES-IN-CLAR", refresh_token="REFRESH-IN-CLAR",
        access_expires_at=datetime.now(UTC) + timedelta(days=90),
        refresh_expires_at=datetime.now(UTC) + timedelta(days=365))
    with Session(engine) as session, session.begin():
        oauth.store(session, COMPANY_Q, "test", tokens, key=KEY)
    with engine.connect() as connection:
        stored = connection.execute(text(
            "SELECT access_token, refresh_token FROM spv_credential "
            "WHERE company_id = :c"), {"c": COMPANY_Q}).one()
    assert "ACCES-IN-CLAR" not in stored.access_token
    assert "REFRESH-IN-CLAR" not in stored.refresh_token

    with Session(engine) as session, session.begin():
        loaded = oauth.load(session, COMPANY_Q, "test", key=KEY)
    assert loaded.access_token == "ACCES-IN-CLAR"


@pytest_postgres
def test_alerta_cu_14_zile_inainte_de_expirarea_refreshului(db):
    """Reautorizarea cere om, browser si token USB. Alerta in ziua expirarii e
    inutila."""
    engine, _, _ = db
    now = datetime.now(UTC)
    with Session(engine) as session, session.begin():
        oauth.store(session, COMPANY_Q, "test", oauth.TokenPair(
            "a", "r", now + timedelta(days=80), now + timedelta(days=10)), key=KEY)
    with Session(engine) as session, session.begin():
        alerts = oauth.expiring_soon(session)
    assert any(str(status.company_id) == COMPANY_Q for status in alerts)

    with Session(engine) as session, session.begin():
        oauth.store(session, COMPANY_Q, "test", oauth.TokenPair(
            "a", "r", now + timedelta(days=80), now + timedelta(days=300)), key=KEY)
    with Session(engine) as session, session.begin():
        assert not oauth.expiring_soon(session)


@pytest_postgres
def test_accesul_expirat_se_reinnoieste_singur(db):
    engine, _, _ = db
    now = datetime.now(UTC)
    with Session(engine) as session, session.begin():
        oauth.store(session, COMPANY_Q, "test", oauth.TokenPair(
            "vechi", "refresh-vechi", now - timedelta(days=1),
            now + timedelta(days=300)), key=KEY)

    payload = {"access_token": "nou", "refresh_token": "refresh-nou"}
    with _client(_json_responder(payload)) as http_client, \
            Session(engine) as session, session.begin():
        token = oauth.access_token(session, COMPANY_Q, "test", client_id="i",
                                   client_secret="s", key=KEY,
                                   http_client=http_client)
    assert token == "nou"

    with Session(engine) as session, session.begin():
        stored = oauth.load(session, COMPANY_Q, "test", key=KEY)
    assert stored.refresh_token == "refresh-nou", "refresh tokenul rotit s-a salvat"


@pytest_postgres
def test_refreshul_expirat_cere_reautorizare_manuala(db):
    engine, _, _ = db
    now = datetime.now(UTC)
    with Session(engine) as session, session.begin():
        oauth.store(session, COMPANY_Q, "test", oauth.TokenPair(
            "vechi", "refresh-vechi", now - timedelta(days=2),
            now - timedelta(days=1)), key=KEY)
    with Session(engine) as session, session.begin():  # noqa: SIM117
        with pytest.raises(oauth.OAuthError, match="certificatul"):
            oauth.access_token(session, COMPANY_Q, "test", client_id="i",
                               client_secret="s", key=KEY)
