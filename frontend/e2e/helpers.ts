import type { Page, Locator } from "@playwright/test";
import { expect } from "@playwright/test";

/**
 * Credenciales del admin seedeado (`backend/app/seed.py`, vía
 * SEED_ADMIN_EMAIL/SEED_ADMIN_PASSWORD). El default acá abajo apunta al
 * `.env` de la raíz (stack completo de docker-compose) -- si corrés el
 * backend con otro `.env` (ej. `backend/.env` en modo dev con Vite,
 * donde la password suele ser distinta), sobreescribí con las variables
 * de entorno E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD al correr los tests:
 *
 *   E2E_ADMIN_PASSWORD=admin1234 npm run e2e
 */
// Orden de precedencia, de más específico a más general:
//
//   1. E2E_ADMIN_*     — para forzar algo puntual en una corrida
//   2. SEED_ADMIN_*    — LA MISMA variable que usa el seed para crear al admin
//   3. el default      — lo que trae `.env.example`
//
// El punto 2 es el que importa: `playwright.config.ts` carga el `.env` de la
// raíz, así que si cambiás `SEED_ADMIN_EMAIL` los tests siguen entrando sin que
// haya que acordarse de tocar este archivo. Antes estaba escrito a mano acá y
// el día que cambió el mail del admin los 23 tests fallaron con "expected
// /admin, got /login", que no insinúa en ningún momento que el problema sea una
// credencial desincronizada.
export const ADMIN_EMAIL =
  process.env.E2E_ADMIN_EMAIL ?? process.env.SEED_ADMIN_EMAIL ?? "admin@crowrepuestos.com";
export const ADMIN_PASSWORD =
  process.env.E2E_ADMIN_PASSWORD ?? process.env.SEED_ADMIN_PASSWORD ?? "AdminCrow2026!";

/** Sufijo único para no chocar con datos de corridas anteriores contra la misma DB. */
export function unique(): string {
  return `${Date.now()}${Math.floor(Math.random() * 1000)}`;
}

/**
 * Muchos formularios del proyecto (Field / CompactField en shared/ui y
 * AdminProductsPage) renderizan el label como un <span> hermano del
 * input/select/textarea, SIN asociarlo por htmlFor/id ni envolverlo en
 * <label> -- por eso `getByLabel()` de Playwright no los encuentra.
 * Este helper ubica el control por el texto del label vecino en vez de
 * depender de esa asociación semántica que el componente no provee.
 */
export function fieldControl(scope: Page | Locator, label: string): Locator {
  return scope
    .locator(`xpath=//span[normalize-space(text())="${label}"]/following-sibling::*[1]`)
    .locator("xpath=self::input | self::select | self::textarea | .//input | .//select | .//textarea")
    .first();
}

/** Primer nombre tal cual queda en el trigger de AccountMenu (`full_name.split(" ")[0]`). */
// El seed crea al admin con `full_name="Administrador"` sea cual sea el mail, así
// que el default sirve igual si cambiás `SEED_ADMIN_EMAIL`. La variable existe
// para el caso de un admin creado a mano con otro nombre.
export const ADMIN_FIRST_NAME = process.env.E2E_ADMIN_FIRST_NAME ?? "Administrador";

/**
 * Locators de los campos de /login y /registro.
 *
 * El rediseño de auth (AuthPanel + AuthFormKit, commit "reestructuracion
 * visual de landing y login") reemplazó los inputs con placeholder por
 * campos con floating label: el `placeholder` ahora es literalmente `" "`
 * (un espacio) porque el label flota vía `peer-[:not(:placeholder-shown)]`
 * en Tailwind. Por eso `getByPlaceholder("tu@correo.com")` dejó de
 * encontrar nada y todos los tests que loguean/registran se colgaban
 * hasta el timeout de 60s.
 *
 * La contrapartida buena es que ahora SÍ hay asociación semántica
 * (`<label htmlFor>` ↔ `id="auth-<key>"`), así que `getByLabel` es el
 * locator correcto y estable. `exact: true` evita que "Contraseña" matchee
 * también el botón del ojito (aria-label "Mostrar/Ocultar contraseña").
 */
const emailField = (page: Page) => page.getByLabel("Email", { exact: true });
const passwordField = (page: Page) => page.getByLabel("Contraseña", { exact: true });
const fullNameField = (page: Page) => page.getByLabel("Nombre completo", { exact: true });

