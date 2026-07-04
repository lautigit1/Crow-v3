import { test, expect } from "@playwright/test";
import { registerNewCustomer, loginAs, logout } from "./helpers";

test.describe("Autenticación", () => {
  test("registro → logout → login vuelve a entrar", async ({ page }) => {
    const customer = await registerNewCustomer(page);
    await expect(page).toHaveURL(/\/cuenta/);

    await logout(page, customer.firstName);
    await expect(page).toHaveURL("/");

    await loginAs(page, customer.email, customer.password);
    await expect(page).toHaveURL(/\/cuenta/);
  });

  test("login con contraseña incorrecta muestra error y no navega", async ({ page }) => {
    const customer = await registerNewCustomer(page);
    await logout(page, customer.firstName);

    await loginAs(page, customer.email, "ContraseñaIncorrecta123!");

    // Match relajado a propósito -- no depende de tildes exactas (evita
    // falsos negativos por normalización de encoding en distintos entornos).
    await expect(page.getByText(/incorrect/i)).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test("invitado que visita /cuenta es redirigido a /login", async ({ page }) => {
    await page.goto("/cuenta");
    await expect(page).toHaveURL(/\/login/);
  });

  test("invitado que visita /admin es redirigido a /login", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/login/);
  });

  test("usuario logueado que visita /login es redirigido a /cuenta (GuestOnly)", async ({ page }) => {
    const customer = await registerNewCustomer(page);
    await page.goto("/login");
    await expect(page).toHaveURL(/\/cuenta/);
    await logout(page, customer.firstName);
  });
});
