# Design: critical-fixes

## Fix 1 — Credenciales hardcodeadas en docker-compose.yml

**Archivo:** `docker-compose.yml` (raíz) y `backend/docker-compose.yml`

**Enfoque:** Reemplazar valores hardcodeados por referencias a variables de entorno con `${VAR}`. Agregar validación en el startup de FastAPI que falle rápido si `SECRET_KEY` tiene el valor por defecto. Crear `.env.example` en la raíz con las variables requeridas.

```
docker-compose.yml
  SECRET_KEY: change-me-...   →   SECRET_KEY: ${SECRET_KEY}
  SEED_ADMIN_PASSWORD: admin1234  →  SEED_ADMIN_PASSWORD: ${SEED_ADMIN_PASSWORD}

backend/app/main.py (lifespan)
  + if settings.SECRET_KEY == "change-me-in-production-please":
  +     raise RuntimeError("SECRET_KEY no configurada. Seteá la variable de entorno.")
```

**.env.example (raíz):**
```
SECRET_KEY=           # requerido — generá con: openssl rand -hex 32
SEED_ADMIN_PASSWORD=  # requerido — contraseña del admin inicial
```

---

## Fix 2 — TTL inconsistente del access token

**Archivo:** `docker-compose.yml` (raíz)

**Enfoque:** El Compose raíz tiene `ACCESS_TOKEN_EXPIRE_MINUTES: "1440"` (24h). El valor correcto, consistente con el backend Compose y la config de FastAPI, es 30 minutos. Cambiar el valor.

```
ACCESS_TOKEN_EXPIRE_MINUTES: "1440"  →  ACCESS_TOKEN_EXPIRE_MINUTES: "30"
```

---

## Fix 3 — Soft delete completo: deleted_at, dashboard y restauración

### 3a. Nueva columna `deleted_at` (migración Alembic)

**Archivo:** `backend/alembic/versions/004_product_deleted_at.py`

Agrega columna `deleted_at: TIMESTAMP WITH TIME ZONE, nullable, default NULL` a la tabla `products`. Al eliminar un producto, se setea a `NOW()` en UTC. Al restaurar, vuelve a `NULL`.

### 3b. Modelo Product

**Archivo:** `backend/app/models/product.py`

```python
deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True, default=None)
```

### 3c. Setear deleted_at al eliminar

**Archivo:** `backend/app/api/routes/products.py` (endpoint DELETE)

Al hacer soft delete, además de `is_deleted=True`, setear `deleted_at=datetime.now(timezone.utc)`.

### 3d. Endpoint de restauración

**Archivo:** `backend/app/api/routes/products.py`

```
PATCH /api/products/{id}/restore   (admin only)
```
Setea `is_deleted=False`, `deleted_at=None`. Registra en audit log. Devuelve el producto restaurado.

### 3e. Schema ProductRead

**Archivo:** `backend/app/schemas/product.py`

Agregar `deleted_at: datetime | None` al schema de respuesta. El campo se devuelve en UTC (el frontend formatea a ART).

### 3f. Dashboard — filtrar productos eliminados

**Archivo:** `backend/app/api/routes/dashboard.py`

Todas las queries sobre `Product` agregan `.where(Product.is_deleted.is_(False))`:
- `total_products`
- `out_of_stock`
- Stock buckets en analytics (out_of_stock, low_stock, in_stock)
- `inventory_value`
- `products_by_category`, `products_by_supplier`, `products_by_vehicle`

### 3g. Frontend — panel admin de productos eliminados

**Archivo:** `frontend/src/pages/admin/AdminProductsPage.tsx`

- Agregar tab/toggle "Eliminados" en el panel de productos
- Cuando está activo, el listado muestra productos con `is_deleted=true`
- Cada fila muestra la fecha `deleted_at` formateada en ART (`America/Argentina/Buenos_Aires`)
- Botón "Restaurar" en cada fila que llama a `PATCH /api/products/{id}/restore`
- Al restaurar exitosamente, el producto desaparece de la lista de eliminados

---

## Fix 4 — Bug en register rate limiter

**Archivo:** `backend/app/api/routes/auth.py`

**Problema doble:**
1. Se llama `register_failure()` después de un registro **exitoso** (debería ser solo en fallos).
2. La clave usada es `(ip, ip or "anon")` en lugar de `(ip, email)`.

**Enfoque:** Eliminar la llamada a `register_failure()` del flujo de registro exitoso. Si se quiere penalizar intentos abusivos, llamarlo solo cuando el registro falla por razones que indiquen abuso (ej: email duplicado masivo). En esta iteración, simplemente se elimina la llamada incorrecta.

```python
# Eliminar esta línea del path exitoso:
_register_limiter.register_failure(ip, ip or "anon")
```

---

## Fix 5 — build:ci sin validación TypeScript

**Archivo:** `frontend/package.json`

**Enfoque:** El script `build:ci` corre `vite build` sin pasar por `tsc`. Agregar `tsc --noEmit` como paso previo para que los errores de tipos rompan el build.

```json
// Antes
"build:ci": "vite build"

// Después
"build:ci": "tsc --noEmit && vite build"
```

---

## Fix 6 — node_modules en git

**Archivos:** `.gitignore` (raíz y/o frontend/)

**Enfoque:** Verificar y corregir el `.gitignore` para que incluya `node_modules/`, `__pycache__/`, `.pytest_cache/`, y `*.pyc`. El archivo `frontend/node_modules/` ya está trackeado — hay que removerlo del índice de git con `git rm -r --cached frontend/node_modules`. No se elimina del disco, solo del tracking.

```
# Agregar a .gitignore:
node_modules/
__pycache__/
*.pyc
.pytest_cache/
*.egg-info/
```

> Nota: La purga del historial completo (con BFG o git filter-repo) es una mejora adicional fuera del scope de este change, ya que requiere force-push y coordinación si hay más colaboradores.
