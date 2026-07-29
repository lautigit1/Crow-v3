import { test, expect, type Browser } from "@playwright/test";
import {
  loginAsAdmin,
  registerNewCustomer,
  createProductAsAdmin,
  unique,
} from "./helpers";

/**
 * El canal en vivo, de punta a punta y contra nginx.
 *
 * Es el único test que ejerce la cadena completa: el pedido entra por un
 * worker de uvicorn, el evento viaja por Redis, sale por el stream SSE de otro
 * worker, atraviesa nginx y llega al navegador.
 *
 * Que pase por nginx es el punto. Todo esto puede andar perfecto en desarrollo
 * -- donde Vite habla directo con la API -- y fallar en producción por una sola
 * línea de configuración: sin `proxy_buffering off`, nginx acumula la respuesta
 * y el evento no llega nunca. Ningún test unitario puede detectar eso.
 *
 * Se usan dos contextos de navegador porque hacen falta dos sesiones a la vez:
 * el admin mirando el panel y el cliente comprando. Con uno solo habría que
 * desloguear en el medio, y ahí se pierde justamente lo que se quiere probar.
 */

async function contextoNuevo(browser: Browser) {
  const contexto = await browser.newContext();
  return { contexto, page: await contexto.newPage() };
}

test.describe("Eventos en vivo", () => {
  test("un pedido nuevo avisa en el panel sin recargar", async ({ browser }) => {
    const sku = `LIVE-${unique()}`;
    const producto = { name: `Producto live ${unique()}`, sku, price: 4200, stock: 6 };

    // ── Preparación: el admin crea el producto ───────────────────────────
    const admin = await contextoNuevo(browser);
    await loginAsAdmin(admin.page);
    await createProductAsAdmin(admin.page, producto);

    // El admin se queda en la lista de pedidos, mirando. No la va a recargar
    // en todo el test: si la barra aparece, llegó por el canal.
    await admin.page.goto("/admin/pedidos");
    await expect(admin.page.getByLabel("Buscar pedidos")).toBeVisible();

    // ── El cliente compra, en otro navegador ─────────────────────────────
    const cliente = await contextoNuevo(browser);
    const datos = await registerNewCustomer(cliente.page);
    await cliente.page.goto(`/catalogo?q=${encodeURIComponent(sku)}`);
    await cliente.page.getByRole("heading", { name: producto.name }).click();
    await cliente.page.getByRole("button", { name: "Agregar al carrito" }).click();
    await cliente.page.goto("/carrito");
    await cliente.page.getByRole("button", { name: "Continuar" }).click();
    await cliente.page.getByRole("button", { name: "Transferencia" }).click();
    await cliente.page.getByRole("button", { name: "Confirmar pedido" }).click();
    await expect(cliente.page.getByText("Pedido recibido")).toBeVisible();

    // ── El panel se enteró solo ──────────────────────────────────────────
    await expect(admin.page.getByText(/pedido nuevo|pedidos nuevos/)).toBeVisible();

    // Al apretarla, recién ahí entra el pedido a la lista y el aviso se va.
    await admin.page.getByText(/pedido nuevo|pedidos nuevos/).click();
    await expect(admin.page.getByText(/pedido nuevo|pedidos nuevos/)).toHaveCount(0);
    await admin.page.getByLabel("Buscar pedidos").fill(datos.email);
    await expect(admin.page.locator("tr", { hasText: datos.email })).toBeVisible();

    await admin.contexto.close();
    await cliente.contexto.close();
  });

  test("el cliente ve moverse su pedido cuando el admin lo cambia", async ({ browser }) => {
    const sku = `LIVE2-${unique()}`;
    const producto = { name: `Producto live2 ${unique()}`, sku, price: 3100, stock: 4 };

    // Sin logout de por medio: son dos contextos de navegador distintos, así
    // que las dos sesiones conviven sin pisarse. Eso es justamente lo que
    // permite probar esto.
    const admin = await contextoNuevo(browser);
    await loginAsAdmin(admin.page);
    await createProductAsAdmin(admin.page, producto);

    // El cliente compra y se queda parado en "Mis pedidos".
    const cliente = await contextoNuevo(browser);
    const datos = await registerNewCustomer(cliente.page);
    await cliente.page.goto(`/catalogo?q=${encodeURIComponent(sku)}`);
    await cliente.page.getByRole("heading", { name: producto.name }).click();
    await cliente.page.getByRole("button", { name: "Agregar al carrito" }).click();
    await cliente.page.goto("/carrito");
    await cliente.page.getByRole("button", { name: "Continuar" }).click();
    await cliente.page.getByRole("button", { name: "Transferencia" }).click();
    await cliente.page.getByRole("button", { name: "Confirmar pedido" }).click();

    await cliente.page.goto("/cuenta/pedidos");
    await cliente.page.getByText(/Pedido #\d+/).first().click();
    await expect(cliente.page.getByText("Pago pendiente")).toBeVisible();

    // El admin marca el cobro desde el otro navegador.
    await admin.page.goto("/admin/pedidos");
    await admin.page.getByLabel("Buscar pedidos").fill(datos.email);
    const fila = admin.page.locator("tr", { hasText: datos.email });
    await fila.getByRole("button", { name: "Gestionar" }).click();
    await admin.page.getByLabel("Cobro", { exact: true }).selectOption("Pagado");
    await admin.page.getByRole("button", { name: "Guardar cambios" }).click();

    // Y la pantalla del cliente cambia sola, sin que él toque nada.
    await expect(cliente.page.getByText("Pagado")).toBeVisible();

    await admin.contexto.close();
    await cliente.contexto.close();
  });
});
