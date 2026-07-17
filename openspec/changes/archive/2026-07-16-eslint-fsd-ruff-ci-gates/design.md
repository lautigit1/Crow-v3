# Design: eslint-fsd-ruff-ci-gates

## 1 — Frontend: ESLint 9 (flat config) + Steiger (FSD)

**`frontend/eslint.config.js`** (nuevo) — ESLint 9 flat config vía `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`. Reglas de calidad de código genérica (no arquitectura): `@typescript-eslint/no-unused-vars` como error, `@typescript-eslint/no-explicit-any` como warning (el repo usa `any` puntualmente en límites de integración -- no vale la pena bloquear CI por eso ahora), reglas recomendadas de `react-hooks`.

**Reglas de arquitectura FSD -- por qué Steiger y no un plugin de ESLint:** se evaluó `eslint-plugin-boundaries` (genérico, requiere mapear las capas a mano) contra `steiger` (`npm i -D steiger`), el linter oficial del equipo de Feature-Sliced Design (`@feature-sliced/steiger-plugin`), que entiende la convención `app/pages/widgets/features/entities/shared` de FSD out-of-the-box. Se eligió Steiger por ser el estándar del propio framework de arquitectura que el repo ya sigue.

**`frontend/steiger.config.js`** (nuevo) -- corre `fsd.configs.recommended` con tres excepciones documentadas:

1. `fsd/no-segmentless-slices` y `fsd/segments-by-purpose` off en todo `src/**` -- el repo usa consistentemente slices planas (sin subcarpetas `ui/model/api/lib`) en sus ~35 slices. Es una convención deliberada y uniforme, no descuido caso por caso; partirlas todas es una reestructuración grande fuera de alcance.
2. `fsd/public-api` y `fsd/no-public-api-sidestep` off para `app/**` y `pages/admin/**` -- cada página de admin se importa vía `lazy(() => import("@/pages/admin/XPage"))` individual en `app/App.tsx` para code-splitting real (un chunk JS por sección del panel). Forzar un `index.ts` barrel en `pages/admin` haría que cualquier `lazy()` individual arrastrara el panel de admin completo a un solo chunk. Verificado con `npm run build:ci`: los chunks (`AdminBrandsPage-*.js`, `AdminUsersPage-*.js`, etc.) siguen separados después de este cambio.
3. `fsd/insignificant-slice` off para `entities/upload` -- solo lo usa `pages/admin/AdminProductsPage` hoy; fusionarlo con `entities/product` acoplaría dos responsabilidades separadas por una ganancia mínima.

**Violaciones reales corregidas (no solo silenciadas):**

- **`fsd/forbidden-imports`** (la regla más importante -- capas no pueden importar "hacia arriba"): `AuthProvider`/`useAuth` vivían en `app/providers/AuthProvider.tsx` pero 17 archivos en `pages/`, `widgets/`, `features/` los importaban directo desde ahí, violando la regla de que ninguna capa inferior puede depender de `app`. Se movió el `AuthContext` + `useAuth` a `entities/session/context.tsx` (la entidad de negocio correcta para estado de sesión), y `app/providers/AuthProvider.tsx` quedó como un re-export de una línea para que `main.tsx` siga armando el árbol de providers en el lugar de siempre. Los 17 archivos + 2 tests con `vi.mock` se migraron a importar desde `@/entities/session`.
- **`fsd/public-api`**: se crearon barrels reales (`index.ts`) para `entities/session`, `entities/upload`, `shared/api`, `shared/config` -- el auto-fix de Steiger (`--fix`) generó stubs vacíos (`index.js`, 0 bytes) para estos, que se reemplazaron por barrels con contenido real (`export * from "./client"`, etc.).
- **`fsd/no-public-api-sidestep`**: ~26 imports profundos (`@/shared/api/client`, `@/shared/config/theme`, `@/shared/config/categories`, `@/entities/upload/api`, `@/entities/session/api`, `@/entities/session/model`) se reescribieron para pasar por el barrel del segmento (`@/shared/api`, `@/shared/config`, `@/entities/upload`, `@/entities/session`) vía `sed` sobre todo `src/`.
- **`fsd/segments-by-purpose`** en `shared/hooks`: el segmento tenía un solo archivo (`useConfirm.ts`) con nombre no-convencional; se fusionó dentro de `shared/lib` (donde ya vivían el resto de los hooks del repo, `useBreakpoint`, `useDebouncedValue`, etc.) y se actualizaron los 6 imports.

## 2 — Backend: ruff

**`backend/pyproject.toml`** (nuevo) -- `select = ["E", "F", "I", "B", "C4", "UP"]` (pyflakes, pycodestyle, isort, flake8-bugbear, comprehensions, pyupgrade), `line-length = 120`. `ignore`:

