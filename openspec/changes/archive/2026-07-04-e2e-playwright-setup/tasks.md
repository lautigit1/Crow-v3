# Tasks: e2e-playwright-setup

- [x] T1 — `frontend/playwright.config.ts`
- [x] T2 — `frontend/e2e/helpers.ts`
- [x] T3 — `frontend/e2e/auth.spec.ts`
- [x] T4 — `frontend/e2e/shopping-flow.spec.ts`
- [x] T5 — `frontend/e2e/admin-products.spec.ts`
- [x] T6 — `frontend/e2e/favorites.spec.ts`
- [x] T7 — scripts `e2e`/`e2e:ui`/`e2e:report` en `package.json`,
      `.gitignore` para artifacts de Playwright
- [x] T8 — Usuario instala Playwright (`npm install -D @playwright/test`,
      `npx playwright install chromium`), levanta backend + frontend, y
      corre `npm run e2e`. Comparte resultado.
- [x] T9 — Corregir selectores/fallas según lo que reporte, archivar el
      change.

> Nota: no se pudo instalar ni correr Playwright en este entorno (sin
> acceso de red para `npm install`). Los specs se escribieron leyendo el
> código real de cada página (placeholders, textos de botones,
> aria-labels, estructura del DOM de `DataTable`/`Field`/`CompactField`)
> pero es la primera vez que se ejecutan -- es esperable que la primera
> corrida encuentre selectores para ajustar, igual que pasó con los
> lotes de backend y frontend.
>
> Resultado final: 12/12 passed. Ver `apply.md` para el detalle de cada
> ronda de fallas y su fix (selectores, timeouts, y dos bugs reales de
> la app encontrados por la suite).
