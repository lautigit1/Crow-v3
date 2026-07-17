# Apply: eslint-fsd-ruff-ci-gates

## Resumen

Se agregaron ESLint 9 + Steiger (arquitectura FSD) al frontend y ruff al backend, ambos bloqueantes en CI. Hallazgo "Alta" #11 de la auditoría técnica del 2026-07-13. Ambos linters partieron de cero (no había configuración previa de ninguno) y se llevaron a 0 errores sobre el código real, no solo instalados y dejados con warnings sin resolver.

Durante el trabajo se encontró y corrigió una violación real de arquitectura (`AuthProvider` importado "hacia arriba" desde `app` por 17 archivos de capas inferiores) y un bug preexistente de otra sesión (`SiteSettingsUpdate.phone_display` sin default, rompía updates parciales de configuración).

## Archivos modificados (frontend)

- `frontend/eslint.config.js` (nuevo)
- `frontend/steiger.config.js` (nuevo)
- `frontend/package.json` — nuevas devDependencies + scripts `lint`/`lint:eslint`/`lint:fsd`
- `frontend/src/entities/session/context.tsx` (nuevo) — `AuthContext`/`useAuth`/`AuthProvider` movidos acá
- `frontend/src/entities/session/index.ts`, `entities/upload/index.ts`, `shared/api/index.ts`, `shared/config/index.ts` (nuevos, barrels reales)
- `frontend/src/app/providers/AuthProvider.tsx` — reducido a re-export de `entities/session`
- `frontend/src/shared/lib/useConfirm.ts` (movido desde `shared/hooks/`, carpeta eliminada)
- 17 archivos de `pages/`, `widgets/`, `features/`, `app/` — import de `useAuth`/`AuthProvider` migrado a `@/entities/session`
- ~26 imports profundos migrados a barrels (`@/shared/api`, `@/shared/config`, `@/entities/upload`, `@/entities/session`)
- `frontend/src/__tests__/format.test.ts`, `shared/lib/useInView.ts` — 1 error y 1 warning de ESLint corregidos
- `.github/workflows/frontend.yml` — step "Lint" bloqueante

## Archivos modificados (backend)

- `backend/pyproject.toml` (nuevo) — config de ruff
- `backend/requirements-dev.txt` — agrega `ruff`
- `backend/app/api/routes/auth.py`, `app/core/deps.py` — fixes de `E402`/`B904`
- `backend/app/models/order.py`, `app/models/supplier.py` — `noqa: F821` documentado
- `backend/app/core/exceptions.py` — `E741`
- `backend/scripts/verify_db_integrity.py` — `B007`
- `backend/app/core/email.py`, `app/api/routes/suppliers.py`, `backend/tests/test_audit.py` — `C408`/`C416`
- `backend/app/schemas/setting.py` — **bug preexistente corregido** (`phone_display: str | None = None`, no relacionado a ruff, encontrado al forzar una corrida limpia de pytest)
- `.github/workflows/backend.yml` — step "Lint (ruff)" bloqueante

## Decisiones documentadas

- Steiger (no `eslint-plugin-boundaries`) para las reglas de FSD — es el linter oficial del propio framework de arquitectura.
- Tres categorías de reglas de Steiger desactivadas con justificación explícita en `steiger.config.js` (slices planas como convención deliberada del repo; `pages/admin` excluido de `public-api` por code-splitting real, verificado con el build; `entities/upload` excluido de `insignificant-slice`).
- `UP017`/`UP042`/`UP046` de ruff ignorados — sugieren sintaxis de Python 3.11+/3.12+ que rompe en el Python 3.10 del entorno de verificación local, aunque CI/producción corran 3.12. Confirmado empíricamente (no solo por precaución): `ruff --fix` los aplicó y rompió pytest local con un `ImportError` real.
- `noqa: F821` puntual (no ignore global de la regla) para los 3 forward-refs de SQLAlchemy — F821 sigue atrapando bugs reales en el resto del código.

## Verificación

- Frontend: `npm run lint` (0 errores), `tsc --noEmit` (0 errores), `vitest run` (76/76), `npm run build:ci` (build OK, code-splitting de `pages/admin` intacto).
- Backend: `ruff check .` ("All checks passed!"), `pytest` (249/249, corrido en 3 tandas de ~40s por el límite del sandbox).

## Pendiente / limitaciones

- Las slices "planas" del frontend (sin segmentos `ui/model/api/lib`) quedan como deuda técnica documentada, no resuelta — reestructurarlas es un cambio grande fuera de alcance de este hallazgo puntual.
- `UP017`/`UP042`/`UP046` deberían revisarse cuando el equipo confirme que todo el flujo de desarrollo (no solo CI/producción) corre en Python 3.11+ de forma consistente.
- No se investigó a fondo el origen exacto de la corrupción del mount de OneDrive (más allá de caracterizar el síntoma y el workaround) — es un problema de infraestructura del entorno de esta sesión, no del código del repo.
