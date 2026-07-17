# Tasks: playwright-e2e-ci

- [x] **T1** — Revisar `playwright.config.ts` y `e2e/helpers.ts` para entender cómo esperan que se levante el stack y las credenciales del admin
- [x] **T2** — Crear `.github/workflows/e2e.yml`: checkout, Node 20, `npm ci`, `npx playwright install --with-deps chromium`
- [x] **T3** — Step `docker compose up --build -d` con las env vars necesarias (`SECRET_KEY`, `POSTGRES_PASSWORD`, `SEED_ADMIN_EMAIL/PASSWORD`, `SEED_USER_EMAIL/PASSWORD`)
- [x] **T4** — Step de polling sobre `GET /api/health` antes de correr los tests, con logs + exit 1 si nunca queda healthy
- [x] **T5** — Step `npm run e2e` con `E2E_BASE_URL=http://localhost:8080` y `E2E_ADMIN_PASSWORD` coincidiendo con el seed
- [x] **T6** — Subir `playwright-report/` como artifact si falla (`if: failure()`)
- [x] **T7** — Logs del stack (`docker compose logs`) si falla
- [x] **T8** — `docker compose down -v` siempre al final (`if: always()`)
- [x] **T9** — Validar sintaxis YAML de `e2e.yml` y `docker-compose.yml` (`docker compose config` no disponible -- sin Docker en el entorno; se usó `yaml.safe_load`)
- [x] **T10** — Confirmar que `/api/health` existe en `backend/app/main.py`
- [x] **T11** — Contar los `test(...)` reales en `frontend/e2e/*.spec.ts` — 12, coincide con el hallazgo de la auditoría
