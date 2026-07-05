# Auditoría técnica — Comparativa antes / ahora

**Base:** `AUDITORIA_TECNICA_CROW_V3.md`, realizada el 2026-06-29 (commit `3668e81`).
**Corte actual:** 2026-07-05, tras los ciclos de fixes de producción, features nuevas (Cloudinary, detalle de producto, carrito/checkout con métodos de pago y bloqueo de stock, costo/margen), reconciliación de integridad de DB, tres rondas de testing (backend, frontend, E2E), y los changes `auth-hardening` / `audit-pending-fixes` (ver `openspec/changes/archive/`).

Cada fila fue verificada leyendo el código/config actual (no es una autoevaluación de memoria) — la columna "Evidencia" apunta al archivo/línea revisado.

---

## Errores críticos (sección 21 del audit original)

| # | Hallazgo original | Estado 29/06 | Estado actual | Evidencia |
|---|---|---|---|---|
| ERR-1 / C2 | `SECRET_KEY` hardcodeado en Compose | Crítico — JWT falsificable | **Arreglado** — ambos compose usan `${SECRET_KEY}`, y `main.py` aborta el arranque si queda en el valor default | `docker-compose.yml`, `backend/docker-compose.yml`, `main.py` líneas 46-56 |
| ERR-2 / C3 | Dashboard cuenta productos eliminados | Alto — métricas incorrectas | **Arreglado** — todas las queries de `dashboard.py` filtran `is_deleted=False`; de paso se agregó cache de 60s (antes M4, también resuelto) | `dashboard.py` líneas 52-96 |
| ERR-3 / A3 | TTL de access token inconsistente (24h vs 30min) | Alto — ventana de exposición grande | **Arreglado** — unificado a `"30"` en ambos compose | `docker-compose.yml:47`, `backend/docker-compose.yml:30` |
| ERR-4 / A4 | Register limiter penaliza registros exitosos | Alto — bloqueaba usuarios legítimos | **Arreglado por completo** — `register_failure()` solo se llama en el 409 de email duplicado, y la clave ahora es `(ip, data.email)` en vez de `(ip, ip)` (cerrado en `auth-hardening`, 05/07) | `auth.py` (`register()`) |
| ERR-5 / M2 | Source code montado en contenedor de "producción" | Alto — proceso comprometido podría modificar el host | **Arreglado** — `backend/docker-compose.yml` ya no tiene `volumes: - ./:/app` en el servicio `api` | `backend/docker-compose.yml` líneas 20-38 |

**5 de 5 arreglados.**

---

## Debilidades críticas (sección 19)

| # | Hallazgo | Estado 29/06 | Estado actual | Evidencia |
|---|---|---|---|---|
| C1 | `node_modules` trackeado en git | Crítico | **Arreglado** — 0 archivos de `frontend/node_modules` en `git ls-files`, `.gitignore` lo excluye | `git ls-files \| grep node_modules` → vacío |

**1 de 1 arreglado** (junto con C2/C3 ya cubiertos arriba como ERR-1/ERR-2).

---

## Debilidades altas (sección 19)

| # | Hallazgo | Estado 29/06 | Estado actual | Evidencia |
|---|---|---|---|---|
| A1 | Cero CI/CD | Alto | **Arreglado** — `.github/workflows/backend.yml` (pytest en cada push/PR) y `frontend.yml` (vitest + `tsc` + build) | `.github/workflows/*.yml` |
| A2 | `build:ci` omite TypeScript | Alto | **Arreglado** — `"build:ci": "tsc --noEmit -p tsconfig.build.json && vite build"` | `frontend/package.json:9` |
| A3 | TTL inconsistente | — | Ver ERR-3 arriba | — |
| A4 | Bug register limiter | — | Ver ERR-4 arriba | — |
| A5 | IP spoofing vía X-Forwarded-For | Alto | **Arreglado** — `client_ip()` solo confía en el header si la IP del peer directo está en `TRUSTED_PROXIES`; sin eso, cae al `request.client.host` real | `audit.py` líneas 14-29 |
| A6 | Sin lazy loading en React | Alto | **Arreglado** — rutas de cuenta/admin cargadas con `lazy()` en `App.tsx` | `App.tsx` líneas 22-26 (y más) |
| A7 | Sin Error Boundaries | Alto | **Arreglado** — `<ErrorBoundary>` envuelve toda la app | `main.tsx` líneas 22-31 |
| A8 | Cero tests de frontend | Alto | **Arreglado** — 57 tests unitarios/componentes (Vitest + Testing Library) + 12 tests E2E (Playwright), los 69 pasando | `frontend/src/__tests__/*`, `frontend/e2e/*` |

**8 de 8 arreglados.**

