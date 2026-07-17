import type * as React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useFavorites } from "@/shared/lib/useFavorites";
import { FavoritesProvider } from "@/app/providers/FavoritesProvider";

// useFavorites ahora exige estar dentro de <FavoritesProvider> (Context
// compartido -- ver el comentario en FavoritesProvider.tsx). Cada
// renderHook necesita el wrapper.
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <FavoritesProvider>{children}</FavoritesProvider>
);

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockUseAuth = vi.fn();
vi.mock("@/entities/session", () => ({
  useAuth: () => mockUseAuth(),
}));

const mockList = vi.fn();
const mockAdd = vi.fn();
const mockRemove = vi.fn();
vi.mock("@/entities/favorite", () => ({
  favoriteApi: {
    list: (...args: unknown[]) => mockList(...args),
    add: (...args: unknown[]) => mockAdd(...args),
    remove: (...args: unknown[]) => mockRemove(...args),
  },
}));

const anonUser = { user: null };
const loggedUser = { user: { id: 1, email: "user@crow.com" } };

beforeEach(() => {
  vi.clearAllMocks();
  mockList.mockResolvedValue({ product_ids: [10, 20], total: 2 });
  mockAdd.mockResolvedValue(undefined);
  mockRemove.mockResolvedValue(undefined);
});

// ─── Sin sesión ──────────────────────────────────────────────────────────────

describe("useFavorites — sin sesión", () => {
  it("no llama a la API y deja ids vacío", async () => {
    mockUseAuth.mockReturnValue(anonUser);
    const { result } = renderHook(() => useFavorites(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.ids).toEqual([]);
    expect(mockList).not.toHaveBeenCalled();
  });

  it("toggle no hace nada sin sesión", async () => {
    mockUseAuth.mockReturnValue(anonUser);
    const { result } = renderHook(() => useFavorites(), { wrapper });
    await act(async () => {
      await result.current.toggle(10);
    });
    expect(mockAdd).not.toHaveBeenCalled();
    expect(mockRemove).not.toHaveBeenCalled();
    expect(result.current.ids).toEqual([]);
  });
});

// ─── Con sesión ──────────────────────────────────────────────────────────────

describe("useFavorites — con sesión", () => {
  it("carga los favoritos al montar", async () => {
    mockUseAuth.mockReturnValue(loggedUser);
    const { result } = renderHook(() => useFavorites(), { wrapper });
    await waitFor(() => expect(result.current.ids).toEqual([10, 20]));
    expect(mockList).toHaveBeenCalledTimes(1);
  });

  it("ids queda vacío si la API falla", async () => {
    mockUseAuth.mockReturnValue(loggedUser);
    mockList.mockRejectedValue(new Error("network"));
    const { result } = renderHook(() => useFavorites(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.ids).toEqual([]);
  });

  it("isFavorite refleja el estado actual", async () => {
    mockUseAuth.mockReturnValue(loggedUser);
    const { result } = renderHook(() => useFavorites(), { wrapper });
    await waitFor(() => expect(result.current.ids).toEqual([10, 20]));
    expect(result.current.isFavorite(10)).toBe(true);
    expect(result.current.isFavorite(99)).toBe(false);
  });

  it("toggle agrega un favorito nuevo (optimista) y llama a add", async () => {
    mockUseAuth.mockReturnValue(loggedUser);
    const { result } = renderHook(() => useFavorites(), { wrapper });
    await waitFor(() => expect(result.current.ids).toEqual([10, 20]));

    await act(async () => {
      await result.current.toggle(30);
    });

    expect(result.current.ids).toContain(30);
    expect(mockAdd).toHaveBeenCalledWith(30);
  });

  it("toggle quita un favorito existente y llama a remove", async () => {
    mockUseAuth.mockReturnValue(loggedUser);
    const { result } = renderHook(() => useFavorites(), { wrapper });
    await waitFor(() => expect(result.current.ids).toEqual([10, 20]));

    await act(async () => {
      await result.current.toggle(10);
    });

    expect(result.current.ids).not.toContain(10);
    expect(mockRemove).toHaveBeenCalledWith(10);
  });

  it("revierte el cambio optimista si add falla", async () => {
    mockUseAuth.mockReturnValue(loggedUser);
    mockAdd.mockRejectedValue(new Error("500"));
    const { result } = renderHook(() => useFavorites(), { wrapper });
    await waitFor(() => expect(result.current.ids).toEqual([10, 20]));

    await act(async () => {
      await result.current.toggle(30);
    });

    expect(result.current.ids).not.toContain(30); // se revirtió
  });

  it("revierte el cambio optimista si remove falla", async () => {
    mockUseAuth.mockReturnValue(loggedUser);
    mockRemove.mockRejectedValue(new Error("500"));
    const { result } = renderHook(() => useFavorites(), { wrapper });
    await waitFor(() => expect(result.current.ids).toEqual([10, 20]));

    await act(async () => {
      await result.current.toggle(10);
    });

    expect(result.current.ids).toContain(10); // se revirtió
  });

  it("refresh() vuelve a pedir la lista", async () => {
    mockUseAuth.mockReturnValue(loggedUser);
    const { result } = renderHook(() => useFavorites(), { wrapper });
    await waitFor(() => expect(mockList).toHaveBeenCalledTimes(1));

    await act(async () => {
      await result.current.refresh();
    });

    expect(mockList).toHaveBeenCalledTimes(2);
  });
});
