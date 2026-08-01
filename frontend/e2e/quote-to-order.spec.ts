import { test, expect } from "@playwright/test";
import { loginAs, loginAsAdmin, logoutFromAdmin, registerNewCustomer, logout, unique } from "./helpers";

/**
 * El circuito de cotizaciones, de punta a punta.
 *
 * Hasta este change la cotización entraba, el admin le cambiaba el estado a
 * "Respondida" y ahí terminaba: el precio y el plazo vivían en WhatsApp, y del
 * lado del cliente no había NADA que ver. Lo peor es que la pantalla del
 * cliente tenía un bloque "Respuesta del equipo" que leía `admin_reply`, un
 * campo que el backend nunca devolvió -- así que no se mostró jamás y nadie se
 * enteró.
 *
 * Ese es el motivo de que este spec exista y de que sea E2E y no unitario: los
 * tests con mocks no detectan que el tipo del frontend declare un campo que la
 * API no manda. Solo el navegador contra el backend real lo hace.
 */

test.describe("Cotizaciones — de la consulta al pedido", () => {
  test("el cliente consulta, el admin cotiza y convierte, y el cliente ve su pedido", async ({ page }) => {
    const customer = await registerNewCustomer(page);
    const vehiculo = `Gol G5 ${unique()}`;

    // ── El cliente pide una cotización ───────────────────────────────────
    await page.goto("/contacto");
    await page.getByRole("button", { name: "Solicitar cotización" }).click();

    await page.getByLabel(/^Vehículo/).fill(vehiculo);
    await page.getByLabel(/^Qué necesitás/).fill("Pastillas de freno delanteras");
    await page.getByRole("button", { name: "Enviar cotización" }).click();
    await expect(page.getByText("¡Cotización enviada!")).toBeVisible();

    // Se navega en vez de cerrar el modal: el `goto` de abajo lo desmonta y
    // ahorra un clic.
    //
    // (Acá se descubrió que la X del Modal y el botón del pie tenían los dos
    // el nombre accesible "Cerrar". Se arregló en `shared/ui/Modal.tsx` — la X
    // pasó a "Cerrar ventana" — así que hoy el locator sería válido.)

    // Todavía sin respuesta: no hay precios que mostrar.
    await page.goto("/cuenta/cotizaciones");
    await expect(page.getByText(vehiculo)).toBeVisible();
    await expect(page.getByText("Lo que te cotizamos")).toHaveCount(0);
    await logout(page, customer.firstName);

    // ── El admin carga dos opciones ──────────────────────────────────────
    await loginAsAdmin(page);
    await page.goto("/admin/cotizaciones");

    const fila = page.locator("tr", { hasText: vehiculo });
    await expect(fila).toBeVisible();
    await expect(fila.getByText("Sin responder")).toBeVisible();
    await fila.getByRole("button", { name: /^Abrir consulta/ }).click();

    // `exact: true` en todos los `getByLabel` de acá abajo: por defecto hace
    // coincidencia por subcadena, y "Repuesto" agarra además el logo del
    // navbar, cuyo aria-label es "Crow Repuestos".
    await page.getByLabel("Repuesto", { exact: true }).fill("Original Bosch");
    await page.getByLabel("Precio unitario", { exact: true }).fill("45000");
    await page.getByLabel("Plazo", { exact: true }).fill("3 a 5 días hábiles");
    await page.getByRole("button", { name: "Agregar opción" }).click();

    await expect(page.getByText("Original Bosch")).toBeVisible();
    // La primera opción responde la cotización sola. Es la regla que evita el
    // caso de siempre: cargar los precios y olvidarse de mover el estado.
    //
    // `.first()` y no un locator a secas: "Respondida" también es una de las
    // opciones del <select> de estado y una fila de la tabla de atrás, así que
    // el modo estricto encontraría tres coincidencias.
    await expect(page.getByText("Respondida").first()).toBeVisible();

    await page.getByRole("button", { name: "Agregar otra opción" }).click();
    await page.getByLabel("Repuesto", { exact: true }).fill("Alternativo Valeo");
    await page.getByLabel("Precio unitario", { exact: true }).fill("28000");
    await page.getByRole("button", { name: "Agregar opción" }).click();
    await expect(page.getByText("Alternativo Valeo")).toBeVisible();

    // ── Convertir: primero explica por qué no puede ──────────────────────
    const convertir = page.getByRole("button", { name: "Convertir en pedido" });
    await expect(convertir).toBeDisabled();
    await expect(page.getByText(/Elegí cuál de las opciones/)).toBeVisible();

    await page.getByLabel("Elegir Alternativo Valeo").check();
    await expect(convertir).toBeEnabled();
    await convertir.click();
    await page.getByRole("button", { name: "Convertir", exact: true }).click();

    await expect(page.getByText(/Convertida en el pedido/)).toBeVisible();

    // Cerrar la ficha ANTES de desloguear: el Drawer es un overlay `fixed
    // inset-0` con z-200 que cubre la pantalla entera, así que el botón de
    // cerrar sesión del sidebar existe y es "visible" para Playwright pero
    // ningún clic le llega.
    await page.getByLabel("Cerrar", { exact: true }).click();
    await logoutFromAdmin(page);

    // ── El cliente ve el precio, el plazo y su pedido ────────────────────
    await loginAs(page, customer.email, customer.password);
    // Esperar el redirect ANTES de navegar. Sin esto, el `goto` de abajo sale
    // mientras el POST de login sigue en vuelo, lo aborta, y la app rebota a
    // /login -- que es exactamente lo que muestra el snapshot cuando falla:
    // la pantalla de "Bienvenido de nuevo" en vez de las cotizaciones.
    await expect(page).toHaveURL(/\/cuenta/);

    await page.goto("/cuenta/cotizaciones");
    await expect(page.getByText("Opciones que te ofrecemos")).toBeVisible();
    await expect(page.getByText("Original Bosch")).toBeVisible();
    await expect(page.getByText("3 a 5 días hábiles")).toBeVisible();

    // El enlace al pedido, que es la otra punta del circuito.
    await page.getByRole("link", { name: /Ver el pedido/ }).click();
    await expect(page).toHaveURL(/\/cuenta\/pedidos/);

    // La lista muestra número, fecha y total; los ítems están en el detalle.
    // El cliente es recién registrado, así que este es su único pedido.
    await page.getByText(/^Pedido #\d+$/).first().click();

    // La línea libre lleva el título de la opción elegida, no un producto del
    // catálogo: es un repuesto que se trae a pedido y no existe en el stock.
    await expect(page.getByText("Alternativo Valeo")).toBeVisible();
    // Y el SKU la ata de vuelta a la consulta que la generó.
    await expect(page.getByText(/SKU COT-\d{5}/)).toBeVisible();
  });

  test("no se puede pedir una cotización sin decir para qué vehículo es", async ({ page }) => {
    await page.goto("/contacto");
    await page.getByRole("button", { name: "Solicitar cotización" }).click();

    await page.getByLabel("Nombre").fill("Cliente sin auto");
    await page.getByLabel(/^Qué necesitás/).fill("Pastillas de freno");
    await page.getByRole("button", { name: "Enviar cotización" }).click();

    // El navegador frena el submit por el `required`: el modal sigue abierto y
    // no hay pantalla de éxito. Sin el vehículo, responder la consulta arranca
    // preguntando por WhatsApp lo que el formulario podía haber pedido.
    await expect(page.getByText("¡Cotización enviada!")).toHaveCount(0);
  });
});
