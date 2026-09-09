"""Configurarea, si mai ales cele doua URL-uri de baza de date.

Separarea nu e cosmetica. Aplicatia se conecteaza cu un rol care NU are drepturi
de schema si NU ocoleste RLS; migratiile ruleaza cu proprietarul schemei. Daca
cele doua s-ar amesteca, ori izolarea intre firme devine inactiva, ori migratiile
nu mai pot rula — si amandoua esueaza tarziu, in productie.
"""

import pytest

pytest.importorskip("pydantic_settings")

from app.config import Settings  # noqa: E402

BASE = {
    "database_url": "postgresql+psycopg://app:x@db:5432/facturare",
    "token_encryption_key": "dGVzdC1jaGVpZS1udW1haS1wZW50cnUtY2k9PQ==",
}


def test_migratiile_cad_pe_urlul_aplicatiei_cand_nu_e_configurat_altul():
    """In dev un singur rol face ambele treburi; nu vrem sa ceara doua URL-uri
    ca sa poti rula `alembic upgrade head` pe laptop."""
    settings = Settings(**BASE, _env_file=None)
    assert settings.migration_database_url == BASE["database_url"]


def test_urlul_de_migratie_are_prioritate_cand_exista():
    admin = "postgresql+psycopg://owner:y@db:5432/facturare"
    settings = Settings(**BASE, admin_database_url=admin, _env_file=None)
    assert settings.migration_database_url == admin
    # Aplicatia ramane pe rolul ei, indiferent ce s-a configurat pentru migratii.
    assert settings.database_url == BASE["database_url"]


def test_alembic_foloseste_urlul_de_migratie_nu_pe_cel_al_aplicatiei():
    """Testul se uita la sursa: daca cineva pune la loc `database_url` acolo,
    migratia va rula cu rolul aplicatiei si va esua abia pe server."""
    from pathlib import Path

    source = Path("alembic/env.py").read_text()
    assert "migration_database_url" in source
    assert "get_settings().database_url" not in source


def test_dev_refuza_sa_vorbeasca_cu_spv_ul_de_productie():
    """Constrangere de infrastructura: o factura de test trimisa pe /prod/ arde
    un numar de serie intr-un document care nu exista in evidenta."""
    settings = Settings(**BASE, app_env="dev", anaf_environment="prod",
                        _env_file=None)
    with pytest.raises(RuntimeError, match="ANAF_ENVIRONMENT=prod"):
        settings.assert_safe()


def test_prod_cu_mediu_de_test_e_permis():
    """Invers e in regula: productia poate rula pe /test/ cat timp se probeaza."""
    settings = Settings(**BASE, app_env="prod", anaf_environment="test",
                        _env_file=None)
    settings.assert_safe()


def test_calea_de_api_urmeaza_mediul():
    for mediu in ("test", "prod"):
        settings = Settings(**BASE, anaf_environment=mediu, _env_file=None)
        assert settings.anaf_api_base.endswith(f"/{mediu}/FCTEL/rest")
