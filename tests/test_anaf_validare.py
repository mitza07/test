"""Clientul pentru validatorul public ANAF.

Nu se apeleaza reteaua: raspunsurile sunt montate cu httpx.MockTransport. Testul
verifica exact partea noastra — alegerea endpointului, parsarea raspunsului si,
mai ales, ca esecul de retea NU se traduce in „document invalid".
"""

import httpx
import pytest

from app.core.anaf.validare import (
    BASE_URL,
    ValidationResponse,
    standard_for,
    validate_xml,
)

XML = b"<Invoice/>"


def _client(handler):
    return httpx.Client(transport=httpx.MockTransport(handler))


def _responder(status=200, text="", capture=None):
    def handler(request):
        if capture is not None:
            capture["url"] = str(request.url)
            capture["body"] = request.content
            capture["content_type"] = request.headers.get("content-type")
        return httpx.Response(status, text=text)
    return handler


# --- alegerea endpointului -------------------------------------------------

def test_nota_de_creditare_merge_la_fcn():
    """381 e CreditNote. Trimisa la FACT1 da eroare de structura, nu de reguli."""
    assert standard_for("381") == "FCN"


@pytest.mark.parametrize("code", ["380", "384", "389", "751", None])
def test_restul_merg_la_fact1(code):
    assert standard_for(code) == "FACT1"


def test_endpointul_si_content_type_ul_sunt_cele_documentate():
    captured = {}
    with _client(_responder(text='{"stare":"ok"}', capture=captured)) as client:
        validate_xml(XML, "FACT1", client=client)
    assert captured["url"] == f"{BASE_URL}/FACT1"
    assert captured["content_type"] == "text/plain"
    assert captured["body"] == XML


# --- parsarea raspunsului --------------------------------------------------

def test_stare_ok():
    with _client(_responder(text='{"stare":"ok","trace_id":"abc"}')) as client:
        result = validate_xml(XML, client=client)
    assert result.ok is True
    assert result.unknown is False


def test_stare_nok_cu_mesaje():
    payload = ('{"stare":"nok","Messages":[{"message":"BR-RO-101: localitatea trebuie '
               'sa fie SECTOR1..SECTOR6"}]}')
    with _client(_responder(text=payload)) as client:
        result = validate_xml(XML, client=client)
    assert result.ok is False
    assert "SECTOR1" in result.messages[0]


def test_raspuns_fara_stare_dar_cu_erori_e_respingere():
    with _client(_responder(text='{"Messages":[{"message":"XML invalid"}]}')) as client:
        result = validate_xml(XML, client=client)
    assert result.ok is False
    assert result.messages == ["XML invalid"]


def test_campul_info_e_preluat():
    with _client(_responder(text='{"info":"Serviciu indisponibil"}')) as client:
        result = validate_xml(XML, client=client)
    assert result.messages == ["Serviciu indisponibil"]


# --- ce nu stim nu e respingere -------------------------------------------

def test_html_in_loc_de_json_nu_e_verdict():
    """Portalul raspunde uneori cu HTML — mentenanta, zid F5. Nu inseamna invalid."""
    with _client(_responder(text="<html>mentenanta</html>")) as client:
        result = validate_xml(XML, client=client)
    assert result.ok is None
    assert result.unknown is True


def test_eroare_http_nu_e_verdict():
    with _client(_responder(status=503, text="unavailable")) as client:
        result = validate_xml(XML, client=client)
    assert result.unknown is True
    assert "503" in result.messages[0]


def test_esecul_de_retea_nu_ridica_exceptie():
    """Emiterea nu are voie sa depinda de un serviciu optional din flux."""
    def explode(request):
        raise httpx.ConnectTimeout("timeout")

    with _client(explode) as client:
        result = validate_xml(XML, client=client)
    assert result.unknown is True
    assert "Apel esuat" in result.messages[0]


def test_unknown_nu_e_confundat_cu_false():
    """Aceeasi regula ca la spv_status='unknown': absenta raspunsului nu e un
    raspuns negativ. `if not result.ok` ar trata ambele la fel — de-asta exista
    proprietatea `unknown`."""
    assert ValidationResponse(ok=None).unknown is True
    assert ValidationResponse(ok=False).unknown is False
