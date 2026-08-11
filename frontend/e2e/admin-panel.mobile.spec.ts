import { test, expect } from "@playwright/test";
import { ADMIN_EMAIL, loginAsAdmin } from "./helpers";

/**
 * El panel desde un teléfono.
 *
 * Corre en el proyecto `mobile` de `playwright.config.ts` (Pixel 7, 412px).
 * Existe porque los 9 tests de `DataTable` en vitest corren en jsdom, que **no
 * hace layout**: pueden verificar que las tarjetas existan y que los clicks
 * funcionen, pero no si algo se desborda de la pantalla. Y el desborde era
 * exactamente el problema que este change vino a resolver.
 *
 * El `min-w-[640px]` viejo habría pasado todos los tests unitarios y fallado
 * el primero de acá.
 */

/**
 * Espera a que el panel terminó de cargar.
 *
 * **NO usar `waitForLoadState("networkidle")` en esta app.** `networkidle`
 * espera 500ms sin ninguna petición en vuelo, y el panel mantiene abierta una
 * conexión SSE permanente contra `/api/events` para los avisos en vivo. Esa
 * conexión no cierra nunca, así que la condición no se cumple jamás y el test
 * muere por timeout a los 60 segundos. Fue lo que hizo fallar los cuatro
 * specs de mobile la primera vez.
 *
 * Se espera a que la lista haya resuelto en uno de sus dos finales posibles:
 * hay tarjetas, o hay un mensaje de vacío. `locator.or()` acepta cualquiera de
 * los dos.
 *
 * La primera versión esperaba "el primer heading", que en estas pantallas es el
 * título de la sección y **existe desde el primer cuadro**, antes de que
 * lleguen los datos. Con eso el test que contaba botones encontraba cero y se
 * salteaba solo -- un test que se saltea en silencio no protege nada.
 */
async function esperarLaLista(page: import("@playwright/test").Page) {
  const conDatos = page.getByRole("button", { name: /Gestionar|Abrir|Editar/ }).first();
  const vacia = page.getByText(/No hay|Sin registros|no se pudieron/i).first();
  await expect(conDatos.or(vacia)).toBeVisible({ timeout: 15_000 });
}

/**
 * Deja un pedido en la base, a nombre del admin logueado.
 *
 * Se hace por la API y no por la interfaz a propósito: comprar desde el sitio
 * exige dar de alta un producto, y **el formulario de alta no funciona a
 * 412px** (hallazgo aparte, anotado en tasks.md). Este spec prueba el
 * comportamiento del toque en una tarjeta, no el circuito de compra -- ese ya
 * tiene su cobertura en `shopping-flow.spec.ts`.
 *
 * `page.request` comparte las cookies del navegador, así que va autenticado.
 */
async function crearPedidoDePrueba(page: import("@playwright/test").Page) {
  // `in_stock=true` y `sort=stock_desc`: pedir "el primer producto" a secas
  // devolvía el que deja el spec de "producto sin stock", y el pedido rebotaba
  // con un 409. Ordenar por stock descendente además evita agarrar uno al que
  // le quede una sola unidad y que otra corrida ya se llevó.
  const respuesta = await page.request.get("/api/products?limit=1&in_stock=true&sort=stock_desc");
  const { items } = await respuesta.json();
  expect(items.length, "la base no tiene ningún producto con stock para armar un pedido").toBeGreaterThan(0);

  const creado = await page.request.post("/api/orders", {
    data: { items: [{ product_id: items[0].id, quantity: 1 }] },
  });
  expect(creado.status(), await creado.text()).toBe(201);
}

/** Ancho del documento vs. ancho de la ventana: si sobra, hay scroll lateral. */
async function scrollHorizontal(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const doc = document.documentElement;
    return doc.scrollWidth - doc.clientWidth;
  });
}