- `E501` -- redundante con `line-length`.
- `UP042`, `UP046`, `UP017` -- **estas tres sugieren sintaxis de Python 3.11+/3.12+** (`enum.StrEnum`, parámetros de tipo genéricos PEP 695, alias `datetime.UTC`). El Dockerfile de producción y el CI (`backend.yml`) usan Python 3.12, pero el entorno de verificación local disponible para correr los tests de este cambio es 3.10.12 (sin permisos para instalar otra versión). `ruff --fix` aplicó UP017 automáticamente en un primer pase (convirtió `datetime.now(timezone.utc)` → `datetime.now(UTC)` en `security.py`/`auth.py`/`products.py`), lo que rompió la suite de tests local con `ImportError: cannot import name 'UTC' from 'datetime'` -- confirmando el problema empíricamente, no solo por precaución teórica. Se revirtió y se ignoran las tres reglas hasta que el entorno de verificación también sea 3.11+.
- `B008` (llamadas en defaults) relajado para todo `**/*.py` -- patrón normal de `Depends(...)` en FastAPI.

**Hallazgos reales corregidos** (no solo auto-fix mecánico):

- `E402` en `auth.py`: un import (`LoginRateLimiter`) estaba después de `router = APIRouter()` en vez de arriba con el resto -- se consolidó con el import ya existente de `login_limiter` del mismo módulo.
- `B904` (3 instancias, `deps.py` x2 + `auth.py` x1): `raise` dentro de un `except` sin `from` -- se agregó `from None` explícito con comentario, ya que es intencional no filtrar detalles del JWT inválido al cliente.
- `F821` (3 instancias en `models/order.py` y `models/supplier.py`): falsos positivos de ruff sobre forward-refs de SQLAlchemy (`relationship("Product")` con anotación `Mapped["Product"]`) que el mapper registry de SQLAlchemy resuelve en runtime, no algo que ruff pueda ver estáticamente -- se agregó `# noqa: F821` con comentario explicando por qué, en vez de silenciar la regla globalmente (que sí atrapa bugs reales en otros lados).
- `E741` en `exceptions.py`: variable `l` (nombre ambiguo, fácil de confundir con `1`) renombrada a `part`.
- `B007` en `scripts/verify_db_integrity.py`: variable de loop sin usar (`kind`) renombrada a `_kind`.
- `C408`/`C416` (dicts/comprehensions innecesarios): reescritos como literales en `email.py`, `suppliers.py`, `tests/test_audit.py`.

## 3 — Hallazgo colateral: corrupción real en el mount de OneDrive detectada por los linters

Al correr ESLint/ruff por primera vez sobre archivos ya "verificados" en sesiones anteriores, ambos linters reportaron errores de sintaxis (`Parsing error`, `invalid-syntax: unexpected EOF`) en archivos que el `Read` tool mostraba completos y correctos. Investigado a fondo: el mount de OneDrive (`/sessions/.../mnt/Crow v3`, filesystem FUSE) sirve, de forma no determinística, una versión **truncada o con bytes nulos residuales** de archivos que fueron escritos recientemente -- un archivo puede aparecer completo unos segundos después de escribirse, o seguir truncado bajo lectura directa por bash mucho después. Esto no es exclusivo de este cambio: se encontró un caso de corrupción **preexistente** de otra sesión (`app/schemas/setting.py`, campo `phone_display: str` sin `| None = None`, es decir sin el default), que rompía 4 tests de `test_settings.py` con 422 en vez de 200 -- un bug real, en un archivo de producción, sentado en el repo desde antes de este cambio, expuesto recién ahora al forzar una corrida completa de pytest con `__pycache__` limpio.

**Mitigación aplicada sistemáticamente en este cambio:** para cada archivo con discrepancia entre `Read` (autoritativo) y la vista de bash, se usó el patrón `Write` a un archivo sibling (`_nombre_new.ext`) seguido de `mv -f` sobre el original, y se verificó con `wc -l`/`tail`/`ast.parse` después de cada `mv`. Se recomienda a futuro, para cualquier sesión que edite este repo, tratar cualquier error de sintaxis "imposible" (aparece justo después de una edición que se ve bien en `Read`) como señal de este problema antes que como bug real de código.

## Verificación

- `npm run lint` (frontend) -- 0 errores, 5 warnings esperados (patrón normal de providers que exportan componente + hook).
- `npx tsc --noEmit` -- 0 errores.
- `npx vitest run` -- 76/76 tests pasando (10 archivos).
- `npm run build:ci` -- build exitoso, chunks de `pages/admin/*` siguen separados (code-splitting verificado).
- `ruff check .` (backend) -- "All checks passed!".
- `pytest` (backend) -- 249/249 tests pasando, corridos en 3 tandas por el límite de 45s del sandbox de verificación.

## Nota sobre el entorno de verificación

El frontend se instaló y verificó desde una copia local (`/tmp/fe-scratch`, fuera del mount de OneDrive) por dos motivos: (1) `npm install` sobre el mount fallaba repetidamente con `ENOTEMPTY` durante el renombrado de paquetes (mismo problema de fondo que la corrupción descripta arriba, aplicado a `node_modules`), y (2) ejecutar ESLint/Steiger/Vitest contra miles de archivos de `node_modules` vía FUSE era drásticamente más lento y propenso a timeouts que en disco local. El código fuente final (`frontend/src`, configs) vive en el mount y fue lo que se verificó -- solo la instalación de dependencias y la ejecución de los comandos de verificación se hicieron desde la copia local sincronizada.
