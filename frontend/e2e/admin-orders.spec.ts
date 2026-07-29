import { test, expect } from "@playwright/test";
import {
  loginAsAdmin,
  logout,
  logoutFromAdmin,
  registerNewCustomer,
  createProductAsAdmin,
  unique,
} from "./helpers";

/**
 * El circuito que este change vino a cerrar: un pedido entra y alguien del
 * otro lado lo ve y lo gestiona.
 *
 * Antes de esta feature el pedido caía en la base y no había pantalla que lo
 * mostrara. Lo que se verifica acá es justamente el cableado entre las dos
 * puntas -- cliente compra → aparece en el panel → el admin mueve los dos
 * estados → el cliente ve el resultado -- que es lo único que los tests de
 * backend no pueden cubrir por separado.
 */

test.describe("Admin — gestión de pedidos", () => {
  test("un pedido del cliente aparece en el panel y se le mueven los dos estados", async ({ page }) => {
    const sku = `PED-${unique()}`;
    const product = { name: `Producto pedido ${unique()}`, sku, price: 5000, stock: 10 };

    await loginAsAdmin(page);
    await createProductAsAdmin(page, product);
    await logoutFromAdmin(page);

    // ── El cliente compra ────────────────────────────────────────────────
    const customer = await registerNewCustomer(page);

    await page.goto(`/catalogo?q=${encodeURIComponent(sku)}`);
    await page.getByRole("heading", { name: product.name }).click();
    await page.getByRole("button", { name: "Agregar al carrito" }).click();
    await page.goto("/carrito");
    await page.getByRole("button", { name: "Continuar" }).click();
    await page.getByRole("button", { name: "Transferencia" }).click();
    await page.getByRole("button", { name: "Confirmar pedido" }).click();

    // "Recibido", no "confirmado": todavía no lo miró nadie.
    await expect(page.getByText("Pedido recibido")).toBeVisible();
    await logout(page, customer.firstName);

    // ── El admin lo encuentra ────────────────────────────────────────────
    await loginAsAdmin(page);
    await page.goto("/admin/pedidos");

    // Por mail, que es único por corrida; el nombre puede repetirse entre
    // clientes de distintas corridas.
    await page.getByLabel("Buscar pedidos").fill(customer.email);
    const fila = page.locator("tr", { hasText: customer.email });
    await expect(fila).toBeVisible();
    // Los dos ejes arrancan en su valor inicial y se ven a la vez.
    await expect(fila.getByText("Pendiente")).toBeVisible();
    await expect(fila.getByText("Sin cobrar")).toBeVisible();

    // ── Y lo gestiona ────────────────────────────────────────────────────
    await fila.getByRole("button", { name: "Gestionar" }).click();
    await expect(page.getByText(product.name)).toBeVisible();

    // `exact: true` obligatorio: getByLabel de Playwright matchea por
    // substring, así que "Entrega" a secas también agarra el select de filtro
    // "Filtrar por entrega" y strict mode rechaza el locator por ambigüedad.
    await page.getByLabel("Entrega", { exact: true }).selectOption("Confirmado");
    await page.getByLabel("Cobro", { exact: true }).selectOption("Pagado");
    await page.getByRole("button", { name: "Guardar cambios" }).click();

    // La fila se actualiza sin recargar: el PATCH devuelve la forma de admin
    // completa y la lista reemplaza el registro.
    await expect(fila.getByText("Confirmado")).toBeVisible();
    await expect(fila.getByText("Pagado")).toBeVisible();
  });

  test("el filtro de cobro encuentra los pedidos entregados que nadie cobró", async ({ page }) => {
    /**
     * Es la consulta que justifica tener el cobro como eje separado: con un
     * solo enum, "entregado pero sin cobrar" no se puede ni representar ni
     * buscar.
     */
    const sku = `DEUDA-${unique()}`;
    const product = { name: `Producto deuda ${unique()}`, sku, price: 7000, stock: 5 };

    await loginAsAdmin(page);
    await createProductAsAdmin(page, product);
    await logoutFromAdmin(page);

    const customer = await registerNewCustomer(page);
    await page.goto(`/catalogo?q=${encodeURIComponent(sku)}`);
    await page.getByRole("heading", { name: product.name }).click();
    await page.getByRole("button", { name: "Agregar al carrito" }).click();
    await page.goto("/carrito");
    await page.getByRole("button", { name: "Continuar" }).click();
    await page.getByRole("button", { name: "Transferencia" }).click();
    await page.getByRole("button", { name: "Confirmar pedido" }).click();
    await logout(page, customer.firstName);

    await loginAsAdmin(page);
    await page.goto("/admin/pedidos");
    await page.getByLabel("Buscar pedidos").fill(customer.email);
    const fila = page.locator("tr", { hasText: customer.email });
    await fila.getByRole("button", { name: "Gestionar" }).click();

    // Entregado, pero el cobro queda como está.
    // `exact: true` obligatorio: getByLabel de Playwright matchea por
    // substring, así que "Entrega" a secas también agarra el select de filtro
    // "Filtrar por entrega" y strict mode rechaza el locator por ambigüedad.
    await page.getByLabel("Entrega", { exact: true }).selectOption("Entregado");
    await page.getByRole("button", { name: "Guardar cambios" }).click();
    await expect(fila.getByText("Entregado")).toBeVisible();
    // Por el botón y no con Escape: el Drawer no maneja teclado (a diferencia
    // del Modal, que sí cierra con Escape). Sin cerrarlo, el overlay tapa los
    // filtros y los clicks siguientes no llegan.
    //
    // `exact: true` porque el nombre accesible también se matchea por
    // substring: "Cerrar" agarra además el "Cerrar sesión" del sidebar.
    await page.getByRole("button", { name: "Cerrar", exact: true }).click();

    // Los dos filtros combinados dejan el pedido a la vista.
    await page.getByLabel("Filtrar por entrega").selectOption("Entregado");
    await page.getByLabel("Filtrar por cobro").selectOption("Sin cobrar");
    await expect(page.locator("tr", { hasText: customer.email })).toBeVisible();

    // Y con el cobro en Pagado desaparece del filtro, que es la señal de que
    // el filtro filtra de verdad y no está mostrando todo.
    await page.getByLabel("Filtrar por cobro").selectOption("Pagado");
    await expect(page.locator("tr", { hasText: customer.email })).toHaveCount(0);
  });

  test("el cliente ve el estado de su cobro", async ({ page }) => {
    const sku = `COBRO-${unique()}`;
    const product = { name: `Producto cobro ${unique()}`, sku, price: 3000, stock: 5 };

    await loginAsAdmin(page);
    await createProductAsAdmin(page, product);
    await logoutFromAdmin(page);

    // El cliente se queda logueado: la verificación es sobre su propia
    // pantalla, así que no hace falta retener sus datos.
    await registerNewCustomer(page);
    await page.goto(`/catalogo?q=${encodeURIComponent(sku)}`);
    await page.getByRole("heading", { name: product.name }).click();
    await page.getByRole("button", { name: "Agregar al carrito" }).click();
    await page.goto("/carrito");
    await page.getByRole("button", { name: "Continuar" }).click();
    await page.getByRole("button", { name: "Transferencia" }).click();
    await page.getByRole("button", { name: "Confirmar pedido" }).click();

    // Recién hecho: el cobro está pendiente, y así se lo dice al cliente con
    // sus palabras ("Pago pendiente"), no con las del negocio ("Sin cobrar").
    await page.goto("/cuenta/pedidos");
    await page.getByText(/Pedido #\d+/).first().click();
    await expect(page.getByText("Pago pendiente")).toBeVisible();
  });
});
