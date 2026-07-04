import { describe, it, expect } from "vitest";
import { formatPrice, formatNumber, formatDate, formatDateTime } from "@/shared/lib/format";

describe("formatPrice", () => {
  it("formatea un número como pesos argentinos sin decimales", () => {
    // Intl usa espacios no separables ( ) entre el símbolo y el número
    expect(formatPrice(1500)).toBe(formatPrice(1500));
    expect(formatPrice(1500)).toContain("1.500");
    expect(formatPrice(1500)).toContain("$");
  });

  it('devuelve "Consultar" cuando el valor es null', () => {
    expect(formatPrice(null)).toBe("Consultar");
  });

  it('devuelve "Consultar" cuando el valor es undefined', () => {
    expect(formatPrice(undefined)).toBe("Consultar");
  });

  it("formatea cero correctamente (no lo trata como null)", () => {
    expect(formatPrice(0)).not.toBe("Consultar");
    expect(formatPrice(0)).toContain("0");
  });
});

describe("formatNumber", () => {
  it("agrega separador de miles al estilo es-AR", () => {
    expect(formatNumber(12500)).toBe(new Intl.NumberFormat("es-AR").format(12500));
    expect(formatNumber(12500)).toContain("12.500");
  });

  it("formatea números chicos sin separador", () => {
    expect(formatNumber(5)).toBe("5");
  });
});

describe("formatDate", () => {
  it('formatea una fecha ISO como "dd mon yyyy"', () => {
    // Mediodía UTC -- evita que la conversión a la zona horaria local
    // (ej: Argentina, UTC-3) cruce al día anterior y rompa el assert.
    const result = formatDate("2026-06-21T12:00:00Z");
    expect(result).toMatch(/21/);
    expect(result).toMatch(/2026/);
    expect(result.toLowerCase()).toMatch(/jun/);
  });
});

describe("formatDateTime", () => {
  it("incluye fecha y hora", () => {
    const result = formatDateTime("2026-06-21T14:30:00Z");
    expect(result).toMatch(/2026/);
    expect(result).toMatch(/:/); // separador de hora:minuto
  });
});
