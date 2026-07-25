import { test, expect } from "@playwright/test";
import { loginAsAdmin, createProductAsAdmin, fieldControl, unique } from "./helpers";

test.describe("Admin — CRUD de productos", () => {
  test("crear, editar, eliminar (soft) y restaurar un producto", async ({ page }) => {
    const sku = `E2E-ADM-${unique()}`;
    const product = { name: `Producto admin E2E ${unique()}`, sku, price: 1000, stock: 4 };

    await loginAsAdmin(page);
    await createProductAsAdmin(page, product);

    // ── Editar ──────────────────────────────────────────────────────────────
    const row = page.locator("tr", { hasText: sku });
    await row.getByRole("button", { name: "Editar" }).click();

    await fieldControl(page, "Precio de venta (ARS)").fill("2500");
    await page.getByRole("button", { name: "Guardar producto" }).click();

    await expect(page.locator("tr", { hasText: sku })).toContainText("2.500");

    // ── Eliminar (soft delete) ────────────────────────────────────────────
    // El botón de borrar de la fila es solo-ícono, pero tiene
    // aria-label="Eliminar producto" -- más explícito que `.locator("button").last()`,
    // que se rompe si alguna vez se agrega otra acción al final de la fila.
    await row.getByRole("button", { name: "Eliminar producto" }).click();
    await expect(page.getByText(`¿Eliminar "${product.name}"?`)).toBeVisible();
    // `exact: true` es obligatorio: sin eso el nombre "Eliminar" también
    // matchea por substring los "Eliminar producto" de cada fila de la
    // tabla de atrás (el ConfirmModal no bloquea el árbol de accesibilidad,
    // no tiene role="dialog"), y Playwright falla por strict mode. El
    // botón del modal es el único cuyo nombre accesible es exactamente
    // "Eliminar" (ConfirmModal → confirmLabel).
    await page.getByRole("button", { name: "Eliminar", exact: true }).click();

    await expect(page.locator("tr", { hasText: sku })).toHaveCount(0);

    // ── Restaurar ───────────────────────────────────────────────────────────
    await page.getByRole("button", { name: "Eliminados" }).click();
    const deletedRow = page.locator("tr", { hasText: sku });
    await expect(deletedRow).toBeVisible();
    await deletedRow.getByRole("button", { name: "Restaurar" }).click();
    await expect(page.locator("tr", { hasText: sku })).toHaveCount(0);

    // Vuelve a aparecer en Activos
    await page.getByRole("button", { name: "Activos" }).click();
    await page.getByPlaceholder("Buscar por nombre, SKU o descripción").fill(sku);
    await expect(page.locator("tr", { hasText: sku })).toBeVisible();
  });

  test("checkbox Destacado marca el producto como destacado", async ({ page }) => {
    const sku = `E2E-ADM-${unique()}`;
    const product = { name: `Producto destacado E2E ${unique()}`, sku, price: 800, stock: 2 };

    await loginAsAdmin(page);
    await page.goto("/admin/productos");
    await page.getByRole("button", { name: "Nuevo producto" }).click();
    await page.getByPlaceholder("Kit de frenos delanteros Gol G5").fill(product.name);
    await page.getByPlaceholder("KIT-001").fill(product.sku);
    await fieldControl(page, "Precio de venta (ARS)").fill(String(product.price));
    await fieldControl(page, "Stock").fill(String(product.stock));
    await page.getByRole("checkbox", { name: "Destacado" }).check();
    await page.getByRole("button", { name: "Guardar producto" }).click();

    await page.getByPlaceholder("Buscar por nombre, SKU o descripción").fill(sku);
    const row = page.locator("tr", { hasText: sku });
    await expect(row).toBeVisible();

    // Reabre el modal de edición y confirma que el checkbox quedó tildado
    // (más confiable que inferirlo del ícono de estrella en la tabla).
    await row.getByRole("button", { name: "Editar" }).click();
    await expect(page.getByRole("checkbox", { name: "Destacado" })).toBeChecked();
  });
});
