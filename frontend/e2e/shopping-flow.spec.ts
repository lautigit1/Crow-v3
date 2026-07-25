import { test, expect } from "@playwright/test";
import { loginAsAdmin, logout, logoutFromAdmin, registerNewCustomer, createProductAsAdmin, unique } from "./helpers";

test.describe("Compra completa: catálogo → carrito → checkout", () => {
  test("cliente encuentra un producto, lo agrega al carrito y confirma el pedido", async ({ page }) => {
    const sku = `E2E-${unique()}`;
    const product = { name: `Producto E2E ${unique()}`, sku, price: 12345, stock: 8 };

    // Admin crea el producto que después va a comprar el cliente
    await loginAsAdmin(page);
    await createProductAsAdmin(page, product);
    await logoutFromAdmin(page);

    // Cliente nuevo
    const customer = await registerNewCustomer(page);

    // Busca el producto en el catálogo por SKU
    await page.goto(`/catalogo?q=${encodeURIComponent(sku)}`);
    await expect(page.getByRole("heading", { name: product.name })).toBeVisible();
    await page.getByRole("heading", { name: product.name }).click();

    // Detalle del producto
    await expect(page).toHaveURL(/\/producto\/\d+/);
    await page.getByRole("button", { name: "Agregar al carrito" }).click();
    await expect(page.getByRole("button", { name: "¡Agregado!" })).toBeVisible();

    // Carrito
    await page.goto("/carrito");
    await expect(page.getByText(product.name)).toBeVisible();
    await page.getByRole("button", { name: "Continuar" }).click();

    // Checkout
    await expect(page).toHaveURL(/\/checkout/);
    await page.getByRole("button", { name: "Transferencia" }).click();
    await expect(page.getByText("Te pasamos el CBU/alias para transferir.")).toBeVisible();
    await page.getByRole("button", { name: "Confirmar pedido" }).click();

    // Éxito -- la pantalla de confirmación se rediseñó (CheckoutPage →
    // OrderSuccess): ya no dice "¡Pedido #N creado!" en una sola línea,
    // ahora es un eyebrow "Pedido confirmado" + el número como sello
    // ("N.º 00012", `String(order.id).padStart(5, "0")`).
    await expect(page.getByText("Pedido confirmado")).toBeVisible();
    await expect(page.getByRole("heading", { name: /^N\.º \d{5}$/ })).toBeVisible();
    await expect(page.getByRole("link", { name: "Ver mis pedidos" })).toBeVisible();

    await logout(page, customer.firstName);
  });

  test("checkout sin elegir método de pago no deja confirmar", async ({ page }) => {
    const sku = `E2E-${unique()}`;
    const product = { name: `Producto E2E ${unique()}`, sku, price: 500, stock: 3 };

    await loginAsAdmin(page);
    await createProductAsAdmin(page, product);
    await logoutFromAdmin(page);

    const customer = await registerNewCustomer(page);
    await page.goto(`/catalogo?q=${encodeURIComponent(sku)}`);
    await page.getByRole("heading", { name: product.name }).click();
    await page.getByRole("button", { name: "Agregar al carrito" }).click();

    await page.goto("/checkout");
    // El botón "Confirmar pedido" está deshabilitado hasta elegir método de
    // pago (CheckoutPage.tsx: disabled={submitting || !paymentMethod}) --
    // por diseño ni siquiera se puede clickear, así que el mensaje inline
    // de validación en handleConfirm() nunca se dispara desde acá.
    await expect(page.getByRole("button", { name: "Confirmar pedido" })).toBeDisabled();
    await expect(page).toHaveURL(/\/checkout/);

    await logout(page, customer.firstName);
  });

  test("producto sin stock no se puede agregar al carrito", async ({ page }) => {
    const sku = `E2E-${unique()}`;
    const product = { name: `Producto sin stock E2E ${unique()}`, sku, price: 999, stock: 0 };

    await loginAsAdmin(page);
    await createProductAsAdmin(page, product);
    await logoutFromAdmin(page);

    const customer = await registerNewCustomer(page);
    await page.goto(`/catalogo?q=${encodeURIComponent(sku)}`);
    await page.getByRole("heading", { name: product.name }).click();

    await expect(page.getByText("Sin stock disponible")).toBeVisible();
    await expect(page.getByRole("button", { name: "Agregar al carrito" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Comprar ahora" })).toHaveCount(0);

    await logout(page, customer.firstName);
  });
});
