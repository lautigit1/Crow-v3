import { readFileSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

/**
 * Carga el `.env` de la raíz del repo dentro de `process.env`.
 *
 * Existe para que **la credencial del admin que usan los tests salga del mismo
 * lugar que siembra la base**. Antes estaba escrita a mano en `helpers.ts`, y
 * el día que se cambió `SEED_ADMIN_EMAIL` los 23 tests empezaron a fallar con
 * "expected /admin, got /login" -- un error que no dice en ningún momento que
 * el problema es una credencial desincronizada.
 *
 * Lo que ya viene en el entorno gana: así se puede sobreescribir con
 * `$env:E2E_ADMIN_EMAIL=...` sin editar archivos, y en CI -- donde no hay
 * `.env` -- manda lo que define el workflow.
 *
 * Se parsea a mano en vez de sumar `dotenv`: son diez líneas y una dependencia
 * menos que mantener por algo que solo usa este archivo.
 */
function cargarEnvDeLaRaiz() {
  try {
    const crudo = readFileSync(new URL("../.env", import.meta.url), "utf8");
    for (const linea of crudo.split("\n")) {
      const limpia = linea.trim();
      if (!limpia || limpia.startsWith("#") || !limpia.includes("=")) continue;
      const [clave, ...resto] = limpia.split("=");
      const nombre = clave.trim();
      if (process.env[nombre] !== undefined) continue;
      // Se quitan las comillas: `SMTP_FROM="Crow Repuestos <...>"` las necesita
      // para que Docker Compose lo parsee, pero el valor no las incluye.
      process.env[nombre] = resto.join("=").trim().replace(/^["']|["']$/g, "");
    }
  } catch {
    // Sin `.env` no pasa nada: los helpers caen a sus defaults. Es el caso de CI.
  }
}

cargarEnvDeLaRaiz();

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
    // El default de Playwright para acciones (click/fill) es 0 = sin límite
    // propio: una acción sobre un locator que no existe se queda colgada
    // hasta consumir el timeout entero del test (60s acá). Cuando el
    // rediseño de auth cambió los selectores, eso hizo que los 9 tests
    // rotos tardaran 1 minuto cada uno y el job de CI se cancelara por
    // timeout antes de terminar, sin dejar claro qué había fallado.
    // Con un límite explícito el error aparece en 15s y dice exactamente
    // qué locator no resolvió.
    actionTimeout: 15_000,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
});
