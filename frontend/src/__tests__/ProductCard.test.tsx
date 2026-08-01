import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { ProductCard } from "@/entities/product/ProductCard";
import type { Product } from "@/entities/product";

/**
 * La tarjeta del catálogo.
 *
 * Lo que se prueba acá no es el aspecto -- ningún test dice si algo quedó lindo
 * -- sino los **contratos que el rediseño no podía romper**: que el nombre siga
 * siendo un heading clickeable (así se entra a la ficha en cuatro specs de
 * E2E), que el favorito conserve su nombre accesible, y que las acciones que se
 * revelan al pasar el mouse sigan existiendo en el DOM cuando no se ven.
 */

const mockToggle = vi.fn();
let favoritos: number[] = [];

vi.mock("@/shared/lib/useFavorites", () => ({
  useFavorites: () => ({
    isFavorite: (id: number) => favoritos.includes(id),
    toggle: (id: number) => mockToggle(id),
  }),
}));

vi.mock("@/entities/settings/useSiteSettings", () => ({
  useWaLink: () => (texto?: string) =>
    texto ? `https://wa.me/5492610000000?text=${encodeURIComponent(texto)}` : "https://wa.me/5492610000000",
}));

function producto(over: Partial<Product> = {}): Product {
  return {
    id: 7,
    name: "Pastillas de freno delanteras",
    sku: "FRE-4412",
    description: null,
    price: 45000,
    stock: 12,
    image_url: null,
    vehicle_type: "Autos",
    is_featured: false,
    is_active: true,
    is_deleted: false,
    deleted_at: null,
    category_id: 1,
    brand_id: 2,
    supplier_id: null,
    category: { id: 1, name: "Frenos", slug: "frenos" } as Product["category"],
    brand: { id: 2, name: "Bosch", slug: "bosch" } as Product["brand"],
    supplier: null,
    created_at: "2026-07-20T14:00:00Z",
    updated_at: "2026-07-20T14:00:00Z",
    ...over,
  };
}

function montar(p: Product = producto(), onQuote = vi.fn()) {
  render(
    <MemoryRouter>
      <ProductCard product={p} onQuote={onQuote} />
    </MemoryRouter>,
  );
  return onQuote;
}

beforeEach(() => {
  vi.clearAllMocks();
  favoritos = [];
});

describe("Contratos que no se podían romper", () => {
  it("el nombre es un heading que lleva a la ficha", () => {
    montar();

    const titulo = screen.getByRole("heading", { name: "Pastillas de freno delanteras" });
    expect(titulo).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Pastillas de freno delanteras" })).toHaveAttribute(
      "href",
      "/producto/7",
    );
  });

  it("\"Ver ficha\" es un enlace de verdad", () => {
    // Al sacar el truco del enlace estirado quedó como un <span>: se veía como
    // botón y no llevaba a ningún lado.
    montar();

    expect(screen.getByRole("link", { name: /Ver ficha/ })).toHaveAttribute("href", "/producto/7");
  });

  it("el favorito conserva su nombre accesible en los dos estados", async () => {
    montar();
    expect(screen.getByRole("button", { name: "Agregar a favoritos" })).toBeInTheDocument();

    favoritos = [7];
    montar();
    expect(screen.getByRole("button", { name: "Quitar de favoritos" })).toBeInTheDocument();
  });

  it("marca y desmarca favorito", async () => {
    montar();

    await userEvent.click(screen.getByRole("button", { name: "Agregar a favoritos" }));

    expect(mockToggle).toHaveBeenCalledWith(7);
  });

  it("las acciones existen en el DOM aunque estén ocultas hasta el hover", () => {
    // Se ocultan con `opacity`, no desmontándolas: un botón desmontado no se
    // puede enfocar con el teclado ni encontrar desde un test, y hay un E2E que
    // quita un favorito desde la tarjeta de /cuenta/favoritos.
    montar();

    expect(screen.getByRole("button", { name: /Cotizar/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Consultar/ })).toBeInTheDocument();
  });

  it("cotizar avisa con el producto entero", async () => {
    const onQuote = montar();

    await userEvent.click(screen.getByRole("button", { name: /Cotizar/ }));

    expect(onQuote).toHaveBeenCalledWith(expect.objectContaining({ id: 7 }));
  });

  it("el link de WhatsApp lleva el nombre y el SKU", () => {
    montar();

    const href = screen.getByRole("link", { name: /Consultar/ }).getAttribute("href")!;
    expect(decodeURIComponent(href)).toContain("Pastillas de freno delanteras");
    expect(decodeURIComponent(href)).toContain("FRE-4412");
  });
});

describe("Stock", () => {
  it("muestra la cantidad real y no una etiqueta", () => {
    // "En stock" y "Últimas 2" eran dos textos para el mismo dato. El número
    // dice lo mismo con más precisión y menos tinta.
    montar(producto({ stock: 12 }));

    expect(screen.getByLabelText("12 en stock")).toHaveTextContent("12");
  });

  it("distingue el stock escaso", () => {
    montar(producto({ stock: 2 }));

    expect(screen.getByLabelText("2 en stock")).toBeInTheDocument();
  });

  it("sin stock lo dice, no muestra un cero suelto", () => {
    montar(producto({ stock: 0 }));

    expect(screen.getByLabelText("Sin stock")).toBeInTheDocument();
  });
});

describe("Datos", () => {
  it("junta marca y categoría en una línea", () => {
    montar();

    expect(screen.getByText("Bosch · Frenos")).toBeInTheDocument();
  });

  it("no deja una línea vacía cuando el producto no tiene marca ni categoría", () => {
    montar(producto({ brand: null, category: null }));

    expect(screen.getByRole("heading", { name: /Pastillas/ })).toBeInTheDocument();
    expect(screen.getByText("FRE-4412")).toBeInTheDocument();
  });

  it("un producto sin precio dice \"A consultar\", que no choca con el botón de WhatsApp", () => {
    // Decía "Consultar", igual que la píldora de WhatsApp: la misma palabra
    // dos veces en la misma tarjeta con dos significados distintos.
    montar(producto({ price: null }));

    expect(screen.getByText("A consultar")).toBeInTheDocument();
    expect(screen.getAllByText(/^Consultar$/)).toHaveLength(1);
  });

  it("el precio se parte para que el símbolo pese menos que la cifra", () => {
    // El `$` va en un span propio, más chico y gris: el ojo tiene que caer en
    // el número, no en el signo. Si alguien vuelve a juntarlos, esto lo avisa.
    montar();

    expect(screen.getByText("$")).toBeInTheDocument();
    expect(screen.getByText("45.000")).toBeInTheDocument();
  });
});
