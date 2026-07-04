import { defineConfig, devices } from "@playwright/test";

/**
 * Config de Playwright para Crow Repuestos v3.
 *
 * A propósito NO levanta la app sola (nada de `webServer`): backend y
 * frontend ya se levantan con el flujo habitual del proyecto (docker
 * compose para la API + Postgres, `npm run dev` o el stack completo para
 * el frontend). Corré eso primero y después `npm run e2e`.
 *
 * Base URL configurable con la variable de entorno E2E_BASE_URL:
 *   - http://localhost:5173  → frontend en modo dev (Vite, con proxy /api) [default]
 *   - http://localhost:8080  → stack completo de docker-compose (nginx + build)
 */
const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:5173";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false, // los tests comparten estado de backend real, no una DB efímera
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1, // un solo worker -- evita pisadas de datos entre specs contra la misma DB
  reporter: [["html", { open: "never" }], ["list"]],
  // Algunos specs (shopping-flow) encadenan varios pasos lentos (crear
  // producto como admin, logout, registro, checkout) -- 30s por test se
  // queda corto contra el stack completo de docker.
  timeout: 60_000,
  // Default de Playwright son 5s -- contra el stack completo de docker
  // (nginx + build), guardar un producto y que el reload() se refleje en la
  // tabla puede tardar más que eso. Se sube el default global de `expect`.
  expect: { timeout: 15_000 },
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
});
