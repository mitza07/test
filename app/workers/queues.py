"""Cozile RQ.

Trei cozi, pentru ca au profiluri diferite de esec:

  - `pdf`   — WeasyPrint. Consuma memorie si CPU, si NU are voie sa ruleze in
              procesul API (constrangerea din CLAUDE.md). Poate fi reluat oricand:
              randarea e idempotenta.
  - `spv`   — apeluri catre ANAF. Lente, cu cote zilnice, si cu o clasa de esec
              care NU se reia automat (upload in stare `unknown`).
  - `default` — restul.

Separarea conteaza pentru ca un PDF care blocheaza un worker nu are voie sa
intarzie transmiterea unei facturi care se apropie de termenul legal.
"""

from __future__ import annotations

from functools import lru_cache

from redis import Redis
from rq import Queue

from app.config import get_settings

QUEUE_PDF = "pdf"
QUEUE_SPV = "spv"
QUEUE_DEFAULT = "default"

# Apelurile catre ANAF pot dura; RQ omoara jobul dupa `job_timeout`.
SPV_JOB_TIMEOUT = 300
PDF_JOB_TIMEOUT = 120


@lru_cache(maxsize=1)
def get_redis() -> Redis:
    return Redis.from_url(get_settings().redis_url)


@lru_cache(maxsize=4)
def get_queue(name: str = QUEUE_DEFAULT) -> Queue:
    return Queue(name, connection=get_redis())


def enqueue_spv(function, *args, **kwargs):
    return get_queue(QUEUE_SPV).enqueue(function, *args,
                                        job_timeout=SPV_JOB_TIMEOUT, **kwargs)


def enqueue_pdf(function, *args, **kwargs):
    return get_queue(QUEUE_PDF).enqueue(function, *args,
                                        job_timeout=PDF_JOB_TIMEOUT, **kwargs)
