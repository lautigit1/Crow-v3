import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ImportReviewGrid } from "@/pages/admin/ui/ImportReviewGrid";
import type { ImportBatch, ImportLine } from "@/entities/import";

/**
 * La grilla de revisión es la pieza de la que depende que una factura entre
 * bien o mal al inventario. El backend ya valida todo lo importante (hay 175
 * tests allá), así que acá se prueba lo que el backend NO puede garantizar:
 * que la interfaz le muestre al usuario el estado correcto antes de que
 * apriete confirmar.
 *
 * Se mockea `importApi` en vez de usar MSW porque lo que importa es el
 * cableado de la UI -- qué se manda al editar una celda, qué se muestra
 * según el estado del lote -- y no el contrato HTTP, que ya está cubierto.
 */

const mockUpdateLine = vi.fn();
const mockDeleteLine = vi.fn();
const mockAddLine = vi.fn();
const mockUpdateBatch = vi.fn();

vi.mock("@/entities/import", async () => {
  const actual = await vi.importActual<typeof import("@/entities/import")>("@/entities/import");
  return {
    ...actual,
    importApi: {
      updateLine: (...args: unknown[]) => mockUpdateLine(...args),
      deleteLine: (...args: unknown[]) => mockDeleteLine(...args),
      addLine: (...args: unknown[]) => mockAddLine(...args),
      updateBatch: (...args: unknown[]) => mockUpdateBatch(...args),
    },
  };
});

function linea(over: Partial<ImportLine> = {}): ImportLine {
  return {
    id: 1, row_number: 7, sku: "FRE-100", name: "Pastillas de freno",
    quantity: 4, unit_cost: 2500, resolution: "Producto nuevo",
    product_id: null, subtotal: 10000, is_auto: false, ...over,
  };
}

function lote(over: Partial<ImportBatch> = {}): ImportBatch {
  return {
    id: 10, supplier_id: 1, supplier_name: "DistriAutos", filename: "factura.xlsx",
    declared_total: 10000, status: "Borrador", notes: null,
    created_at: "2026-07-27T10:00:00Z", confirmed_at: null,
    lines: [linea()], lines_total: 10000, totals_match: true, has_file: true, ...over,
  };
}

beforeEach(() => vi.clearAllMocks());

describe("ImportReviewGrid — control cruzado de totales", () => {
  it("avisa en verde cuando la suma de las líneas da el total de la factura", () => {
    render(<ImportReviewGrid batch={lote()} onChange={vi.fn()} />);
    expect(screen.getByText("El total coincide")).toBeInTheDocument();
  });

  it("avisa cuando no coincide", () => {
    render(<ImportReviewGrid batch={lote({ totals_match: false, declared_total: 99999 })} onChange={vi.fn()} />);
    expect(screen.getByText("El total no coincide")).toBeInTheDocument();
  });

  it("muestra los dos números para que se vea dónde está la diferencia", () => {
    render(<ImportReviewGrid batch={lote({ totals_match: false, lines_total: 8000, declared_total: 10000 })} onChange={vi.fn()} />);
    // Decir solo "no coincide" obligaría a ir a buscar los números a otro lado.
    expect(screen.getByText(/Suma de las líneas/)).toBeInTheDocument();
    expect(screen.getByText(/Factura/)).toBeInTheDocument();
  });
});

describe("ImportReviewGrid — avisos que dirigen la atención", () => {
  it("explica qué hacer con un conflicto de SKU", () => {
    render(<ImportReviewGrid batch={lote({ lines: [linea({ resolution: "Conflicto de SKU" })] })} onChange={vi.fn()} />);
    // No alcanza con marcar la fila: hay que decir cuáles son las dos salidas.
    expect(screen.getByText(/1 línea con conflicto de SKU/)).toBeInTheDocument();
    expect(screen.getByText(/cambiale el código/)).toBeInTheDocument();
  });

  it("advierte sobre las líneas leídas automáticamente del PDF", () => {
    render(<ImportReviewGrid batch={lote({ lines: [linea({ is_auto: true })] })} onChange={vi.fn()} />);
    expect(screen.getByText(/leída automáticamente del PDF/)).toBeInTheDocument();
  });

  it("no muestra el aviso de automáticas cuando las líneas fueron tipeadas", () => {
    render(<ImportReviewGrid batch={lote()} onChange={vi.fn()} />);
    expect(screen.queryByText(/automáticamente del PDF/)).not.toBeInTheDocument();
  });
});

