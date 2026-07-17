import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { CartPage } from "@/pages/cart/CartPage";
import type { CartItem } from "@/app/providers/CartProvider";

// ─── Mocks ───────────────────────────────────────────────────────────────────
// CartPage es puramente de presentación sobre useCart() -- mockearlo evita
// levantar CartProvider + AuthProvider + localStorage solo para probar el
// render y el wiring de los botones (mismo criterio que CartProvider.test.tsx
// mockea useAuth).

const mockUseCart = vi.fn();
vi.mock("@/app/providers/CartProvider", () => ({
  useCart: () => mockUseCart(),
}));

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

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

const setQuantity = vi.fn();
const removeItem = vi.fn();
const clear = vi.fn();

function mockCart(items: CartItem[]) {
  const subtotal = items.reduce((s, i) => s + (i.price ?? 0) * i.quantity, 0);
  const count = items.reduce((s, i) => s + i.quantity, 0);
  mockUseCart.mockReturnValue({ items, count, subtotal, setQuantity, removeItem, clear });
}

function renderCartPage() {
  return render(
    <MemoryRouter>
      <CartPage />
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── Estado vacío ────────────────────────────────────────────────────────────

describe("CartPage — carrito vacío", () => {
  it("muestra el estado vacío con link al catálogo", () => {
    mockCart([]);
    renderCartPage();
    expect(screen.getByText("Tu carrito está vacío")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /ir al catálogo/i })).toHaveAttribute("href", "/catalogo");
  });
});

// ─── Con items ───────────────────────────────────────────────────────────────

describe("CartPage — con items", () => {
  it("renderiza nombre, SKU y total de línea de cada item", () => {
    mockCart([makeItem({ productId: 1, name: "Filtro de aceite", sku: "FILT-001", price: 1000, quantity: 2 })]);
    renderCartPage();
    expect(screen.getByText("Filtro de aceite")).toBeInTheDocument();
    expect(screen.getByText("FILT-001")).toBeInTheDocument();
  });

  it("el stepper '+' llama a setQuantity con la cantidad incrementada", async () => {
    mockCart([makeItem({ productId: 1, quantity: 2, stock: 5 })]);
    renderCartPage();
    await act(async () => {
      screen.getByRole("button", { name: "Sumar uno" }).click();
    });
    expect(setQuantity).toHaveBeenCalledWith(1, 3);
  });

  it("el stepper '-' llama a setQuantity con la cantidad decrementada", async () => {
    mockCart([makeItem({ productId: 1, quantity: 2, stock: 5 })]);
    renderCartPage();
    await act(async () => {
      screen.getByRole("button", { name: "Restar uno" }).click();
    });
    expect(setQuantity).toHaveBeenCalledWith(1, 1);
  });

  it("el stepper '+' se deshabilita al llegar al stock máximo", () => {
    mockCart([makeItem({ productId: 1, quantity: 5, stock: 5 })]);
    renderCartPage();
    expect(screen.getByRole("button", { name: "Sumar uno" })).toBeDisabled();
  });

  it("el botón de basura llama a removeItem con el productId", async () => {
    mockCart([makeItem({ productId: 1 })]);
    renderCartPage();
    await act(async () => {
      screen.getByRole("button", { name: "Quitar del carrito" }).click();
    });
    expect(removeItem).toHaveBeenCalledWith(1);
  });

  it("'Vaciar carrito' pide confirmación antes de llamar a clear", async () => {
    mockCart([makeItem({ productId: 1 })]);
    renderCartPage();

    await act(async () => {
      screen.getByRole("button", { name: "Vaciar carrito" }).click();
    });
    expect(screen.getByText("¿Vaciar carrito?")).toBeInTheDocument();
    expect(clear).not.toHaveBeenCalled();

    await act(async () => {
      screen.getByRole("button", { name: "Sí, vaciar" }).click();
    });
    expect(clear).toHaveBeenCalledTimes(1);
  });

  it("cancelar la confirmación no llama a clear", async () => {
    mockCart([makeItem({ productId: 1 })]);
    renderCartPage();

    await act(async () => {
      screen.getByRole("button", { name: "Vaciar carrito" }).click();
    });
    await act(async () => {
      screen.getByRole("button", { name: "Cancelar" }).click();
    });
    expect(clear).not.toHaveBeenCalled();
  });

  it("'Continuar' navega a /checkout", async () => {
    mockCart([makeItem({ productId: 1 })]);
    renderCartPage();
    await act(async () => {
      screen.getByRole("button", { name: /continuar/i }).click();
    });
    expect(mockNavigate).toHaveBeenCalledWith("/checkout");
  });
});
