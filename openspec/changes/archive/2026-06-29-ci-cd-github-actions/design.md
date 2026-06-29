# Design: ci-cd-github-actions

## Estructura de archivos

```
.github/
  workflows/
    backend.yml    ← tests de Python + pytest
    frontend.yml   ← tsc + vite build
```

## Workflow: backend.yml

**Trigger:** push y pull_request a `master`, solo cuando cambian archivos en `backend/**` o el propio workflow.

**Steps:**
1. Checkout
2. Setup Python 3.12
3. Cache de pip (key basada en `requirements.txt`)
4. `pip install -r requirements.txt` + dependencias de test (`pytest`, `httpx`)
5. `pytest` con variable `TESTING=1` para que el startup no espere DB

**Base de datos:** Los tests usan SQLite in-memory (conftest.py ya lo maneja), no necesitan PostgreSQL en CI.

## Workflow: frontend.yml

**Trigger:** push y pull_request a `master`, solo cuando cambian archivos en `frontend/**` o el propio workflow.

**Steps:**
1. Checkout
2. Setup Node.js 20
3. Cache de npm (key basada en `package-lock.json`)
4. `npm ci` (instalación limpia y reproducible)
5. `npm run build:ci` (= `tsc --noEmit && vite build`)

## Decisiones de diseño

- **Path filters:** Evita correr el pipeline de backend cuando solo cambia el frontend y viceversa. Ahorra tiempo de CI.
- **`npm ci` en lugar de `npm install`:** Usa el lockfile exacto, más rápido y reproducible en CI.
- **Cache de dependencias:** Reduce el tiempo de ~2 min a ~20s en runs subsiguientes.
- **`TESTING=1`:** La variable ya está contemplada en `main.py` — saltea la espera de DB y la validación de `SECRET_KEY`.
- **Sin `ruff` por ahora:** No hay linter configurado en el proyecto. Agregarlo es un change separado para no mezclar concerns.
