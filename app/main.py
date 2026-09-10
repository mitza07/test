from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.api import clients, documents, payments, products, series, spv
from app.config import get_settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    # assert_safe() ridica exceptie daca un mediu de dev are ANAF_ENVIRONMENT=prod
    settings = get_settings()
    app.state.settings = settings
    yield


app = FastAPI(title="facturare", lifespan=lifespan)

for module in (clients, products, series, documents, payments, spv):
    app.include_router(module.router)


@app.get("/health")
def health() -> dict[str, str]:
    settings = get_settings()
    return {
        "status": "ok",
        "app_env": settings.app_env,
        "anaf_environment": settings.anaf_environment,
    }
