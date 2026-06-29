import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { api } from "@/shared/api/client";

// ─── MSW server ──────────────────────────────────────────────────────────────

const server = setupServer();
beforeEach(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => { server.resetHandlers(); vi.clearAllMocks(); });
afterEach(() => server.close());

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("interceptor de refresh", () => {
  it("reintenta el request original tras un 401 y un refresh exitoso", async () => {
    let productCallCount = 0;

    server.use(
      http.get("/api/products", () => {
        productCallCount++;
        // Primera llamada → 401, segunda → 200
        if (productCallCount === 1) return new HttpResponse(null, { status: 401 });
        return HttpResponse.json({ items: [], total: 0 });
      }),
      http.post("/api/auth/refresh", () => new HttpResponse(null, { status: 204 })),
    );

    const res = await api.get("/products");
    expect(res.status).toBe(200);
    expect(productCallCount).toBe(2); // llamado dos veces: fallo + retry
  });

  it("propaga el error cuando el refresh también falla", async () => {
    server.use(
      http.get("/api/products", () => new HttpResponse(null, { status: 401 })),
      http.post("/api/auth/refresh", () => new HttpResponse(null, { status: 401 })),
    );

    await expect(api.get("/products")).rejects.toMatchObject({
      response: { status: 401 },
    });
  });

  it("no reintenta requests a endpoints de /auth/", async () => {
    // Si /auth/login da 401 no debe intentar un refresh (evita loops)
    let refreshCount = 0;

    server.use(
      http.post("/api/auth/login", () => new HttpResponse(null, { status: 401 })),
      http.post("/api/auth/refresh", () => {
        refreshCount++;
        return new HttpResponse(null, { status: 204 });
      }),
    );

    await expect(api.post("/auth/login", {})).rejects.toMatchObject({
      response: { status: 401 },
    });

    expect(refreshCount).toBe(0); // nunca llamó al refresh
  });

  it("no duplica el refresh cuando múltiples requests dan 401 simultáneamente", async () => {
    let refreshCount = 0;
    let productCallCount = 0;

    server.use(
      http.get("/api/products", () => {
        productCallCount++;
        if (productCallCount <= 2) return new HttpResponse(null, { status: 401 });
        return HttpResponse.json({ items: [], total: 0 });
      }),
      http.post("/api/auth/refresh", async () => {
        refreshCount++;
        await new Promise((r) => setTimeout(r, 20)); // simula latencia
        return new HttpResponse(null, { status: 204 });
      }),
    );

    // Lanza dos requests en paralelo — ambas reciben 401
    const [r1, r2] = await Promise.all([
      api.get("/products"),
      api.get("/products"),
    ]);

    expect(r1.status).toBe(200);
    expect(r2.status).toBe(200);
    expect(refreshCount).toBe(1); // un solo refresh para ambas
  });
});
