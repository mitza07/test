FROM python:3.12-slim AS base

# WeasyPrint depinde de Pango/Cairo. Noto Sans are suport Romanian Extended
# (s si t cu virgula), spre deosebire de Liberation si DejaVu.
RUN apt-get update && apt-get install -y --no-install-recommends \
        libpango-1.0-0 libpangoft2-1.0-0 libharfbuzz0b libffi8 \
        fonts-noto-core fonts-noto-extra \
        libxml2 libxslt1.1 curl \
    && rm -rf /var/lib/apt/lists/*

ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1
WORKDIR /srv

COPY requirements.txt requirements-dev.txt ./
ARG INSTALL_DEV=false
RUN pip install --no-cache-dir -r requirements.txt \
    && if [ "$INSTALL_DEV" = "true" ]; then pip install --no-cache-dir -r requirements-dev.txt; fi

COPY . .
RUN useradd -m app && mkdir -p /data/storage && chown -R app:app /srv /data
USER app

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
