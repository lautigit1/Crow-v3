import { test, expect } from "@playwright/test";
import { loginAsAdmin, unique } from "./helpers";

/**
 * Flujo completo de importación de una factura de proveedor.
 *
 * Es el único test que ejerce la cadena entera contra el stack real:
 * subir → parsear → revisar → confirmar → stock movido → productos creados
 * en borrador. Los tests de backend cubren cada pieza por separado; acá lo
 * que se verifica es que el cableado entre todas ellas funcione.
 *
 * El archivo se construye como CSV renombrado no: openpyxl del lado del
 * servidor exige un .xlsx real, así que se genera en el navegador con
 * SheetJS... tampoco: no está en las dependencias del frontend. Se arma
 * entonces un .xlsx mínimo válido a mano (es un ZIP con tres XML), que es
 * suficiente para que openpyxl lo lea y evita sumar una dependencia solo
 * para los tests E2E.
 */

/** Genera un .xlsx real en el navegador, sin dependencias. */
async function xlsx(page: import("@playwright/test").Page, filas: string[][]): Promise<Buffer> {
  // Se usa CompressionStream, disponible en Chromium, para armar el ZIP.
  const base64 = await page.evaluate(async (rows) => {
    const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const celdas = (fila: string[], n: number) =>
      fila.map((v, i) => `<c r="${String.fromCharCode(65 + i)}${n}" t="inlineStr"><is><t>${esc(v)}</t></is></c>`).join("");
    const sheet =
      `<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>` +
      rows.map((f, i) => `<row r="${i + 1}">${celdas(f, i + 1)}</row>`).join("") +
      `</sheetData></worksheet>`;

    const files: Record<string, string> = {
      "[Content_Types].xml":
        `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`,
      "_rels/.rels":
        `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
      "xl/workbook.xml":
        `<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Hoja1" sheetId="1" r:id="rId1"/></sheets></workbook>`,
      "xl/_rels/workbook.xml.rels":
        `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`,
      "xl/worksheets/sheet1.xml": sheet,
    };

    // ZIP sin compresión (método 0): más código escribir deflate que esto,
    // y openpyxl lee ZIP "stored" sin problema.
    const enc = new TextEncoder();
    const partes: Uint8Array[] = [];
    const central: Uint8Array[] = [];
    let offset = 0;

    const crcTabla = (() => {
      const t = new Uint32Array(256);
      for (let i = 0; i < 256; i++) {
        let c = i;
        for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        t[i] = c >>> 0;
      }
      return t;
    })();
    const crc32 = (b: Uint8Array) => {
      let c = 0xffffffff;
      for (const x of b) c = crcTabla[(c ^ x) & 0xff] ^ (c >>> 8);
      return (c ^ 0xffffffff) >>> 0;
    };
    const u32 = (n: number) => new Uint8Array([n & 255, (n >> 8) & 255, (n >> 16) & 255, (n >>> 24) & 255]);
    const u16 = (n: number) => new Uint8Array([n & 255, (n >> 8) & 255]);
    const cat = (...a: Uint8Array[]) => {
      const total = a.reduce((s, x) => s + x.length, 0);
      const out = new Uint8Array(total);
      let p = 0;
      for (const x of a) { out.set(x, p); p += x.length; }
      return out;
    };

    for (const [nombre, contenido] of Object.entries(files)) {
      const datos = enc.encode(contenido);
      const nom = enc.encode(nombre);
      const crc = crc32(datos);
      const local = cat(u32(0x04034b50), u16(20), u16(0), u16(0), u16(0), u16(0), u32(crc), u32(datos.length), u32(datos.length), u16(nom.length), u16(0), nom, datos);
      partes.push(local);
      central.push(cat(u32(0x02014b50), u16(20), u16(20), u16(0), u16(0), u16(0), u16(0), u32(crc), u32(datos.length), u32(datos.length), u16(nom.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(offset), nom));
      offset += local.length;
    }
    const cd = cat(...central);
    const zip = cat(cat(...partes), cd, u32(0x06054b50), u16(0), u16(0), u16(central.length), u16(central.length), u32(cd.length), u32(offset), u16(0));

    let bin = "";
    for (const b of zip) bin += String.fromCharCode(b);
    return btoa(bin);
  }, filas);

  return Buffer.from(base64, "base64");
}

test.describe("Admin — importación de facturas", () => {
  test("sube un Excel, revisa y confirma: crea productos en borrador y suma stock", async ({ page }) => {
    await loginAsAdmin(page);

    // Un proveedor propio para no depender de datos de otras corridas.
    const proveedor = `Proveedor E2E ${unique()}`;
    await page.goto("/admin/proveedores");
    await page.getByRole("button", { name: "Nuevo proveedor" }).click();
    // Sin `exact`: el asterisco de obligatorio es parte del texto de la
    // etiqueta ("Nombre del proveedor *"), porque `Field` lo separa en un
    // <span> propio para pintarlo con el color de marca. Con `exact: true`
    // no matchea nunca.
    await page.getByLabel("Nombre del proveedor").fill(proveedor);
    // Por texto y no por `form button[type=submit]`: el botón de guardar
    // vive en el PIE del Modal, fuera del <form>, conectado por el
    // atributo `form="supplier-form"`. Un selector de descendencia no lo
    // alcanza.
    await page.getByRole("button", { name: "Crear proveedor" }).click();
    await expect(page.locator("tr", { hasText: proveedor })).toBeVisible();

    const sku = `IMP-${unique()}`;
    const archivo = await xlsx(page, [
      ["Código", "Descripción", "Cant.", "P. Unitario"],
      [sku, "Producto importado E2E", "4", "2500"],
    ]);

    await page.goto("/admin/importaciones");
    // `.first()`: con la lista vacía hay dos botones con este texto (el del
    // encabezado y el del estado vacío) y strict mode rechaza el locator.
    await page.getByRole("button", { name: "Nueva importación" }).first().click();

    // Sin `exact` por lo mismo que arriba: la etiqueta es "Proveedor *".
    await page.getByLabel("Proveedor").selectOption({ label: proveedor });
    await page.locator("#archivo-factura").setInputFiles({
      name: "factura-e2e.xlsx",
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      buffer: archivo,
    });

    // Primera importación de este proveedor: el mapeo se adivina solo.
    await expect(page.getByText(/Primera importación de este proveedor/)).toBeVisible();
    await page.getByPlaceholder("Ej. 154300.50").fill("10000");
    await page.getByRole("button", { name: "Leer y revisar" }).click();

    // Revisión: el total cuadra y se puede confirmar.
    await expect(page.getByText("El total coincide")).toBeVisible();
    await page.getByRole("button", { name: /Confirmar e ingresar mercadería/ }).click();

    await expect(page.getByText("Mercadería ingresada")).toBeVisible();
    // El aviso que más importa: quedaron en borrador, no publicados.
    await expect(page.getByText(/en borrador/).first()).toBeVisible();

    // El producto existe, con el stock de la factura y fuera del catálogo.
    await page.goto("/admin/productos");
    await page.getByPlaceholder("Buscar por nombre, SKU o descripción").fill(sku);
    const fila = page.locator("tr", { hasText: sku });
    await expect(fila).toBeVisible();
    await expect(fila.getByText("Borrador")).toBeVisible();
    await expect(fila).toContainText("4");
  });

  test("no deja confirmar si el total de la factura no coincide", async ({ page }) => {
    await loginAsAdmin(page);

    const proveedor = `Proveedor E2E ${unique()}`;
    await page.goto("/admin/proveedores");
    await page.getByRole("button", { name: "Nuevo proveedor" }).click();
    // Sin `exact`: el asterisco de obligatorio es parte del texto de la
    // etiqueta ("Nombre del proveedor *"), porque `Field` lo separa en un
    // <span> propio para pintarlo con el color de marca. Con `exact: true`
    // no matchea nunca.
    await page.getByLabel("Nombre del proveedor").fill(proveedor);
    // Por texto y no por `form button[type=submit]`: el botón de guardar
    // vive en el PIE del Modal, fuera del <form>, conectado por el
    // atributo `form="supplier-form"`. Un selector de descendencia no lo
    // alcanza.
    await page.getByRole("button", { name: "Crear proveedor" }).click();
    await expect(page.locator("tr", { hasText: proveedor })).toBeVisible();

    const archivo = await xlsx(page, [
      ["Código", "Descripción", "Cant.", "P. Unitario"],
      [`IMP-${unique()}`, "Producto E2E", "2", "1000"],
    ]);

    await page.goto("/admin/importaciones");
    // `.first()`: con la lista vacía hay dos botones con este texto (el del
    // encabezado y el del estado vacío) y strict mode rechaza el locator.
    await page.getByRole("button", { name: "Nueva importación" }).first().click();
    // Sin `exact` por lo mismo que arriba: la etiqueta es "Proveedor *".
    await page.getByLabel("Proveedor").selectOption({ label: proveedor });
    await page.locator("#archivo-factura").setInputFiles({
      name: "factura-mal.xlsx",
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      buffer: archivo,
    });

    // 2 × 1000 = 2000, pero se declara otra cosa a propósito.
    await page.getByPlaceholder("Ej. 154300.50").fill("99999");
    await page.getByRole("button", { name: "Leer y revisar" }).click();

    await expect(page.getByText("El total no coincide")).toBeVisible();
    // El botón refleja la regla antes de intentar, no después de fallar.
    await expect(page.getByRole("button", { name: /Confirmar e ingresar mercadería/ })).toBeDisabled();
  });

  test("avisa cuando se sube una factura ya importada", async ({ page }) => {
    await loginAsAdmin(page);

    const proveedor = `Proveedor E2E ${unique()}`;
    await page.goto("/admin/proveedores");
    await page.getByRole("button", { name: "Nuevo proveedor" }).click();
    // Sin `exact`: el asterisco de obligatorio es parte del texto de la
    // etiqueta ("Nombre del proveedor *"), porque `Field` lo separa en un
    // <span> propio para pintarlo con el color de marca. Con `exact: true`
    // no matchea nunca.
    await page.getByLabel("Nombre del proveedor").fill(proveedor);
    // Por texto y no por `form button[type=submit]`: el botón de guardar
    // vive en el PIE del Modal, fuera del <form>, conectado por el
    // atributo `form="supplier-form"`. Un selector de descendencia no lo
    // alcanza.
    await page.getByRole("button", { name: "Crear proveedor" }).click();
    await expect(page.locator("tr", { hasText: proveedor })).toBeVisible();

    const archivo = await xlsx(page, [
      ["Código", "Descripción", "Cant.", "P. Unitario"],
      [`DUP-${unique()}`, "Producto duplicado E2E", "1", "500"],
    ]);
    const subir = async () => {
      await page.goto("/admin/importaciones");
      // `.first()`: con la lista vacía hay dos botones con este texto (el del
    // encabezado y el del estado vacío) y strict mode rechaza el locator.
    await page.getByRole("button", { name: "Nueva importación" }).first().click();
      // Sin `exact` por lo mismo que arriba: la etiqueta es "Proveedor *".
    await page.getByLabel("Proveedor").selectOption({ label: proveedor });
      await page.locator("#archivo-factura").setInputFiles({
        name: "factura-dup.xlsx",
        mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        buffer: archivo,
      });
    };

    await subir();
    await page.getByPlaceholder("Ej. 154300.50").fill("500");
    await page.getByRole("button", { name: "Leer y revisar" }).click();
    await expect(page.getByText("El total coincide")).toBeVisible();

    // Mismo archivo otra vez: el aviso llega antes de procesar nada.
    await subir();
    await expect(page.getByText("Esta factura ya se importó")).toBeVisible();
  });
});
