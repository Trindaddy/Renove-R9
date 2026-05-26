# --- Stage 1: Build dependencies ---
FROM python:3.12-slim AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

# Instalar dependências em um diretório temporário para copiar no próximo estágio
RUN pip install --no-cache-dir --user -r requirements.txt

# --- Stage 2: Final Runtime Stage ---
FROM python:3.12-slim AS runtime

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    && rm -rf /var/lib/apt/lists/*

# Copiar dependências instaladas no estágio anterior
COPY --from=builder /root/.local /root/.local
COPY . /app

ENV PATH=/root/.local/bin:$PATH
ENV PYTHONUNBUFFERED=1
ENV PORT=8000
ENV CREATE_TABLES_ON_STARTUP=false

EXPOSE 8000

# Executar a aplicação via Gunicorn rodando workers do Uvicorn para alta concorrência
CMD gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT
