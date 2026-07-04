# Design: prod-readiness-fixes

## Fix 1 — Volumen de código fuente en backend/docker-compose.yml

**Archivo:** `backend/docker-compose.yml`

**Enfoque:** Este Compose es una vía de desarrollo rápido para levantar solo
backend + Postgres (el stack completo de producción es el `docker-compose.yml`
raíz, que ya no monta código fuente). El bind mount `./:/app` no aporta hot
reload real (el `CMD` del Dockerfile no corre `--reload`), así que se elimina
directamente en lugar de condicionarlo. Se documenta en el `README.md` del
backend que este archivo es para desarrollo local y que el stack de
producción es el Compose raíz.

```yaml
# Antes
  api:
    ...
    volumes:
      - ./:/app

# Después
  api:
    ...
    # (sin bind mount — la imagen ya tiene el código copiado en el build)
```

---

## Fix 2 — Guard de CORS permisivo en producción

**Archivo:** `backend/app/core/config.py`, `backend/app/main.py`

**Enfoque:** Mismo patrón que la validación de `SECRET_KEY` ya existente en
`lifespan()`. Se agrega una property `has_insecure_cors` en `Settings` que
detecta si algún origin configurado es `localhost`/`127.0.0.1`. En el
`lifespan`, si `settings.is_production` y `settings.has_insecure_cors`, se
levanta `RuntimeError` con un mensaje explicando qué variable corregir.

```python
# config.py
_LOCALHOST_MARKERS = ("localhost", "127.0.0.1")

@property
def has_insecure_cors(self) -> bool:
    return any(marker in origin for origin in self.cors_origins for marker in _LOCALHOST_MARKERS)
```

```python
# main.py (lifespan, junto al check de SECRET_KEY)
if settings.is_production and settings.has_insecure_cors:
    raise RuntimeError(
        "BACKEND_CORS_ORIGINS contiene localhost/127.0.0.1 en producción. "
        "Seteá la variable de entorno BACKEND_CORS_ORIGINS con el dominio real "
        "antes de iniciar (ej: https://crowrepuestos.com)."
    )
```

No se toca el default de desarrollo (`http://localhost:5173,...`) — solo se
bloquea si coexiste con `ENVIRONMENT=production`.

---

## Fix 3 — Índices faltantes: quotes.user_id, audit_logs.created_at

**Archivo:** `backend/alembic/versions/008_quote_audit_indexes.py` (nueva
migración, `down_revision = "007"`)

**Enfoque:** Índices simples, sin condición parcial (a diferencia de la 006,
acá no hay soft delete de por medio).

```python
def upgrade() -> None:
    op.create_index("ix_quotes_user_id", "quotes", ["user_id"])
    op.create_index(
        "ix_audit_logs_created_at",
        "audit_logs",
        [sa.text("created_at DESC")],
    )

def downgrade() -> None:
    op.drop_index("ix_audit_logs_created_at", table_name="audit_logs")
    op.drop_index("ix_quotes_user_id", table_name="quotes")
```

No se modifican los modelos SQLAlchemy (los índices no necesitan reflejarse
en `Mapped[...]` para que SQLAlchemy los use — solo Alembic los necesita para
generar el DDL).
