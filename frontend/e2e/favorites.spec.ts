import { test, expect } from "@playwright/test";
import { loginAsAdmin, logout, logoutFromAdmin, registerNewCustomer, createProductAsAdmin, unique } from "./helpers";

test.describe("Favoritos", () => {
  test("agregar y quitar un producto de favoritos", async ({ page }) => {
    const sku = `E2E-FAV-${unique()}`;
    const product = { name: `Producto favorito E2E ${unique()}`, sku, price: 700, stock: 3 };

    await loginAsAdmin(page);
    await createProductAsAdmin(page, product);
    await logoutFromAdmin(page);

    const customer = await registerNewCustomer(page);

    await page.goto(`/catalogo?q=${encodeURIComponent(sku)}`);
    await page.getByRole("heading", { name: product.name }).click();

    await expect(page).toHaveURL(/\/producto\/\d+/);
    await page.getByRole("button", { name: "Agregar a favoritos" }).click();
    await expect(page.getByRole("button", { name: "Quitar de favoritos" })).toBeVisible();

    // Aparece en /cuenta/favoritos
    await page.goto("/cuenta/favoritos");
    await expect(page.getByText(product.name)).toBeVisible();

    // Sacarlo desde la propia página de favoritos (ProductCard tiene el mismo botón)
    await page.getByRole("button", { name: "Quitar de favoritos" }).click();
    await expect(page.getByText("No tenés favoritos todavía")).toBeVisible();

    await logout(page, customer.firstName);
  });

  test("favoritos requiere sesión -- invitado es redirigido a /login", async ({ page }) => {
    await page.goto("/cuenta/favoritos");
    await expect(page).toHaveURL(/\/login/);
  });
});
