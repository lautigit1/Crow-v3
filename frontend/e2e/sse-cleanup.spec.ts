import { execFileSync } from "node:child_process";
import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers";

/**
 * Que cerrar la pestaña libere la conexión SSE **del lado del servidor**.
 *
 * Los tests de `backend/tests/test_events.py` cubren que el generador cierre
 * cuando alguien lo cancela, pero eso pasa dentro de un solo proceso de Python.
 * El camino real es otro y tiene cuatro eslabones: el navegador cierra el
 * socket, nginx corta, uvicorn cancela la tarea, y recién ahí el `finally` de
 * `_stream` alcanza a `pubsub.aclose()`. Cualquiera de esos puede fallar sin
 * que se rompa un test unitario, y el síntoma sería una fuga lenta: cada
 * pestaña que se abre y se cierra deja una conexión a Redis que no vuelve,
 * hasta que la API se queda sin conexiones días después.
 *
 * La evidencia se toma de Redis, no de la aplicación: preguntarle a la propia
 * API si soltó sus conexiones sería pedirle que se autocertifique. Qué se mide
 * exactamente, y por qué las dos opciones obvias no servían, está en
 * `suscripcionesAbiertas()`.
 *
 * Necesita el stack de docker-compose levantado. Si `redis-cli` no contesta se
 * saltea en vez de fallar: en un entorno sin docker esto no es una regresión,
 * es un test que no aplica.
 */

const CANALES = "crow:eventos:*";

function redis(...args: string[]): string {
  return execFileSync("docker", ["compose", "exec", "-T", "redis", "redis-cli", ...args], {
    encoding: "utf8",
    timeout: 15_000,
  }).trim();
}

/**
 * Conexiones a Redis que están en modo suscripción ahora mismo. Una por stream
 * SSE vivo: `_suscribir_redis` abre su propio cliente asíncrono y lo deja
 * suscripto a los canales de esa persona.
 *
 * **Las dos mediciones más obvias no sirven, y se descartaron midiendo, no
 * opinando:**
 *
 *  - `CLIENT LIST` a secas cuenta también las conexiones del rate limiter, la
 *    blocklist y el cache del dashboard, que abren y cierran solas mientras
 *    carga la página. Un test que compare ese total contra una línea base
 *    falla de forma intermitente sin que haya ninguna fuga.
 *  - `PUBSUB CHANNELS` mira el problema del lado equivocado: dice qué canales
 *    tienen alguien escuchando, no cuántas conexiones quedaron abiertas. Con
 *    una fuga inducida a propósito volvía a cero igual, o sea que un test
 *    escrito sobre eso pasa en verde con la fuga puesta.
 *
 * Lo que sí distingue a un stream SSE es el campo `sub=` de `CLIENT LIST`:
 * las conexiones normales van en `sub=0` y las de suscripción en `sub>0`.
 */
function suscripcionesAbiertas(): number {
  const salida = redis("CLIENT", "LIST");
  if (!salida) return 0;
  return salida.split("\n").filter((linea) => {
    const m = linea.match(/\bsub=(\d+)/);
    return m !== null && Number(m[1]) > 0;
  }).length;
}

/**
 * Canales con al menos un suscriptor. Sirve para confirmar que la suscripción
 * se abrió sobre los canales correctos; para la liberación se usa la función
 * de arriba.
 */
function canalesActivos(): number {
  const salida = redis("PUBSUB", "CHANNELS", CANALES);
  return salida ? salida.split("\n").filter((l) => l.trim()).length : 0;
}

/**
 * Espera hasta que `condicion` se cumpla. No sirve un sleep fijo: la
 * liberación depende de que uvicorn note el corte, que en la práctica tarda
 * menos de un segundo pero no está garantizado.
 */
async function esperarA(condicion: () => boolean, limiteMs = 15_000): Promise<boolean> {
  const hasta = Date.now() + limiteMs;
  while (Date.now() < hasta) {
    if (condicion()) return true;
    await new Promise((r) => setTimeout(r, 500));
  }
  return condicion();
}

let disponible = true;

test.beforeAll(() => {
  try {
    redis("PING");
  } catch {
    disponible = false;
  }
});

test.describe("SSE — liberación del lado del servidor", () => {
  test.beforeEach(() => {
    test.skip(!disponible, "redis-cli no responde: hace falta el stack de docker-compose");
  });

  test("cerrar la pestaña libera la conexión a Redis", async ({ browser }) => {
    const base = suscripcionesAbiertas();

    const contexto = await browser.newContext();
    const page = await contexto.newPage();
    await loginAsAdmin(page);

    // El panel abre el EventSource al montar. Se espera a que la conexión
    // aparezca en Redis en vez de asumir que ya está: el `await` del login
    // vuelve cuando cambió la URL, no cuando el stream quedó conectado.
    await page.goto("/admin/pedidos");
    const abrio = await esperarA(() => suscripcionesAbiertas() > base);
    expect(abrio, "el panel no abrió ninguna suscripción SSE").toBe(true);
    expect(canalesActivos(), "no hay canales suscriptos").toBeGreaterThan(0);

    // Cerrar el contexto entero, no solo la página: así se van también las
    // cookies, que es lo que hace un navegador cuando cierra de verdad.
    await contexto.close();

    const libero = await esperarA(() => suscripcionesAbiertas() === base);
    expect(libero, "la suscripción quedó colgada después de cerrar la pestaña").toBe(true);
  });

  test("abrir y cerrar varias veces no acumula conexiones", async ({ browser }) => {
    // Una fuga de a una por pestaña no se ve en un solo ciclo: el punto es que
    // la cuenta vuelva al mismo lugar las tres veces, no que baje alguna vez.
    const base = suscripcionesAbiertas();

    for (let i = 0; i < 3; i++) {
      const contexto = await browser.newContext();
      const page = await contexto.newPage();
      await loginAsAdmin(page);
      await page.goto("/admin/pedidos");
      expect(await esperarA(() => suscripcionesAbiertas() > base), `ciclo ${i + 1}: no abrió`).toBe(true);

      await contexto.close();
      expect(
        await esperarA(() => suscripcionesAbiertas() === base),
        `ciclo ${i + 1}: quedó una suscripción colgada`,
      ).toBe(true);
    }
  });

  test("dos pestañas abiertas: cerrar una no corta la otra", async ({ browser }) => {
    // El riesgo acá es el inverso al de la fuga: que el cleanup se lleve
    // puesta una suscripción ajena. Las dos sesiones son del mismo admin, así
    // que comparten los mismos canales y contarlos no las distingue -- por eso
    // se cuentan las conexiones en modo suscripción, que son una por stream.
    const base = suscripcionesAbiertas();

    const uno = await browser.newContext();
    const dos = await browser.newContext();

    const pageUno = await uno.newPage();
    await loginAsAdmin(pageUno);
    await pageUno.goto("/admin/pedidos");
    expect(await esperarA(() => suscripcionesAbiertas() > base), "la primera no conectó").toBe(true);
    const conUna = suscripcionesAbiertas();

    const pageDos = await dos.newPage();
    await loginAsAdmin(pageDos);
    await pageDos.goto("/admin/pedidos");
    expect(await esperarA(() => suscripcionesAbiertas() > conUna), "la segunda no conectó").toBe(true);

    await uno.close();
    // La que queda abierta sostiene lo suyo: baja a una, no a cero.
    expect(
      await esperarA(() => suscripcionesAbiertas() === conUna),
      "cerrar una pestaña se llevó puesta la suscripción de la otra",
    ).toBe(true);

    await dos.close();
    expect(await esperarA(() => suscripcionesAbiertas() === base)).toBe(true);
  });
});