describe("ImportReviewGrid — edición", () => {
  it("guarda el SKU al salir del campo, no en cada tecla", async () => {
    const user = userEvent.setup();
    mockUpdateLine.mockResolvedValue(lote());
    render(<ImportReviewGrid batch={lote()} onChange={vi.fn()} />);

    const campo = screen.getByDisplayValue("FRE-100");
    await user.clear(campo);
    await user.type(campo, "NUEVO-1");
    // Todavía no: cada guardado devuelve el lote recalculado, y hacerlo por
    // pulsación saturaría el backend y haría saltar el total mientras se escribe.
    expect(mockUpdateLine).not.toHaveBeenCalled();

    await user.tab();
    await waitFor(() => expect(mockUpdateLine).toHaveBeenCalledWith(10, 1, { sku: "NUEVO-1" }));
  });

  it("permite ignorar una línea", async () => {
    const user = userEvent.setup();
    mockUpdateLine.mockResolvedValue(lote());
    render(<ImportReviewGrid batch={lote()} onChange={vi.fn()} />);

    await user.selectOptions(screen.getByRole("combobox"), "IGNORAR");
    await waitFor(() =>
      expect(mockUpdateLine).toHaveBeenCalledWith(10, 1, expect.objectContaining({ resolution: "IGNORAR" }))
    );
  });

  it("borra una línea", async () => {
    const user = userEvent.setup();
    mockDeleteLine.mockResolvedValue(lote({ lines: [] }));
    render(<ImportReviewGrid batch={lote()} onChange={vi.fn()} />);

    await user.click(screen.getByLabelText("Borrar línea"));
    await waitFor(() => expect(mockDeleteLine).toHaveBeenCalledWith(10, 1));
  });

  it("agrega una línea a mano", async () => {
    const user = userEvent.setup();
    mockAddLine.mockResolvedValue(lote());
    render(<ImportReviewGrid batch={lote({ lines: [] })} onChange={vi.fn()} />);

    await user.type(screen.getByPlaceholderText("Código"), "MAN-1");
    await user.type(screen.getByPlaceholderText("Descripción"), "A mano");
    await user.type(screen.getByPlaceholderText("Cant."), "3");
    await user.type(screen.getByPlaceholderText("Costo unit."), "150");
    await user.click(screen.getByRole("button", { name: /Agregar/ }));

    await waitFor(() =>
      expect(mockAddLine).toHaveBeenCalledWith(10, { sku: "MAN-1", name: "A mano", quantity: 3, unit_cost: 150 })
    );
  });

  it("no deja agregar una línea incompleta", async () => {
    const user = userEvent.setup();
    render(<ImportReviewGrid batch={lote({ lines: [] })} onChange={vi.fn()} />);

    await user.type(screen.getByPlaceholderText("Código"), "MAN-1");
    expect(screen.getByRole("button", { name: /Agregar/ })).toBeDisabled();
  });
});

describe("ImportReviewGrid — lote ya confirmado", () => {
  const confirmado = lote({ status: "Confirmado" });

  it("no permite editar las celdas", () => {
    render(<ImportReviewGrid batch={confirmado} onChange={vi.fn()} />);
    expect(screen.queryByDisplayValue("FRE-100")).not.toBeInTheDocument();
    expect(screen.getByText("FRE-100")).toBeInTheDocument();
  });

  it("no ofrece agregar líneas", () => {
    render(<ImportReviewGrid batch={confirmado} onChange={vi.fn()} />);
    expect(screen.queryByText("Agregar línea a mano")).not.toBeInTheDocument();
  });
});
