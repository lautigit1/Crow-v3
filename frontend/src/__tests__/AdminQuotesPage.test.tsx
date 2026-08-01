import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { AdminQuotesPage } from "@/pages/admin/AdminQuotesPage";
import type { Quote, QuoteOption } from "@/entities/quote";

/**
 * La ficha de cotización: cargar la respuesta y convertirla en pedido.
 *
 * Lo que se prueba es lo que el backend no puede: que el botón de convertir
 * **diga por qué** está deshabilitado. Un botón gris sin explicación deja a la
 * persona adivinando, y uno de los tres casos -- la consulta anónima sin mail
 * -- ni siquiera se resuelve en esta pantalla.
 */

const mockListAll = vi.fn();
const mockAddOption = vi.fn();
const mockUpdateOption = vi.fn();
const mockDeleteOption = vi.fn();
const mockConvert = vi.fn();

vi.mock("@/entities/quote", async () => {
  const actual = await vi.importActual<typeof import("@/entities/quote")>("@/entities/quote");
  return {
    ...actual,
    quoteApi: {
      listAll: (...a: unknown[]) => mockListAll(...a),
      addOption: (...a: unknown[]) => mockAddOption(...a),
      updateOption: (...a: unknown[]) => mockUpdateOption(...a),
      deleteOption: (...a: unknown[]) => mockDeleteOption(...a),
      convert: (...a: unknown[]) => mockConvert(...a),
      setStatus: vi.fn(),
    },
  };
});

vi.mock("@/entities/settings/useSiteSettings", () => ({
  useWaLink: () => (msg: string) => `https://wa.me/5492610000000?text=${encodeURIComponent(msg)}`,
}));

function opcion(over: Partial<QuoteOption> = {}): QuoteOption {
  return {
    id: 1,
    title: "Original Bosch",
    detail: "Juego completo",
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
    status: "Nueva",
    user_id: null,
    product_id: null,
    created_at: "2026-07-20T14:00:00Z",
    answered_at: null,
    order_id: null,
    options: [],
    ...over,
  };
}

function montar() {
  return render(
    <MemoryRouter>
      <AdminQuotesPage />
    </MemoryRouter>,
  );
}

async function abrirFicha(q: Quote) {
  mockListAll.mockResolvedValue([q]);
  montar();
  await userEvent.click(await screen.findByRole("button", { name: `Abrir consulta ${q.id}` }));
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Lista", () => {
  it("muestra el precio más bajo cuando hay varias opciones", async () => {
    mockListAll.mockResolvedValue([
      cotizacion({
        options: [opcion({ id: 1, unit_price: 45000 }), opcion({ id: 2, unit_price: 28000 })],
      }),
    ]);
    montar();

    // El más bajo es el que el cliente va a mirar primero.
    expect(await screen.findByText(/28\.000/)).toBeInTheDocument();
    expect(screen.getByText(/2 opciones/)).toBeInTheDocument();
  });

  it("distingue una consulta sin responder", async () => {
    mockListAll.mockResolvedValue([cotizacion()]);
    montar();

    expect(await screen.findByText("Sin responder")).toBeInTheDocument();
  });

  it("muestra el pedido que salió de la cotización", async () => {
    mockListAll.mockResolvedValue([cotizacion({ order_id: 42, status: "Finalizada" })]);
    montar();

    expect(await screen.findByText(/pedido 00042/)).toBeInTheDocument();
  });
});

