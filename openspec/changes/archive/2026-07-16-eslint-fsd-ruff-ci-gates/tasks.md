# Tasks: eslint-fsd-ruff-ci-gates

## Frontend

- [x] **T1** — Instalar `eslint@9`, `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, `@eslint/js`, `globals`, `steiger`
- [x] **T2** — `frontend/eslint.config.js` (flat config, reglas de calidad TS/React)
- [x] **T3** — Corregir el único error real de ESLint (`no-irregular-whitespace` intencional en `format.test.ts`, con `eslint-disable-next-line` documentado) y el warning de `exhaustive-deps` intencional en `useInView.ts`
- [x] **T4** — Correr Steiger, relevar las ~64 violaciones iniciales agrupadas por regla
- [x] **T5** — Mover `AuthContext`/`useAuth` de `app/providers/AuthProvider.tsx` a `entities/session/context.tsx` (fix real de `fsd/forbidden-imports`); actualizar 17 archivos + 2 tests con `vi.mock`
- [x] **T6** — Crear barrels reales (`index.ts`) para `entities/session`, `entities/upload`, `shared/api`, `shared/config` (reemplazando los stubs vacíos que generó `steiger --fix`)
- [x] **T7** — Reescribir ~26 imports profundos para pasar por el barrel del segmento (`sed` sobre `src/`)
- [x] **T8** — Fusionar `shared/hooks/useConfirm.ts` dentro de `shared/lib/` (fix de `fsd/segments-by-purpose`); actualizar 6 imports
- [x] **T9** — `frontend/steiger.config.js` con las 3 excepciones documentadas (`no-segmentless-slices`/`segments-by-purpose` off global, `public-api`/`no-public-api-sidestep` off para `pages/admin` por code-splitting, `insignificant-slice` off para `entities/upload`)
- [x] **T10** — Verificar `npm run build:ci` sigue generando chunks separados por página de admin
- [x] **T11** — Script `lint`/`lint:eslint`/`lint:fsd` en `package.json`
- [x] **T12** — Step "Lint (ESLint + arquitectura FSD)" bloqueante en `.github/workflows/frontend.yml`

## Backend

- [x] **T13** — Agregar `ruff` a `requirements-dev.txt`
- [x] **T14** — `backend/pyproject.toml` con config de ruff (select conservador, ignores documentados)
- [x] **T15** — Correr `ruff check . --fix` (45 fixes automáticos: imports sin usar, orden de imports)
- [x] **T16** — Detectar y revertir el fix automático de `UP017` (`datetime.UTC`) por incompatibilidad con Python 3.10 del entorno de verificación; agregar `UP017`/`UP042`/`UP046` al ignore
- [x] **T17** — Corregir `E402` (import fuera de lugar) en `auth.py`
- [x] **T18** — Corregir `B904` (raise sin `from`) en `deps.py` x2 y `auth.py` x1, con `from None` explícito y comentario
- [x] **T19** — `noqa: F821` documentado para 3 forward-refs de SQLAlchemy en `models/order.py` y `models/supplier.py`
- [x] **T20** — Corregir `E741` (nombre ambiguo `l`) en `exceptions.py`
- [x] **T21** — Corregir `B007` (variable de loop sin usar) en `scripts/verify_db_integrity.py`
- [x] **T22** — Corregir `C408`/`C416` (dict/comprehension innecesarios) en `email.py`, `suppliers.py`, `test_audit.py`
- [x] **T23** — Step "Lint (ruff)" bloqueante en `.github/workflows/backend.yml`

## Hallazgo colateral (corrupción del mount de OneDrive)

- [x] **T24** — Detectar y corregir corrupción por desync del mount en ~15 archivos backend/frontend tocados en este cambio (patrón `Write` a sibling + `mv -f`)
- [x] **T25** — Encontrar y corregir bug preexistente (no introducido en este cambio) en `app/schemas/setting.py` (`phone_display` sin default, rompía 4 tests de `test_settings.py`)

## Verificación final

- [x] **T26** — `npm run lint` — 0 errores
- [x] **T27** — `npx tsc --noEmit` — 0 errores
- [x] **T28** — `npx vitest run` — 76/76 tests
- [x] **T29** — `npm run build:ci` — build exitoso
- [x] **T30** — `ruff check .` — 0 errores
- [x] **T31** — `pytest` — 249/249 tests (3 tandas)
