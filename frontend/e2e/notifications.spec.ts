import { test, expect, type Browser } from "@playwright/test";
import { loginAsAdmin, registerNewCustomer, createProductAsAdmin, unique } from "./helpers";

/**
 * El centro de notificaciones, de punta a punta.
 *
 * Cubre lo que ningún test unitario puede: que el aviso nazca de un cambio real
 * en el backend, viaje por Redis, salga por el stream SSE de otro worker,
 * atraviese nginx y le mueva el contador a una persona que no tocó nada.
 *
 * Dos contextos de navegador porque hacen falta dos sesiones a la vez: el admin
 * cambiando el estado y el cliente mirando su campana.
 */

async function contextoNuevo(browser: Browser) {
  const contexto = await browser.newContext();
  return { contexto, page: await contexto.newPage() };
}

/** Deja al cliente registrado con un pedido hecho, parado en su cuenta. */
async function clienteConPedido(browser: Browser, sku: string, nombreProducto: string) {
  const cliente = await contextoNuevo(browser);
  const datos = await registerNewCustomer(cliente.page);
  await cliente.page.goto(`/catalogo?q=${encodeURIComponent(sku)}`);
  await cliente.page.getByRole("heading", { name: nombreProducto }).click();
  await cliente.page.getByRole("button", { name: "Agregar al carrito" }).click();
  await cliente.page.goto("/carrito");
  await cliente.page.getByRole("button", { name: "Continuar" }).click();
  await cliente.page.getByRole("button", { name: "Transferencia" }).click();
  await cliente.page.getByRole("button", { name: "Confirmar pedido" }).click();
  await expect(cliente.page.getByText("Pedido recibido")).toBeVisible();
  return { ...cliente, datos };
}

test.describe("Centro de notificaciones", () => {
  test("al cliente le sube el contador sin recargar y ve el aviso en el panel", async ({ browser }) => {
    const sku = `NOTI-${unique()}`;
    const producto = { name: `Producto noti ${unique()}`, sku, price: 6100, stock: 5 };

    const admin = await contextoNuevo(browser);
    await loginAsAdmin(admin.page);
    await createProductAsAdmin(admin.page, producto);

    const cliente = await clienteConPedido(browser, sku, producto.name);

    // El cliente se queda en su cuenta, sin recargar nada de acá en adelante.
    await cliente.page.goto("/cuenta/pedidos");
    await expect(cliente.page.getByRole("button", { name: "Notificaciones", exact: true })).toBeVisible();

    // El admin confirma el pedido desde el otro navegador.
    await admin.page.goto("/admin/pedidos");
    await admin.page.getByLabel("Buscar pedidos").fill(cliente.datos.email);
    const fila = admin.page.locator("tr", { hasText: cliente.datos.email });
    await fila.getByRole("button", { name: "Gestionar" }).click();
    await admin.page.getByLabel("Entrega", { exact: true }).selectOption("Confirmado");
    await admin.page.getByRole("button", { name: "Guardar cambios" }).click();
    await expect(fila.getByText("Confirmado")).toBeVisible();

    // Y al cliente le aparece el contador solo. El nombre accesible dice
    // cuántas hay, así que esta aserción verifica el número y no solo que algo
    // cambió.
    await expect(cliente.page.getByRole("button", { name: "Notificaciones (1 sin leer)" })).toBeVisible();

    // El aviso está en el panel, con el texto escrito para el cliente.
    await cliente.page.getByRole("button", { name: "Notificaciones (1 sin leer)" }).click();
    await expect(cliente.page.getByText("Tu pedido está confirmado")).toBeVisible();

    await admin.contexto.close();
    await cliente.contexto.close();
  });

  test("marcar todas baja el contador a cero", async ({ browser }) => {
    const sku = `NOTI2-${unique()}`;
    const producto = { name: `Producto noti2 ${unique()}`, sku, price: 2400, stock: 5 };

    const admin = await contextoNuevo(browser);
    await loginAsAdmin(admin.page);
    await createProductAsAdmin(admin.page, producto);

    const cliente = await clienteConPedido(browser, sku, producto.name);

    // Dos cambios para que haya más de una notificación.
    await admin.page.goto("/admin/pedidos");
    await admin.page.getByLabel("Buscar pedidos").fill(cliente.datos.email);
    const fila = admin.page.locator("tr", { hasText: cliente.datos.email });
    await fila.getByRole("button", { name: "Gestionar" }).click();
    await admin.page.getByLabel("Entrega", { exact: true }).selectOption("Confirmado");
    await admin.page.getByLabel("Cobro", { exact: true }).selectOption("Pagado");
    await admin.page.getByRole("button", { name: "Guardar cambios" }).click();

    await cliente.page.goto("/cuenta/pedidos");
    // Un eje por notificación: son dos hechos distintos.
    await expect(cliente.page.getByRole("button", { name: "Notificaciones (2 sin leer)" })).toBeVisible();

    await cliente.page.getByRole("button", { name: "Notificaciones (2 sin leer)" }).click();
    await cliente.page.getByRole("button", { name: "Marcar todas" }).click();

    // Vuelve al nombre accesible sin número: no queda nada sin leer.
    await expect(cliente.page.getByRole("button", { name: "Notificaciones", exact: true })).toBeVisible();

    await admin.contexto.close();
    await cliente.contexto.close();
  });

  test("un invitado no ve la campana", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("button", { name: "Notificaciones", exact: true })).toHaveCount(0);
  });
});