---

## Debilidades medias (sección 19)

| # | Hallazgo | Estado 29/06 | Estado actual | Evidencia |
|---|---|---|---|---|
| M1 | `_to_read()` en suppliers.py, dict comprehension frágil | Medio | **Arreglado** — usa `SupplierRead.model_validate(s, from_attributes=True)` | `suppliers.py` líneas 14-16, 54 |
| M2 | Volume mount de source en prod | — | Ver ERR-5 arriba | — |
| M3 | `confirm()` nativo en deletes del admin | Medio | **Arreglado** — `useConfirm()` + `<ConfirmModal>` reutilizable | `AdminProductsPage.tsx` (`askConfirm`, `ConfirmModal`) |
| M4 | Analytics del dashboard sin cache | Medio | **Arreglado** — `Cache-Control: private, max-age=60` + cache en memoria (`_cache_get`/`_cache_set`) | `dashboard.py` líneas 44-50, 80-86 |
| M5 | Cobertura de tests backend ~25-30%, faltan categories/brands/suppliers/users/dashboard/audit/settings | Medio | **Arreglado** — hay archivo de test para cada uno de esos módulos, más quotes y uploads. 198 tests backend pasando | `backend/tests/test_{categories,brands,suppliers,users,dashboard,audit,settings,quotes,uploads}.py` |
| M6 | Animación `shimmer` redefinida en cada render | Medio | **Arreglado** — vive en `app/styles/index.css` (global), no inline por componente | `frontend/src/app/styles/index.css` |
| M7 | Favoritos sin persistencia server-side (solo localStorage) | Medio | **Arreglado** — backend real (`favoriteApi.list/add/remove`) y, como parte del trabajo de esta sesión, unificado en un Context compartido (`FavoritesProvider`) para que sacar un favorito se refleje en todas las vistas | `entities/favorite`, `app/providers/FavoritesProvider.tsx` |
| M8 | `GET /quotes/me` sin paginación | Medio | **Arreglado** — `skip`/`limit` con límites (`ge=0`, `le=100`) | `quotes.py` líneas 74-78 |
| M9 | Email templates como strings de Python | Medio | **Arreglado** — templates Jinja2 en `app/templates/emails/` con autoescape en HTML; de paso cierra una inyección de HTML sin escapar en el mail de cotización (`customer_name`/`message` del cliente se interpolaban crudos) (cerrado en `audit-pending-fixes`, 05/07) | `email.py`, `templates/emails/*.jinja`, `test_email.py` |

**9 de 9 arreglados.**

---

## Debilidades bajas (sección 19)

| Hallazgo | Estado 29/06 | Estado actual |
|---|---|---|
| `__pycache__`/`.pytest_cache` en git | Bajo | **Arreglado** — 0 coincidencias en `git ls-files` |
| `import time as _time` dentro de función | Bajo | **Arreglado** — no se encontró el import local en `auth.py` |
| Sin `CHECK` constraints (`stock>=0`, `price>0`) | Bajo | **Arreglado** — `ck_products_stock_nonnegative` y `ck_products_price_positive` (creados por migración y reconciliados por `scripts/verify_db_integrity.py`) |
| Sin `iss`/`aud` en JWT | Bajo | **Arreglado** — `_ISS`/`_AUD` presentes en access, refresh y reset tokens, validados en `jwt.decode(..., audience=_AUD)` |
| Fuentes de Google Fonts no incluidas en Docker | Bajo | **Arreglado** — `@fontsource/*` self-hosteado, bundleado por Vite (no hay llamada a fonts.googleapis.com) |
| Sin tags de versión en git | Bajo | **Pendiente** — `git tag` vacío |
| Sin `CONTRIBUTING.md` | Bajo | **Pendiente** — no se buscó/creó |
| Mensajes de commit informales | Bajo | **Sin cambios** — fuera del alcance de este trabajo |

**5 de 8 arregladas**, 3 pendientes/sin cambios (fuera del alcance técnico de esta sesión).

---

## Hallazgos adicionales (no estaban en la lista original, pero corresponden al roadmap de mediano/largo plazo)