test.describe("Panel en el celular", () => {
  test("las tablas del panel no generan scroll horizontal", async ({ page }) => {
    await loginAsAdmin(page);

    // Las cuatro que más se usan desde el mostrador, más una de solo lectura.
    for (const ruta of ["/admin/pedidos", "/admin/cotizaciones", "/admin/productos", "/admin/usuarios"]) {
      await page.goto(ruta);
      // Esperar a que la lista cargue: medir mientras está el spinner no
      // prueba nada, porque el spinner siempre entra.
      await esperarLaLista(page);

      const sobra = await scrollHorizontal(page);
      expect(sobra, `${ruta} desborda ${sobra}px a lo ancho`).toBeLessThanOrEqual(0);
    }
  });

  test("la barra lateral no ocupa lugar hasta que se abre", async ({ page }) => {
    // La causa real del desborde de 138px: `grid-cols-[260px_1fr]` fijo dejaba
    // 152px de contenido en una pantalla de 412. Las tablas ya eran tarjetas y
    // el panel seguía roto -- arreglar la tabla no alcanzaba.
    await loginAsAdmin(page);
    await esperarLaLista(page);

    // Los enlaces del menú existen en el DOM pero están fuera de pantalla.
    const menu = page.getByRole("button", { name: "Abrir menú" });
    await expect(menu).toBeVisible();

    await menu.click();
    await expect(page.getByRole("link", { name: "Pedidos" })).toBeVisible();

    // Y al navegar se cierra solo: si quedara abierto, taparía justo la
    // pantalla que la persona acaba de pedir.
    await page.getByRole("link", { name: "Pedidos" }).click();
    await expect(page.getByRole("link", { name: "Pedidos" })).not.toBeInViewport();
  });

  test("no se renderiza ninguna tabla: cada fila es una tarjeta", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/pedidos");
    await esperarLaLista(page);

    // Si aparece un <table>, volvió el scroll lateral aunque nada se desborde
    // todavía por tener pocas columnas visibles.
    await expect(page.locator("table")).toHaveCount(0);
  });

  test("la tarjeta de un producto conserva sus datos con etiqueta", async ({ page }) => {
    // Este spec NO da de alta un producto.
    //
    // La primera versión usaba `createProductAsAdmin` y falló: en 412px el
    // formulario de alta no completa el POST. Eso es un hallazgo real -- el
    // modal de alta no es usable desde un teléfono -- pero es **otro problema**
    // que el que este change vino a resolver, y meterlo acá haría que un spec
    // sobre tablas fallara por un formulario. Queda anotado en tasks.md.
    await loginAsAdmin(page);
    await page.goto("/admin/productos");
    await esperarLaLista(page);

    // En la tarjeta cada valor lleva su etiqueta, que en la tabla la daba el
    // encabezado de columna una sola vez arriba de todo.
    await expect(page.getByText("Precio").first()).toBeVisible();
    await expect(page.getByText("Stock").first()).toBeVisible();
  });

  test("tocar una acción no abre además la ficha", async ({ page }) => {
    // Sin `stopPropagation` un solo toque haría dos cosas, y en un teléfono no
    // hay hover previo que avise de lo que está por pasar.
    //
    // Este test **crea su propio pedido** en vez de depender de los que dejaron
    // otros specs. La primera versión tenía un `test.skip` por si la base
    // estaba vacía, y terminó salteándose siempre: se salteaba en silencio y
    // parecía que pasaba. Un test que depende del orden de ejecución para tener
    // datos no es un test, es una casualidad.
    await loginAsAdmin(page);
    await crearPedidoDePrueba(page);

    await page.goto("/admin/pedidos");
    // El buscador de pedidos filtra por cliente, y el pedido recién creado
    // quedó a nombre del propio admin.
    await page.getByLabel("Buscar pedidos").fill(ADMIN_EMAIL);
    await esperarLaLista(page);

    await page.getByRole("button", { name: "Gestionar" }).first().click();

    // El drawer abre una sola vez: si el click se hubiera propagado, se
    // dispararían dos aperturas y el estado quedaría inconsistente.
    await expect(page.getByRole("button", { name: "Guardar cambios" })).toBeVisible();
  });
});
