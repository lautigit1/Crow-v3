import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { CheckoutPage } from "@/pages/checkout/CheckoutPage";
import type { CartItem } from "@/app/providers/CartProvider";
import type { Order } from "@/entities/order";
import type { SiteSettings } from "@/entities/settings";

// CheckoutPage lee datos de contacto en vivo (useSiteSettings, TanStack
// Query) para el WhatsApp de "Coordinar por WhatsApp" y el chip de ciudad --
// necesita QueryClientProvider en el árbol y un handler de MSW para
// GET /api/settings, igual que /api/orders se maneja abajo.
const SETTINGS: SiteSettings = {
  company_name: "Crow Repuestos",
  phone_display: "261 660-0569",
  whatsapp_number: "5492616600569",
  email: "ventas@crowrepuestos.com.ar",
  address: "Mendoza, Argentina",
  hours: "Lun–Sáb · 8:00–18:00",
  instagram: "https://instagram.com/crowrepuestos",
  facebook: "https://facebook.com/crowrepuestos",
  tiktok: "",
};

// ─── Mocks ───────────────────────────────────────────────────────────────────
// useCart mockeado (mismo criterio que CartPage.test.tsx): CheckoutPage solo
// necesita items/count/subtotal/clear, no toda la máquina de persistencia.
// orderApi.create pega a la red real (vía axios) -- eso sí se prueba de
// punta a punta con MSW, como en guards.test.tsx, porque es el flujo de
// negocio central de esta página.

const mockUseCart = vi.fn();
vi.mock("@/app/providers/CartProvider", () => ({
  useCart: () => mockUseCart(),
}));

function makeItem(overrides: Partial<CartItem> = {}): CartItem {
  return {
    productId: 1,
    name: "Filtro de aceite",
    sku: "FILT-001",
    price: 1000,
    quantity: 2,
    imageUrl: null,
    stock: 5,
    ...overrides,
  };
}

const clear = vi.fn();

function mockCart(items: CartItem[]) {
  const subtotal = items.reduce((s, i) => s + (i.price ?? 0) * i.quantity, 0);
  const count = items.reduce((s, i) => s + i.quantity, 0);
  mockUseCart.mockReturnValue({ items, count, subtotal, clear });
}

function makeOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: 42,
    user_id: 1,
    status: "Pendiente",
    notes: null,
    admin_notes: null,
    payment_method: "Transferencia",
    items: [],
    created_at: "2026-07-15T00:00:00Z",
    updated_at: "2026-07-15T00:00:00Z",
    ...overrides,
  };
}

const server = setupServer(
  http.get("/api/settings", () => HttpResponse.json(SETTINGS))
);
beforeEach(() => {
  server.listen({ onUnhandledRequest: "error" });
  vi.clearAllMocks();
});
afterEach(() => {
  server.resetHandlers();
  server.close();
});

function renderCheckout() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <CheckoutPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

// ─── Carrito vacío ───────────────────────────────────────────────────────────

describe("CheckoutPage — carrito vacío", () => {
  it("muestra el estado vacío en vez del formulario", () => {
    mockCart([]);
    renderCheckout();
    expect(screen.getByText("Tu carrito está vacío")).toBeInTheDocument();
    expect(screen.queryByText("Método de pago")).not.toBeInTheDocument();
  });
});

// ─── Validación ──────────────────────────────────────────────────────────────

describe("CheckoutPage — validación", () => {
  it("el botón de confirmar queda deshabilitado sin método de pago elegido", () => {
    mockCart([makeItem()]);
    renderCheckout();
    expect(screen.getByRole("button", { name: /confirmar pedido/i })).toBeDisabled();
  });

  it("se habilita al elegir un método de pago", async () => {
    mockCart([makeItem()]);
    const user = userEvent.setup();
    renderCheckout();

    await user.click(screen.getByRole("button", { name: /transferencia/i }));

    expect(screen.getByRole("button", { name: /confirmar pedido/i })).toBeEnabled();
  });
});

// ─── Confirmación exitosa ────────────────────────────────────────────────────

describe("CheckoutPage — confirmación", () => {
  it("crea el pedido, vacía el carrito y muestra la pantalla de éxito", async () => {
    mockCart([makeItem({ productId: 1, quantity: 2 })]);
    let receivedBody: unknown = null;
    server.use(
      http.post("/api/orders", async ({ request }) => {
        receivedBody = await request.json();
        return HttpResponse.json(makeOrder());
      })
    );

    const user = userEvent.setup();
    renderCheckout();

    await user.click(screen.getByRole("button", { name: /transferencia/i }));
    await user.click(screen.getByRole("button", { name: /confirmar pedido/i }));

    expect(await screen.findByText("N.º 00042")).toBeInTheDocument();
    expect(clear).toHaveBeenCalledTimes(1);
    expect(receivedBody).toMatchObject({
      payment_method: "Transferencia",
      items: [{ product_id: 1, quantity: 2 }],
    });
  });

  it("muestra el mensaje de error del servidor si la creación falla", async () => {
    mockCart([makeItem()]);
    server.use(
      http.post("/api/orders", () =>
        HttpResponse.json({ detail: "Sin stock suficiente" }, { status: 400 })
      )
    );

    const user = userEvent.setup();
    renderCheckout();

    await user.click(screen.getByRole("button", { name: /transferencia/i }));
    await user.click(screen.getByRole("button", { name: /confirmar pedido/i }));

    expect(await screen.findByText("Sin stock suficiente")).toBeInTheDocument();
    expect(clear).not.toHaveBeenCalled();
  });
});
