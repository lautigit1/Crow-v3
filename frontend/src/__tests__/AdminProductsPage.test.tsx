import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AdminProductsPage } from "@/pages/admin/AdminProductsPage";
import type { Product, ProductList } from "@/entities/product";

/**
 * AdminProductsPage es la página de admin más usada del panel (gestión del
 * catálogo). En vez de MSW, acá se mockean los módulos de entidad
 * directamente (mismo criterio que useFavorites.test.tsx) porque la página
 * dispara 4 llamadas independientes al montar (productos, categorías,
 * marcas, proveedores) y lo que importa probar es el wiring de la UI
 * (búsqueda, alta, borrado), no el contrato HTTP en sí -- eso ya lo cubren
 * los tests de backend.
 */

const mockList = vi.fn();
const mockListDeleted = vi.fn();
const mockCreate = vi.fn();
const mockUpdate = vi.fn();
const mockRemove = vi.fn();
const mockRestore = vi.fn();
vi.mock("@/entities/product", async () => {
  const actual = await vi.importActual<typeof import("@/entities/product")>("@/entities/product");
  return {
    ...actual,
    productApi: {
      list: (...args: unknown[]) => mockList(...args),
      listDeleted: (...args: unknown[]) => mockListDeleted(...args),
      create: (...args: unknown[]) => mockCreate(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
      remove: (...args: unknown[]) => mockRemove(...args),
      restore: (...args: unknown[]) => mockRestore(...args),
    },
  };
});

vi.mock("@/entities/category", async () => {
  const actual = await vi.importActual<typeof import("@/entities/category")>("@/entities/category");
  return { ...actual, categoryApi: { list: () => Promise.resolve([]) } };
});
vi.mock("@/entities/brand", async () => {
  const actual = await vi.importActual<typeof import("@/entities/brand")>("@/entities/brand");
  return { ...actual, brandApi: { list: () => Promise.resolve([]) } };
});
vi.mock("@/entities/supplier", async () => {
  const actual = await vi.importActual<typeof import("@/entities/supplier")>("@/entities/supplier");
  return { ...actual, supplierApi: { list: () => Promise.resolve({ items: [], total: 0 }) } };
});

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 1,
    name: "Filtro de aceite",
    sku: "FILT-001",
    description: null,
    price: 1000,
    stock: 5,
    image_url: null,
    vehicle_type: "Auto",
    is_featured: false,
    // Publicado en el catálogo (columna agregada en la migración 013).
    is_active: true,
    is_deleted: false,
    deleted_at: null,
    category_id: null,
    brand_id: null,
    supplier_id: null,
    category: null,
    brand: null,
    supplier: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function makeList(items: Product[]): ProductList {
  return { items, total: items.length };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockList.mockResolvedValue(makeList([makeProduct()]));
  mockListDeleted.mockResolvedValue(makeList([]));
});

// ─── Carga inicial ───────────────────────────────────────────────────────────

describe("AdminProductsPage — carga inicial", () => {
  it("renderiza los productos devueltos por la API con nombre y SKU", async () => {
    render(<AdminProductsPage />);
    expect(await screen.findByText("Filtro de aceite")).toBeInTheDocument();
    expect(screen.getByText("FILT-001")).toBeInTheDocument();
  });

  it("muestra el total en el subtítulo del header", async () => {
    mockList.mockResolvedValue(makeList([makeProduct({ id: 1 }), makeProduct({ id: 2, name: "Bujía NGK", sku: "BUJ-002" })]));
    render(<AdminProductsPage />);
    expect(await screen.findByText("2 productos en catálogo")).toBeInTheDocument();
  });
});

// ─── Búsqueda ────────────────────────────────────────────────────────────────

describe("AdminProductsPage — búsqueda", () => {
  it("filtra la lista pasando 'q' a productApi.list (debounced)", async () => {
    const user = userEvent.setup();
    render(<AdminProductsPage />);
    await screen.findByText("Filtro de aceite");
    mockList.mockClear();

    await user.type(screen.getByPlaceholderText("Buscar por nombre, SKU o descripción"), "bujia");

    await waitFor(
      () => expect(mockList).toHaveBeenCalledWith(expect.objectContaining({ q: "bujia" })),
      { timeout: 1000 }
    );
  });
});

// ─── Alta de producto ────────────────────────────────────────────────────────

describe("AdminProductsPage — alta", () => {
  it("crea un producto nuevo y recarga la lista", async () => {
    const user = userEvent.setup();
    mockCreate.mockResolvedValue(makeProduct({ id: 2, name: "Bujía NGK", sku: "BUJ-002" }));
    render(<AdminProductsPage />);
    await screen.findByText("Filtro de aceite");

    await user.click(screen.getByRole("button", { name: /nuevo producto/i }));
    await user.type(screen.getByPlaceholderText("Kit de frenos delanteros Gol G5"), "Bujía NGK");
    await user.type(screen.getByPlaceholderText("KIT-001"), "BUJ-002");

    mockList.mockResolvedValue(makeList([makeProduct(), makeProduct({ id: 2, name: "Bujía NGK", sku: "BUJ-002" })]));
    await user.click(screen.getByRole("button", { name: /guardar producto/i }));

    await waitFor(() =>
      expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ name: "Bujía NGK", sku: "BUJ-002" }))
    );
    // El modal se cierra tras guardar
    await waitFor(() => expect(screen.queryByText("NUEVO PRODUCTO")).not.toBeInTheDocument());
  });
});

// ─── Borrado ─────────────────────────────────────────────────────────────────

describe("AdminProductsPage — borrado", () => {
  it("pide confirmación y llama a productApi.remove al confirmar", async () => {
    const user = userEvent.setup();
    render(<AdminProductsPage />);
    await screen.findByText("Filtro de aceite");

    const row = screen.getByText("Filtro de aceite").closest("tr")!;
    // Por nombre accesible, no por descarte.
    //
    // Antes se buscaba "el botón de la fila que no dice editar", y eso se
    // rompió al agregar la columna Catálogo: su chip ("En catálogo" /
    // "Borrador") tampoco dice editar y viene ANTES en el DOM, así que el
    // descarte devolvía el chip y el test terminaba publicando el producto
    // en vez de abrir el modal de borrado.
    //
    // El botón de borrar es solo-ícono pero tiene aria-label, que es
    // justamente para lo que sirve: identificarlo sin depender de en qué
    // posición de la fila quedó.
    const deleteBtn = within(row).getByRole("button", { name: "Eliminar producto" });
    await user.click(deleteBtn);

    expect(await screen.findByText("¿Eliminar producto?")).toBeInTheDocument();
    expect(mockRemove).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Eliminar" }));

    await waitFor(() => expect(mockRemove).toHaveBeenCalledWith(1));
  });
});
