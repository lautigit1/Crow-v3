FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# System deps for psycopg2 / bcrypt
RUN apt-get update \
    && apt-get install -y --no-install-recommends gcc libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# No correr como root dentro del contenedor -- si el proceso de la API se
# compromete (ej. una dependencia con una CVE), un usuario sin privilegios
# limita el daño al filesystem del propio contenedor en vez de tener UID 0.
# chown va antes del USER switch porque root todavía puede escribir; después
# de la migración a `appuser` ya no podría.
RUN groupadd --gid 1000 appuser \
    && useradd --uid 1000 --gid appuser --shell /bin/bash --create-home appuser \
    && chown -R appuser:appuser /app
USER appuser

EXPOSE 8000

# Startup:
#   - production: alembic upgrade head (fuente de verdad del schema) y despues
#     el seed (idempotente; en prod solo asegura el admin, sin producto demo).
#   - dev: seed directo -- create_all + reconcile() cubren el schema, ver
#     scripts/verify_db_integrity.py y app/seed.py.
#
# --workers: hallazgo "Alta" #15 de la auditoría técnica del 2026-07-13 --
# un único proceso uvicorn no usa más de un core de CPU y es un punto único
# de caída (si ese proceso se cuelga, el contenedor entero deja de responder
# hasta que el healthcheck lo reinicie). El resto del stack ya está
# preparado para esto: `lifespan()` en app/main.py exige Redis en producción
# justo para que la blocklist de tokens y el rate limiting sean consistentes
# entre workers, y docker-compose.prod.yml ya corre pgbouncer para que el
# pool de conexiones de SQLAlchemy (DB_POOL_SIZE) multiplicado por N workers
# no sature a Postgres directamente. UVICORN_WORKERS es configurable por
# entorno (sin rebuildear la imagen) con default conservador de 2.
CMD ["sh", "-c", "if [ \"$ENVIRONMENT\" = \"production\" ]; then alembic upgrade head; fi && python -m app.seed && exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers ${UVICORN_WORKERS:-2}"]
