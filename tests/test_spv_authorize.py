"""Cele doua capete HTTP ale autorizarii SPV.

Pasul interactiv nu se poate testa — cere certificat pe token USB. Ce se poate
testa, si conteaza, e ce se intampla in jurul lui: cine ajunge unde, si mai ales
ce refuza `/anaf/callback` sa faca.

`state` e singura legatura intre cele doua cereri. Daca ar fi doar `company_id`
in clar, oricine ar putea chema callback-ul cu codul lui si UUID-ul firmei mele,
iar tokenul lui ar ajunge in `spv_credential` la mine — sau invers, tokenul meu
la el. De aceea e semnat, si de aceea testele de mai jos incearca sa-l falsifice.
"""

import os
import time
from urllib.parse import parse_qs, urlparse
from uuid import UUID, uuid4

import pytest

pytest.importorskip("fastapi")
from fastapi import HTTPException  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

COMPANY = UUID("44444444-4444-4444-4444-444444444444")


@pytest.fixture(scope="module")
def app_client():
    os.environ.setdefault("DATABASE_URL", "postgresql+psycopg://x:x@localhost/x")
    os.environ.setdefault("TOKEN_ENCRYPTION_KEY",
                          "dGVzdC1jaGVpZS1udW1haS1wZW50cnUtY2k9PQ==")
    os.environ.setdefault("ANAF_CLIENT_ID", "client-de-test")
    os.environ.setdefault("ANAF_CLIENT_SECRET", "secret-de-test")
    os.environ.setdefault("ANAF_REDIRECT_URI",
                          "https://facturare.exemplu.ro/anaf/callback")
    from app.config import get_settings
    get_settings.cache_clear()
    from app.main import app
    with TestClient(app) as client:
        yield client
    get_settings.cache_clear()


@pytest.fixture
def spv(app_client):
    from app.api import spv as module
    return module


# --- pasul unu: plecarea catre ANAF ----------------------------------------

def test_authorize_trimite_la_logincert_cu_parametrii_ceruti(app_client):
    response = app_client.get(f"/anaf/authorize?company_id={COMPANY}",
                              follow_redirects=False)
    assert response.status_code == 307

    target = urlparse(response.headers["location"])
    assert target.hostname == "logincert.anaf.ro"
    params = parse_qs(target.query)
    assert params["response_type"] == ["code"]
    assert params["client_id"] == ["client-de-test"]
    # Fara `token_content_type=jwt` ANAF intoarce un token opac, din care nu se
    # poate citi data de expirare.
    assert params["token_content_type"] == ["jwt"]
    assert params["redirect_uri"] == ["https://facturare.exemplu.ro/anaf/callback"]


def test_redirect_uri_e_cel_din_configurare_nu_unul_dedus(app_client):
    """Trebuie sa fie identic cu Callback URL-ul inregistrat la ANAF.

    Daca ar fi construit din `request.base_url`, un proxy prost configurat sau un
    acces prin IP ar produce alt URL, iar ANAF ar respinge schimbul de cod.
    """
    response = app_client.get(f"/anaf/authorize?company_id={COMPANY}",
                              follow_redirects=False)
    params = parse_qs(urlparse(response.headers["location"]).query)
    assert params["redirect_uri"] == [os.environ["ANAF_REDIRECT_URI"]]


# --- `state`: ce accepta si ce refuza --------------------------------------

def test_state_ul_se_intoarce_la_aceeasi_firma(spv):
    assert spv.read_state(spv.make_state(COMPANY)) == COMPANY


def test_state_ul_modificat_e_respins(spv):
    """Schimbarea firmei fara semnatura noua: exact atacul de care ne aparam."""
    company, stamp, signature = spv.make_state(COMPANY).split(".")
    falsificat = f"{uuid4()}.{stamp}.{signature}"
    with pytest.raises(HTTPException) as raised:
        spv.read_state(falsificat)
    assert raised.value.status_code == 400
    assert "Semnatura" in raised.value.detail


def test_state_ul_expirat_e_respins(spv):
    """Codul de autorizare traieste cateva minute; un `state` de acum o ora nu
    mai are ce cauta la intoarcere."""
    vechi = spv.make_state(COMPANY, issued_at=int(time.time()) - 3600)
    with pytest.raises(HTTPException) as raised:
        spv.read_state(vechi)
    assert "expirat" in raised.value.detail


