import { describe, it, expect } from "vitest";
import axios from "axios";
import { apiError } from "@/shared/api/client";

describe("apiError", () => {
  it("devuelve el detail string del error axios", () => {
    const err = new axios.AxiosError("error");
    err.response = { data: { detail: "Email ya registrado" } } as never;
    expect(apiError(err)).toBe("Email ya registrado");
  });

  it("devuelve el primer msg cuando detail es un array (422 de FastAPI)", () => {
    const err = new axios.AxiosError("error");
    err.response = {
      data: { detail: [{ msg: "Field required", loc: ["body", "email"] }] },
    } as never;
    expect(apiError(err)).toBe("Field required");
  });

  it("devuelve el fallback cuando detail no es string ni array con msg", () => {
    const err = new axios.AxiosError("error");
    err.response = { data: { detail: { nested: "object" } } } as never;
    expect(apiError(err)).toBe("Ocurrió un error");
  });

  it("devuelve el fallback personalizado para errores no-axios", () => {
    expect(apiError(new Error("algo raro"), "Error de red")).toBe("Error de red");
  });

  it("devuelve el fallback por defecto para errores no-axios", () => {
    expect(apiError(new Error("algo raro"))).toBe("Ocurrió un error");
  });

  it("devuelve el fallback para null/undefined", () => {
    expect(apiError(null)).toBe("Ocurrió un error");
    expect(apiError(undefined)).toBe("Ocurrió un error");
  });
});
