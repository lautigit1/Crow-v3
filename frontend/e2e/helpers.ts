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
export const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "admin@crowrepuestos.com";
export const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "AdminCrow2026!";

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
export const ADMIN_FIRST_NAME = "Administrador"; // seed.py: full_name="Administrador"

export async function loginAsAdmin(page: Page) {
  await page.goto("/login");
  await page.getByPlaceholder("tu@correo.com").fill(ADMIN_EMAIL);
  await page.locator('input[type="password"]').fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
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

export type NewCustomer = { email: string; password: string; fullName: string; firstName: string };

/** Registra un usuario nuevo (no-admin) desde /registro y lo deja logueado en /cuenta. */
export async function registerNewCustomer(page: Page): Promise<NewCustomer> {
  const suffix = unique();
  const customer: NewCustomer = {
    email: `e2e.customer.${suffix}@crowtest.com`,
    password: `E2eTest${suffix}!`,
    fullName: `Cliente E2E ${suffix}`,
    firstName: "Cliente",
  };

  await page.goto("/registro");
  await page.getByPlaceholder("Tu nombre").fill(customer.fullName);
  await page.getByPlaceholder("tu@correo.com").fill(customer.email);
  await page.getByPlaceholder("Mínimo 10 caracteres").fill(customer.password);
  await page.getByRole("button", { name: "Crear cuenta gratis" }).click();
  await expect(page).toHaveURL(/\/cuenta/);

  return customer;
}

export async function loginAs(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByPlaceholder("tu@correo.com").fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
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
