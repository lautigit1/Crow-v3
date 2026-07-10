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

EXPOSE 8000

# Startup:
#   - production: alembic upgrade head (fuente de verdad del schema) y despues
#     el seed (idempotente; en prod solo asegura el admin, sin producto demo).
#   - dev: seed directo -- create_all + reconcile() cubren el schema, ver
#     scripts/verify_db_integrity.py y app/seed.py.
CMD ["sh", "-c", "if [ \"$ENVIRONMENT\" = \"production\" ]; then alembic upgrade head; fi && python -m app.seed && exec uvicorn app.main:app --host 0.0.0.0 --port 8000"]