describe("Cargar opciones", () => {
  it("manda el alta con el plazo como texto libre", async () => {
    const conOpcion = cotizacion({ options: [opcion()], status: "Respondida" });
    mockAddOption.mockResolvedValue(conOpcion);
    await abrirFicha(cotizacion());

    await userEvent.type(screen.getByLabelText("Repuesto"), "Original Bosch");
    await userEvent.type(screen.getByLabelText("Precio unitario"), "45000");
    await userEvent.type(screen.getByLabelText("Plazo"), "depende del importador");
    await userEvent.click(screen.getByRole("button", { name: "Agregar opción" }));

    await waitFor(() => expect(mockAddOption).toHaveBeenCalled());
    expect(mockAddOption.mock.calls[0][1]).toMatchObject({
      title: "Original Bosch",
      unit_price: 45000,
      lead_time: "depende del importador",
    });
  });

  it("no deja guardar sin precio", async () => {
    await abrirFicha(cotizacion());

    await userEvent.type(screen.getByLabelText("Repuesto"), "Original Bosch");

    // El backend lo rechaza con un 422; acá se evita perder lo escrito.
    expect(screen.getByRole("button", { name: "Agregar opción" })).toBeDisabled();
  });

  it("avisa que la primera opción responde la cotización", async () => {
    await abrirFicha(cotizacion());

    expect(screen.getByText(/pasa a .Respondida. y le avisamos al cliente/)).toBeInTheDocument();
  });

  it("borrar no promete deshacer el aviso ya enviado", async () => {
    await abrirFicha(cotizacion({ options: [opcion()], status: "Respondida" }));

    await userEvent.click(screen.getByRole("button", { name: "Borrar Original Bosch" }));

    expect(screen.getByText(/sigue figurando como respondida/)).toBeInTheDocument();
  });
});

describe("Convertir en pedido", () => {
  it("explica que faltan opciones", async () => {
    await abrirFicha(cotizacion());

    expect(screen.getByRole("button", { name: "Convertir en pedido" })).toBeDisabled();
    expect(screen.getByText(/Cargá al menos una opción/)).toBeInTheDocument();
  });

  it("explica que falta elegir cuál aceptó el cliente", async () => {
    await abrirFicha(cotizacion({ options: [opcion(), opcion({ id: 2, title: "Alternativo" })] }));

    expect(screen.getByRole("button", { name: "Convertir en pedido" })).toBeDisabled();
    expect(screen.getByText(/Elegí cuál de las opciones/)).toBeInTheDocument();
  });

  it("explica el caso sin contacto, que no se arregla en esta pantalla", async () => {
    await abrirFicha(cotizacion({ customer_email: null, user_id: null, options: [opcion()] }));

    expect(screen.getByRole("button", { name: "Convertir en pedido" })).toBeDisabled();
    expect(screen.getByText(/Pedile el correo por WhatsApp/)).toBeInTheDocument();
  });

  it("convierte la opción elegida", async () => {
    mockConvert.mockResolvedValue({ id: 99, user_id: 3 });
    const q = cotizacion({ options: [opcion(), opcion({ id: 2, title: "Alternativo" })] });
    await abrirFicha(q);
    mockListAll.mockResolvedValue([{ ...q, order_id: 99, status: "Finalizada" }]);

    await userEvent.click(screen.getByLabelText("Elegir Alternativo"));
    await userEvent.click(screen.getByRole("button", { name: "Convertir en pedido" }));
    await userEvent.click(screen.getByRole("button", { name: "Convertir" }));

    await waitFor(() => expect(mockConvert).toHaveBeenCalledWith(7, 2));
  });

  it("avisa que se le va a crear una cuenta al cliente anónimo", async () => {
    await abrirFicha(cotizacion({ user_id: null, options: [opcion()] }));

    await userEvent.click(screen.getByLabelText("Elegir Original Bosch"));
    await userEvent.click(screen.getByRole("button", { name: "Convertir en pedido" }));

    expect(screen.getByText(/se le crea una cuenta a juan@test.com/)).toBeInTheDocument();
  });

  it("muestra el error del backend sin inventar uno propio", async () => {
    mockConvert.mockRejectedValue({
      response: { data: { detail: "Esta cotización ya generó el pedido N.º 00042." } },
    });
    await abrirFicha(cotizacion({ options: [opcion()] }));

    await userEvent.click(screen.getByLabelText("Elegir Original Bosch"));
    await userEvent.click(screen.getByRole("button", { name: "Convertir en pedido" }));
    await userEvent.click(screen.getByRole("button", { name: "Convertir" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("ya generó el pedido N.º 00042");
  });

  it("una cotización ya convertida no se vuelve a editar", async () => {
    await abrirFicha(cotizacion({ order_id: 42, status: "Finalizada", options: [opcion()] }));

    expect(screen.getByText("Convertida en el pedido N.º 00042")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver pedido" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Convertir en pedido" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Editar Original Bosch" })).not.toBeInTheDocument();
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
  });
});
