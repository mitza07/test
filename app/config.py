"""Configurare. `ANAF_ENVIRONMENT` este variabila de INFRASTRUCTURA."""

from __future__ import annotations

from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_env: Literal["dev", "prod"] = "dev"
    log_level: str = "INFO"

    database_url: str
    redis_url: str = "redis://redis:6379/0"

    token_encryption_key: str

    anaf_environment: Literal["test", "prod"] = "test"
    anaf_client_id: str = ""
    anaf_client_secret: str = ""
    anaf_redirect_uri: str = ""

    storage_path: str = "/data/storage"
    schematron_path: str = "/data/schematron/ro16931-ubl-1.0.9"

    @property
    def anaf_api_base(self) -> str:
        return f"https://api.anaf.ro/{self.anaf_environment}/FCTEL/rest"

    def assert_safe(self) -> None:
        """Un mediu de dev NU are voie sa vorbeasca cu SPV-ul de productie.

        O factura de test trimisa pe /prod/ arde un numar de serie intr-un
        document care nu exista in evidenta.
        """
        if self.app_env == "dev" and self.anaf_environment == "prod":
            raise RuntimeError(
                "ANAF_ENVIRONMENT=prod intr-un mediu de dezvoltare. "
                "Refuz pornirea: risc de emitere reala din date de test."
            )


@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    settings.assert_safe()
    return settings