def test_state_ul_malformat_e_respins(spv):
    for valoare in ("", "abc", "a.b", str(COMPANY), "a.b.c.d"):
        with pytest.raises(HTTPException):
            spv.read_state(valoare)


def test_semnatura_se_compara_in_timp_constant(spv):
    """`hmac.compare_digest`, nu `==`.

    Comparatia obisnuita se opreste la primul octet diferit, iar diferenta de
    timp ii spune atacatorului cate caractere a nimerit. Testul se uita la
    sursa: e singurul mod de a prinde o inlocuire facuta la o refactorizare.
    """
    import inspect

    source = inspect.getsource(spv.read_state)
    assert "compare_digest" in source


# --- pasul doi: intoarcerea de la ANAF -------------------------------------

def test_callback_fara_cod_nu_face_nimic(app_client):
    response = app_client.get("/anaf/callback")
    assert response.status_code == 400
    assert "code" in response.json()["detail"]


def test_callback_cu_state_nesemnat_e_respins(app_client):
    response = app_client.get(
        f"/anaf/callback?code=abc&state={COMPANY}.{int(time.time())}.zzzz")
    assert response.status_code == 400
    assert "Semnatura" in response.json()["detail"]


def test_refuzul_de_la_anaf_ajunge_la_om(app_client):
    """ANAF se intoarce cu `?error=`, nu cu cod. Mesajul trebuie sa spuna asta,
    nu sa arate ca o eroare a aplicatiei noastre."""
    response = app_client.get(
        "/anaf/callback?error=access_denied&error_description=Certificat+lipsa")
    assert response.status_code == 400
    detail = response.json()["detail"]
    assert "access_denied" in detail
    assert "Certificat" in detail


def test_schimbul_de_cod_nu_se_incearca_fara_state_valid(app_client, monkeypatch):
    """Ordinea conteaza: intai verificam `state`, apoi vorbim cu ANAF.

    Invers, oricine ar putea consuma cote si ar putea provoca apeluri catre
    `logincert` trimitand coduri inventate.
    """
    from app.core.anaf import oauth

    def nu_ajunge_aici(*args, **kwargs):
        raise AssertionError("s-a apelat exchange_code cu `state` invalid")

    monkeypatch.setattr(oauth, "exchange_code", nu_ajunge_aici)
    response = app_client.get("/anaf/callback?code=abc&state=nu.e.bun")
    assert response.status_code == 400


def test_tokenurile_nu_ies_in_raspuns(app_client, monkeypatch):
    """Raspunsul confirma autorizarea si atat. Tokenul ramane in baza, criptat.

    Un `access_token` afisat in browser ajunge in istoric, in bara de adresa a
    capturii de ecran urmatoare si in orice extensie instalata.
    """
    from datetime import UTC, datetime, timedelta

    from app.api import spv as module
    from app.core.anaf import oauth

    now = datetime.now(UTC)
    perechea = oauth.TokenPair(
        access_token="ACCESS-SECRET", refresh_token="REFRESH-SECRET",
        access_expires_at=now + timedelta(days=90),
        refresh_expires_at=now + timedelta(days=365))

    monkeypatch.setattr(oauth, "exchange_code", lambda *a, **k: perechea)

    stocate = {}

    class FakeSession:
        def execute(self, *args, **kwargs):
            class Result:
                def one_or_none(self_inner):
                    return (1,)
            return Result()

    import contextlib

    @contextlib.contextmanager
    def fake_tenant(company_id):
        yield FakeSession()

    monkeypatch.setattr(module, "tenant", fake_tenant)
    monkeypatch.setattr(oauth, "store",
                        lambda *a, **k: stocate.update(salvat=True))

    state = module.make_state(COMPANY)
    response = app_client.get(f"/anaf/callback?code=abc&state={state}")

    assert response.status_code == 200
    body = response.text
    assert "ACCESS-SECRET" not in body
    assert "REFRESH-SECRET" not in body
    assert response.json()["status"] == "autorizat"
    assert stocate.get("salvat") is True