/**
 * Botón de submit del formulario de auth (StampButton).
 *
 * No se busca por texto a propósito: el selector de modo son dos <button>
 * con las mismas palabras que el submit ("Ingresar" / "Crear cuenta"), así
 * que `getByRole("button", { name: "Crear cuenta" })` viola strict mode en
 * /registro. El `type="submit"` dentro del <form> es único.
 */
const authSubmit = (page: Page) => page.locator('form button[type="submit"]');

export async function loginAsAdmin(page: Page) {
  await page.goto("/login");
  await emailField(page).fill(ADMIN_EMAIL);
  await passwordField(page).fill(ADMIN_PASSWORD);
  await authSubmit(page).click();
  await expect(page).toHaveURL(/\/admin/);
}

/**
 * Desloguea vía el AccountMenu del Navbar. `firstName` es la primera
 * palabra de `full_name` (así queda el trigger del dropdown) -- pasale
 * `ADMIN_FIRST_NAME` o `customer.firstName`.
 */
export async function logout(page: Page, firstName: string) {
  await page.getByRole("button", { name: firstName }).click();
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await expect(page).toHaveURL("/");
}

/**
 * Desloguea desde una ruta /admin/*. AdminLayout (sidebar) es un layout
 * completamente distinto del Navbar público -- no incluye el AccountMenu
 * con el nombre como accessible name, sino un botón solo-ícono con
 * title="Cerrar sesión" y sin texto. Por eso `logout()` (que busca un
 * botón con el primer nombre) nunca lo encuentra estando en /admin/*.
 */
export async function logoutFromAdmin(page: Page) {
  await page.getByTitle("Cerrar sesión").click();
  await expect(page).toHaveURL("/");
}

export type NewCustomer = { email: string; password: string; fullName: string; firstName: string; phone: string };

/** Registra un usuario nuevo (no-admin) desde /registro y lo deja logueado en /cuenta. */
export async function registerNewCustomer(page: Page): Promise<NewCustomer> {
  const suffix = unique();
  const customer: NewCustomer = {
    email: `e2e.customer.${suffix}@crowtest.com`,
    password: `E2eTest${suffix}!`,
    fullName: `Cliente E2E ${suffix}`,
    firstName: "Cliente",
    // Número con formato realista (espacios y guion): valida el camino
    // permisivo del backend, no solo una tira de dígitos.
    phone: "261 660-0569",
  };

  await page.goto("/registro");
  await fullNameField(page).fill(customer.fullName);
  await emailField(page).fill(customer.email);
  // El teléfono pasó a ser obligatorio en el registro. Sin esta línea fallan
  // los ~10 specs que registran a alguien, y el error que se ve es un 422 del
  // backend, que no dice qué campo falta.
  await page.getByLabel("Teléfono").fill(customer.phone);
  await passwordField(page).fill(customer.password);
  await authSubmit(page).click();
  await expect(page).toHaveURL(/\/cuenta/);

  return customer;
}

export async function loginAs(page: Page, email: string, password: string) {
  await page.goto("/login");
  await emailField(page).fill(email);
  await passwordField(page).fill(password);
  await authSubmit(page).click();
}

export type ProductSeed = { name: string; sku: string; price: number; stock: number };

/**
 * Crea un producto desde `/admin/productos` (asume que ya estás logueado
 * como admin) y confirma que aparece en la tabla buscándolo por SKU.
 */
export async function createProductAsAdmin(page: Page, product: ProductSeed) {
  await page.goto("/admin/productos");
  await page.getByRole("button", { name: "Nuevo producto" }).click();

  await page.getByPlaceholder("Kit de frenos delanteros Gol G5").fill(product.name);
  await page.getByPlaceholder("KIT-001").fill(product.sku);

  const priceField = fieldControl(page, "Precio de venta (ARS)");
  const stockField = fieldControl(page, "Stock");
  await priceField.fill(String(product.price));
  await stockField.fill(String(product.stock));

  await Promise.all([
    page.waitForResponse((r) => r.url().includes("/api/products") && r.request().method() === "POST"),
    page.getByRole("button", { name: "Guardar producto" }).click(),
  ]);

  await page.getByPlaceholder("Buscar por nombre, SKU o descripción").fill(product.sku);
  await expect(page.locator("tr", { hasText: product.sku })).toBeVisible();
}
