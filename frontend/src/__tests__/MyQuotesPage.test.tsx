import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { MyQuotesPage } from "@/pages/account/MyQuotesPage";
import type { Quote, QuoteOption } from "@/entities/quote";

/**
 * Lo que el cliente ve de su cotización.
 *
 * ⚠ Estos tests mockean la API, así que **no** habrían detectado el bug que
 * este change vino a arreglar: el bloque anterior leía `quote.admin_reply`, un
 * campo que el backend nunca devolvió, y un mock que lo incluya lo hace pasar
 * igual. Contra esa clase de mentira -- el tipo del front declarando un campo
 * que la API no manda -- lo único que protege es el E2E de la fase 4.
 */

const mockMine = vi.fn();

vi.mock("@/entities/quote", async () => {
  const actual = await vi.importActual<typeof import("@/entities/quote")>("@/entities/quote");
  return { ...actual, quoteApi: { mine: (...a: unknown[]) => mockMine(...a) } };
});

function opcion(over: Partial<QuoteOption> = {}): QuoteOption {
  return {
    id: 1,
    title: "Original Bosch",
    detail: null,
    unit_price: 45000,
    quantity: 1,
    lead_time: "3 a 5 días hábiles",
    created_at: "2026-07-20T14:00:00Z",
    ...over,
  };
}

function cotizacion(over: Partial<Quote> = {}): Quote {
  return {
    id: 7,
    customer_name: "Juan Pérez",
    customer_email: "juan@test.com",
    customer_phone: "2616600569",
    vehicle: "Gol G5 2012",
    message: "Pastillas de freno delanteras",
    status: "Respondida",
    user_id: 3,
    product_id: null,
    created_at: "2026-07-20T14:00:00Z",
    answered_at: "2026-07-21T10:00:00Z",
    order_id: null,
    options: [],
    ...over,
  };
}

function montar(quotes: Quote[]) {
  mockMine.mockResolvedValue({ items: quotes, total: quotes.length });
  return render(
    <MemoryRouter>
      <MyQuotesPage />
    </MemoryRouter>,
  );
}

beforeEach(() => vi.clearAllMocks());

describe("Respuesta a la cotización", () => {
  it("muestra precio y plazo de lo cotizado", async () => {
    montar([cotizacion({ options: [opcion()] })]);

    expect(await screen.findByText("Original Bosch")).toBeInTheDocument();
    expect(screen.getByText(/45\.000/)).toBeInTheDocument();
    expect(screen.getByText("3 a 5 días hábiles")).toBeInTheDocument();
  });

  it("cambia el encabezado cuando hay varias alternativas", async () => {
    montar([
      cotizacion({ options: [opcion(), opcion({ id: 2, title: "Alternativo", unit_price: 28000 })] }),
    ]);

    expect(await screen.findByText("Opciones que te ofrecemos")).toBeInTheDocument();
  });

  it("muestra el unitario solo cuando la cantidad es mayor a uno", async () => {
    // Con cantidad 1 el unitario y el total son el mismo número: repetirlo
    // hace dudar de si son dos cosas distintas.
    montar([cotizacion({ options: [opcion({ quantity: 1 })] })]);
    expect(await screen.findByText(/45\.000/)).toBeInTheDocument();
    expect(screen.queryByText(/1 ×/)).not.toBeInTheDocument();
  });

  it("dice cómo confirmar, porque no hay botón de aceptar", async () => {
    montar([cotizacion({ options: [opcion()] })]);

    expect(await screen.findByText(/Escribinos por WhatsApp para confirmar/)).toBeInTheDocument();
  });

  it("no muestra nada de precios si todavía no se respondió", async () => {
    montar([cotizacion({ status: "Nueva", answered_at: null, options: [] })]);

    await screen.findByText("Pastillas de freno delanteras");
    expect(screen.queryByText("Lo que te cotizamos")).not.toBeInTheDocument();
  });
});

describe("Enlace al pedido", () => {
  it("lleva al pedido que salió de la cotización", async () => {
    montar([cotizacion({ order_id: 42, status: "Finalizada", options: [opcion()] })]);

    const enlace = await screen.findByRole("link", { name: /pedido N.º 00042/ });
    expect(enlace).toHaveAttribute("href", "/cuenta/pedidos");
  });

  it("ya convertida, deja de invitar a coordinar por WhatsApp", async () => {
    montar([cotizacion({ order_id: 42, status: "Finalizada", options: [opcion()] })]);

    await screen.findByRole("link", { name: /pedido N.º 00042/ });
    expect(screen.queryByText(/Escribinos por WhatsApp para confirmar/)).not.toBeInTheDocument();
  });
});
