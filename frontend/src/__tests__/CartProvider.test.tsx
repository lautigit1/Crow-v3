import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { CartProvider, useCart } from "@/app/providers/CartProvider";
import type { Product } from "@/entities/product";

// ─── Mock de useAuth ─────────────────────────────────────────────────────────
// CartProvider solo necesita `user` y `loading` de useAuth para decidir en qué
// bucket de localStorage vive el carrito -- mockearlo evita tener que montar
// un AuthProvider real + MSW solo para esto, y permite controlar la secuencia
// login/logout paso a paso.

const mockUseAuth = vi.fn();
vi.mock("@/entities/session", () => ({
  useAuth: () => mockUseAuth(),
}));

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

function Harness({ product }: { product: Product }) {
  const cart = useCart();
  return (
    <div>
      <div data-testid="count">{cart.count}</div>
      <div data-testid="subtotal">{cart.subtotal}</div>
      <div data-testid="items">
        {cart.items.map((i) => `${i.productId}:${i.quantity}`).join(",")}
      </div>
      <button onClick={() => cart.addItem(product)}>add-1</button>
      <button onClick={() => cart.addItem(product, 3)}>add-3</button>
      <button onClick={() => cart.removeItem(product.id)}>remove</button>
      <button onClick={() => cart.setQuantity(product.id, 0)}>set-0</button>
      <button onClick={() => cart.setQuantity(product.id, 2)}>set-2</button>
      <button onClick={() => cart.clear()}>clear</button>
    </div>
  );
}

function renderCart(product = makeProduct()) {
  return render(
    <CartProvider>
      <Harness product={product} />
    </CartProvider>
  );
}

async function click(name: string) {
  await act(async () => {
    screen.getByRole("button", { name }).click();
  });
}

beforeEach(() => {
  localStorage.clear();
  mockUseAuth.mockReturnValue({ user: null, loading: false });
});

// ─── Agregar / cantidad / stock ──────────────────────────────────────────────

describe("CartProvider — addItem", () => {
  it("agrega un producto nuevo con cantidad 1 por default", async () => {
    renderCart(makeProduct({ id: 1, stock: 5 }));
    await click("add-1");
    expect(screen.getByTestId("count")).toHaveTextContent("1");
    expect(screen.getByTestId("items")).toHaveTextContent("1:1");
  });

  it("suma cantidades si el producto ya está en el carrito", async () => {
    renderCart(makeProduct({ id: 1, stock: 5 }));
    await click("add-1");
    await click("add-1");
    expect(screen.getByTestId("items")).toHaveTextContent("1:2");
    expect(screen.getByTestId("count")).toHaveTextContent("2");
  });

  it("no supera el stock disponible", async () => {
    renderCart(makeProduct({ id: 1, stock: 2 }));
    await click("add-3"); // pide 3, pero el stock es 2
    expect(screen.getByTestId("items")).toHaveTextContent("1:2");
  });

  it("no agrega nada si el producto no tiene stock", async () => {
    renderCart(makeProduct({ id: 1, stock: 0 }));
    await click("add-1");
    expect(screen.getByTestId("count")).toHaveTextContent("0");
    expect(screen.getByTestId("items")).toHaveTextContent("");
  });
});

// ─── Cantidad / remover / limpiar ────────────────────────────────────────────

describe("CartProvider — setQuantity / removeItem / clear", () => {
  it("setQuantity a 0 elimina el item", async () => {
    renderCart(makeProduct({ id: 1, stock: 5 }));
    await click("add-1");
    await click("set-0");
    expect(screen.getByTestId("items")).toHaveTextContent("");
  });

  it("setQuantity actualiza la cantidad directamente", async () => {
    renderCart(makeProduct({ id: 1, stock: 5 }));
    await click("add-1");
    await click("set-2");
    expect(screen.getByTestId("items")).toHaveTextContent("1:2");
  });

  it("removeItem saca el producto del carrito", async () => {
    renderCart(makeProduct({ id: 1, stock: 5 }));
    await click("add-1");
    await click("remove");
    expect(screen.getByTestId("items")).toHaveTextContent("");
  });

  it("clear vacía todo el carrito", async () => {
    renderCart(makeProduct({ id: 1, stock: 5 }));
    await click("add-3");
    await click("clear");
    expect(screen.getByTestId("count")).toHaveTextContent("0");
  });
});

// ─── Subtotal ─────────────────────────────────────────────────────────────────

describe("CartProvider — subtotal", () => {
  it("multiplica precio por cantidad", async () => {
    renderCart(makeProduct({ id: 1, stock: 5, price: 1000 }));
    await click("add-3");
    expect(screen.getByTestId("subtotal")).toHaveTextContent("3000");
  });

  it("trata precio null como 0", async () => {
    renderCart(makeProduct({ id: 1, stock: 5, price: null }));
    await click("add-1");
    expect(screen.getByTestId("subtotal")).toHaveTextContent("0");
  });
});

// ─── Persistencia en localStorage ────────────────────────────────────────────

describe("CartProvider — persistencia", () => {
  it("guarda el carrito de invitado bajo su propia clave", async () => {
    renderCart(makeProduct({ id: 1, stock: 5 }));
    await click("add-1");
    const raw = localStorage.getItem("crow_cart_guest_v1");
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw!)).toHaveLength(1);
  });
});

// ─── Reconciliación login / logout ──────────────────────────────────────────

describe("CartProvider — reconciliación de sesión", () => {
  it("al loguearse, fusiona el carrito de invitado con el guardado del usuario", async () => {
    // Arranca como invitado y agrega un item
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    const { rerender } = renderCart(makeProduct({ id: 1, stock: 5 }));
    await click("add-1");
    expect(screen.getByTestId("items")).toHaveTextContent("1:1");

    // El usuario ya tenía guardado otro producto en su propio bucket
    localStorage.setItem(
      "crow_cart_user_7_v1",
      JSON.stringify([{ productId: 2, quantity: 1, name: "Otro", sku: "X", price: 500, imageUrl: null, stock: 5 }])
    );

    // Login
    mockUseAuth.mockReturnValue({ user: { id: 7 }, loading: false });
    await act(async () => {
      rerender(
        <CartProvider>
          <Harness product={makeProduct({ id: 1, stock: 5 })} />
        </CartProvider>
      );
    });

    const itemsText = screen.getByTestId("items").textContent ?? "";
    expect(itemsText).toContain("1:1"); // lo que traía de invitado
    expect(itemsText).toContain("2:1"); // lo que ya tenía guardado el usuario
    expect(localStorage.getItem("crow_cart_guest_v1")).toBeNull();
  });

  it("al desloguearse, el carrito en pantalla se vacía", async () => {
    mockUseAuth.mockReturnValue({ user: { id: 7 }, loading: false });
    const { rerender } = renderCart(makeProduct({ id: 1, stock: 5 }));
    await click("add-1");
    expect(screen.getByTestId("items")).toHaveTextContent("1:1");

    mockUseAuth.mockReturnValue({ user: null, loading: false });
    await act(async () => {
      rerender(
        <CartProvider>
          <Harness product={makeProduct({ id: 1, stock: 5 })} />
        </CartProvider>
      );
    });

    expect(screen.getByTestId("items")).toHaveTextContent("");
  });

  it("no reconcilia nada mientras el estado de auth sigue cargando", async () => {
    mockUseAuth.mockReturnValue({ user: null, loading: true });
    renderCart(makeProduct({ id: 1, stock: 5 }));
    // Sin add-1 todavía -- solo confirma que no explota ni marca reconciliado
    expect(screen.getByTestId("count")).toHaveTextContent("0");
  });
});