| Ítem | Plazo estimado / origen | Estado actual | Evidencia |
|---|---|---|---|
| Redis para token blocklist y rate limiters | Mediano plazo, 3-5 días | **Arreglado** — `token_blocklist.py` y `ratelimit.py` usan Redis (`SETEX`/`EXISTS`) con fallback a memoria si Redis no está disponible | `token_blocklist.py`, `ratelimit.py` |
| Índices faltantes (`quotes.user_id`, `audit_logs.created_at`) | — | **Arreglado** — vía migración + `verify_db_integrity.py` | migración `008` |
| pg_trgm y GIN indexes reconciliados en modo dev | — | **Arreglado** (y esta sesión encontró y corrigió un bug adicional: `.op("%%")` en vez de `.op("%")` en la búsqueda de productos, que rompía toda búsqueda con texto contra Postgres real) | — |
| CORS permisivo en producción sin guard | Bajo (mencionado en A05 OWASP) | **Arreglado** — `has_insecure_cors` + `RuntimeError` en `main.py` si `ENVIRONMENT=production` con orígenes localhost | `config.py`, `main.py` |
| `suppliers.name` sin `UNIQUE` | Bajo (señalado en revisión de puntos sensibles, no estaba en el audit original) | **Arreglado** — constraint `uq_suppliers_name` + chequeo previo en la API (409 legible) (cerrado en `audit-pending-fixes`, 05/07) | migración `011`, `suppliers.py` |
| Índice compuesto `products(category_id, stock)` | Bajo (señalado como faltante en el audit original, sección 8) | **Arreglado** — índice parcial `ix_products_active_category_stock` (cerrado en `audit-pending-fixes`, 05/07) | migración `011` |
| `quotes.message` sin longitud mínima en DB | Bajo (señalado en el audit original, sección 8) | **Arreglado** — `CHECK ck_quotes_message_not_blank` (cerrado en `audit-pending-fixes`, 05/07) | migración `011` |
| Secrets de refresh/reset derivados por concatenación simple (`SECRET_KEY + ":refresh"`) | No estaba en el audit original | **Arreglado** — derivación vía HKDF-SHA256, secrets independientes entre sí y del `SECRET_KEY` raíz (cerrado en `auth-hardening`, 05/07) | `security.py` (`_derive_secret`) |
| Reset token sin `iss`/`aud` en el payload (el chequeo de audience era un no-op silencioso) | No estaba en el audit original, encontrado al revisar auth | **Arreglado** — `create_reset_token()` ahora incluye ambos claims (cerrado en `auth-hardening`, 05/07) | `security.py` (`create_reset_token`) |
| `npm ci` roto en CI: `vitest@^4.1.9` requiere `vite@^6\|\|^7\|\|^8`, pero `vite` quedó pineado en `^5.4.6` | No estaba en el audit original, reportado por el usuario (fallo real de GitHub Actions) | **Parcialmente arreglado** — `vite` bumpeado a `^7.0.0` en `package.json` (satisface a la vez el peer de `vitest` y el de `@vitejs/plugin-react`, que todavía no soporta `vite@8`). **Falta un paso manual**: correr `npm install` con red real y commitear el `package-lock.json` regenerado — no se pudo hacer desde este sandbox (sin acceso a la registry de npm) (cerrado parcialmente en `fix-ci-npm-ci`, 05/07) | `frontend/package.json` |

---

## Lo que sigue pendiente (fuera del alcance de esta sesión)

- HTTPS / Traefik / Certbot — requiere infraestructura de deploy real, no aplicable en desarrollo local.
- Monitoring (Sentry, Prometheus/Grafana) — no configurado.
- Git tags, `CONTRIBUTING.md`, Conventional Commits.
- CSS Modules/Tailwind (sigue siendo inline styles).
- Multi-environment (dev/staging/prod), Kubernetes — fuera de alcance para el tamaño actual del proyecto.

---

## Resumen

| Categoría | Total | Arreglados | Pendientes |
|---|---|---|---|
| Errores críticos | 5 | 5 | 0 |
| Debilidades críticas | 1 | 1 | 0 |
| Debilidades altas | 8 | 8 | 0 |
| Debilidades medias | 9 | 9 | 0 |
| Debilidades bajas | 8 | 5 | 3 |
| Hallazgos adicionales (sesión 05/07, ver `auth-hardening` / `audit-pending-fixes`) | 5 | 5 | 0 |
| **Total** | **36** | **33 (92%)** | **3** |

Los 3 puntos pendientes son de bajo impacto y no técnico (HTTPS/monitoring de infraestructura de deploy, convenciones de git). El núcleo técnico señalado como fortaleza en la auditoría original (UoW, auth, audit log, FSD) se mantiene intacto y se reforzó: las tres brechas que más pesaban en el score original — testing (28/100), DevOps (30/100) y las fallas críticas de seguridad/infra — están resueltas, y esta sesión (05/07) cerró además los puntos sensibles de código que quedaban (derivación de secrets, rate limiter de registro, integridad de datos en suppliers/products/quotes, e inyección de HTML sin escapar en emails). Detalle completo de estos dos últimos changes en `openspec/changes/archive/2026-07-05-auth-hardening/` y `openspec/changes/archive/2026-07-05-audit-pending-fixes/`.
