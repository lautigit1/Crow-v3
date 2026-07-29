import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AdminOrdersPage } from "@/pages/admin/AdminOrdersPage";
import type { AdminOrder } from "@/entities/order";

/**
 * Lo que se prueba acá es lo que el backend no puede garantizar: que el admin
 * vea el estado correcto y que los dos ejes -- entrega y cobro -- se muevan de
 * forma independiente desde la interfaz.
 *
 * Se mockea `orderApi` en vez de usar MSW, mismo criterio que
 * AdminProductsPage.test.tsx: importa el cableado de la UI, no el contrato
 * HTTP, que ya está cubierto por los 381 tests de backend.
 */

const mockListAll = vi.fn();
const mockUpdateStatus = vi.fn();

vi.mock("@/entities/order", async () => {
  const actual = await vi.importActual<typeof import("@/entities/order")>("@/entities/order");
  return {
    ...actual,
    orderApi: {
      listAll: (...args: unknown[]) => mockListAll(...args),
      updateStatus: (...args: unknown[]) => mockUpdateStatus(...args),
    },
  };
});

function pedido(over: Partial<AdminOrder> = {}): AdminOrder {
  return {
    id: 12,
    user_id: 3,
    status: "Pendiente",
    payment_status: "Sin cobrar",
    notes: null,
    admin_notes: null,
    payment_method: "Transferencia",
    items: [
      {
        id: 1, product_id: 5, sku_snapshot: "FILT-001",
        name_snapshot: "Filtro de aceite", unit_price_snapshot: 1500, quantity: 2,
      },
    ],
    created_at: "2026-07-20T14:00:00Z",
    updated_at: "2026-07-20T14:00:00Z",
    customer_name: "Juan Pérez",
    customer_email: "juan@test.com",
    customer_phone: "2616600569",
    total: 3000,
    items_sin_precio: 0,
    ...over,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockListAll.mockResolvedValue({ items: [pedido()], total: 1 });
});

// ─── Lista ───────────────────────────────────────────────────────────────────

describe("AdminOrdersPage — lista", () => {
  it("muestra el cliente y los dos estados por separado", async () => {
    render(<AdminOrdersPage />);
    const fila = (await screen.findByText("Juan Pérez")).closest("tr")!;
    // Acotado a la fila a propósito: "Pendiente" y "Sin cobrar" también
    // existen como <option> en los selects de filtro, y un getByText suelto
    // encontraría más de un nodo y fallaría por ambigüedad.
    expect(within(fila).getByText("Pendiente")).toBeInTheDocument();
    expect(within(fila).getByText("Sin cobrar")).toBeInTheDocument();
  });

  it("avisa cuando el total deja líneas afuera", async () => {
    mockListAll.mockResolvedValue({
      items: [pedido({ total: 3000, items_sin_precio: 2 })],
      total: 1,
    });
    render(<AdminOrdersPage />);
    // Sin este aviso el admin lee un número que parece el total del pedido
    // y no lo es: los productos "Consultar precio" no suman.
    expect(await screen.findByText(/2 a consultar/)).toBeInTheDocument();
  });

  it("no muestra el aviso cuando todas las líneas tienen precio", async () => {
    render(<AdminOrdersPage />);
    await screen.findByText("Juan Pérez");
    expect(screen.queryByText(/a consultar/)).not.toBeInTheDocument();
  });
});

// ─── Filtros ─────────────────────────────────────────────────────────────────

