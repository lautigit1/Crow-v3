import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  activarSonido,
  reproducirAviso,
  sonidoActivado,
} from "@/shared/lib/notificationSound";

/**
 * Lo que se prueba acá es sobre todo que **no reviente nunca**.
 *
 * El audio en el navegador falla por motivos que no son errores: autoplay
 * bloqueado hasta la primera interacción, AudioContext no disponible, pestaña en
 * segundo plano. Ninguno de esos casos puede tirar una excepción hacia el
 * componente que está mostrando una notificación.
 */

describe("notificationSound — preferencia", () => {
  beforeEach(() => localStorage.clear());

  it("viene activado por defecto", () => {
    // La ausencia de valor significa "no lo tocó", no "lo apagó".
    expect(sonidoActivado()).toBe(true);
  });

  it("se puede apagar y queda guardado", () => {
    activarSonido(false);
    expect(sonidoActivado()).toBe(false);
  });

  it("se puede volver a encender", () => {
    activarSonido(false);
    activarSonido(true);
    expect(sonidoActivado()).toBe(true);
  });

  it("si localStorage tira, asume que está activado", () => {
    const spy = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("acceso denegado");
    });
    // Pasa en Safari en modo privado. No puede tirar hacia afuera.
    expect(sonidoActivado()).toBe(true);
    spy.mockRestore();
  });
});

describe("notificationSound — reproducir", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.unstubAllGlobals());

  it("no tira cuando no hay AudioContext", () => {
    // Es el caso de jsdom, y también de navegadores viejos.
    expect(() => reproducirAviso()).not.toThrow();
  });

  it("no tira cuando el navegador bloquea el audio", () => {
    vi.stubGlobal(
      "AudioContext",
      class {
        constructor() {
          throw new Error("autoplay bloqueado");
        }
      },
    );
    expect(() => reproducirAviso()).not.toThrow();
  });

  it("no hace nada si está silenciado", () => {
    const constructor = vi.fn();
    vi.stubGlobal("AudioContext", class { constructor() { constructor(); } });
    activarSonido(false);

    reproducirAviso();

    expect(constructor).not.toHaveBeenCalled();
  });
});