describe("AdminOrdersPage — filtros", () => {
  it("filtra por estado de entrega contra el servidor", async () => {
    const user = userEvent.setup();
    render(<AdminOrdersPage />);
    await screen.findByText("Juan Pérez");
    mockListAll.mockClear();

    await user.selectOptions(screen.getByLabelText("Filtrar por entrega"), "Enviado");

    await waitFor(() =>
      expect(mockListAll).toHaveBeenCalledWith(expect.objectContaining({ status: "Enviado" }))
    );
  });

  it("filtra por estado de cobro", async () => {
    const user = userEvent.setup();
    render(<AdminOrdersPage />);
    await screen.findByText("Juan Pérez");
    mockListAll.mockClear();

    await user.selectOptions(screen.getByLabelText("Filtrar por cobro"), "Pagado");

    await waitFor(() =>
      expect(mockListAll).toHaveBeenCalledWith(expect.objectContaining({ payment_status: "Pagado" }))
    );
  });

  it("busca con debounce, no en cada tecla", async () => {
    const user = userEvent.setup();
    render(<AdminOrdersPage />);
    await screen.findByText("Juan Pérez");
    mockListAll.mockClear();

    await user.type(screen.getByLabelText("Buscar pedidos"), "juan");

    // Cada consulta hace JOIN contra users; una por tecla es innecesario.
    expect(mockListAll).not.toHaveBeenCalled();
    await waitFor(
      () => expect(mockListAll).toHaveBeenCalledWith(expect.objectContaining({ q: "juan" })),
      { timeout: 1500 }
    );
  });
});

// ─── Ficha ───────────────────────────────────────────────────────────────────

describe("AdminOrdersPage — ficha del pedido", () => {
  const abrir = async () => {
    const user = userEvent.setup();
    render(<AdminOrdersPage />);
    await screen.findByText("Juan Pérez");
    await user.click(screen.getByRole("button", { name: "Gestionar" }));
    return user;
  };

  it("muestra los ítems con el snapshot del precio", async () => {
    await abrir();
    expect(await screen.findByText("Filtro de aceite")).toBeInTheDocument();
    expect(screen.getByText("FILT-001")).toBeInTheDocument();
  });

  it("manda los dos estados juntos al guardar", async () => {
    const user = await abrir();
    mockUpdateStatus.mockResolvedValue(pedido({ status: "Confirmado", payment_status: "Pagado" }));

    // Por etiqueta y no navegando el DOM del Drawer: los selects de la ficha
    // se llaman "Entrega" y "Cobro", los de los filtros "Filtrar por entrega"
    // y "Filtrar por cobro". getByLabelText hace match exacto, así que no se
    // pisan y no hace falta acotar el contenedor.
    await user.selectOptions(screen.getByLabelText("Entrega"), "Confirmado");
    await user.selectOptions(screen.getByLabelText("Cobro"), "Pagado");
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() =>
      expect(mockUpdateStatus).toHaveBeenCalledWith(12, "Confirmado", "", "Pagado")
    );
  });

  it("deja guardar solo cuando algo cambió", async () => {
    await abrir();
    expect(await screen.findByRole("button", { name: "Guardar cambios" })).toBeDisabled();
  });

  it("muestra el error del backend al reactivar un pedido cancelado", async () => {
    const user = await abrir();
    mockUpdateStatus.mockRejectedValue({
      response: { data: { detail: "No se puede reactivar un pedido cancelado — creá un pedido nuevo." } },
    });

    await user.selectOptions(screen.getByLabelText("Entrega"), "Enviado");
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/no se puede reactivar/i);
  });
});

// ─── Contacto ────────────────────────────────────────────────────────────────

describe("AdminOrdersPage — contacto", () => {
  it("ofrece WhatsApp al número del cliente", async () => {
    const user = userEvent.setup();
    render(<AdminOrdersPage />);
    await screen.findByText("Juan Pérez");
    await user.click(screen.getByRole("button", { name: "Gestionar" }));

    const wa = await screen.findByRole("link", { name: "WhatsApp" });
    // Al número DEL CLIENTE, no al del negocio.
    expect(wa).toHaveAttribute("href", expect.stringContaining("wa.me/5492616600569"));
  });

  it("cae al mail cuando el cliente no tiene teléfono", async () => {
    const user = userEvent.setup();
    mockListAll.mockResolvedValue({ items: [pedido({ customer_phone: null })], total: 1 });
    render(<AdminOrdersPage />);
    await screen.findByText("Juan Pérez");
    await user.click(screen.getByRole("button", { name: "Gestionar" }));

    // Nunca un botón de WhatsApp que no lleva a ningún lado.
    expect(screen.queryByRole("link", { name: "WhatsApp" })).not.toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "Copiar mail" })).toBeInTheDocument();
  });
});
