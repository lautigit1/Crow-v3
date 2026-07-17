import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Product } from "@/entities/product";
import { useAuth } from "@/entities/session";

const GUEST_KEY = "crow_cart_guest_v1";
const userKey = (userId: number) => `crow_cart_user_${userId}_v1`;

export type CartItem = {
  productId: number;
  quantity: number;
  name: string;
  sku: string;
  price: number | null;
  imageUrl: string | null;
  /** Snapshot del stock al momento de agregarlo -- solo acota el stepper de cantidad. */
  stock: number;
};

type CartContextValue = {
  items: CartItem[];
  count: number;
  subtotal: number;
  addItem: (product: Product, quantity?: number) => void;
  removeItem: (productId: number) => void;
  setQuantity: (productId: number, quantity: number) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

function loadFromStorage(key: string): CartItem[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveToStorage(key: string, items: CartItem[]) {
  try {
    localStorage.setItem(key, JSON.stringify(items));
  } catch {
    // localStorage lleno o deshabilitado -- el carrito sigue funcionando en memoria
  }
}

/** Suma cantidades de productos repetidos (cap por stock del item entrante). */
function mergeItems(base: CartItem[], extra: CartItem[]): CartItem[] {
  const merged = [...base];
  for (const item of extra) {
    const idx = merged.findIndex((i) => i.productId === item.productId);
    if (idx === -1) {
      merged.push(item);
    } else {
      const cap = Math.max(item.stock, merged[idx].quantity);
      merged[idx] = { ...merged[idx], quantity: Math.min(merged[idx].quantity + item.quantity, cap) };
    }
  }
  return merged;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [items, setItems] = useState<CartItem[]>(() => loadFromStorage(GUEST_KEY));

  // Clave de storage activa: mientras se navega sin sesión el carrito vive
  // en el bucket de invitado; al loguearse pasa a vivir en el bucket propio
  // del usuario, para que sobreviva a un logout y reaparezca en el próximo
  // login. `undefined` = todavía no resolvimos si hay sesión o no.
  const activeKeyRef = useRef<string>(GUEST_KEY);
  const reconciledUserIdRef = useRef<number | null | undefined>(undefined);

  useEffect(() => {
    if (authLoading) return;
    const currentUserId = user?.id ?? null;
    const prev = reconciledUserIdRef.current;
    if (prev === currentUserId) return;

    if (currentUserId != null) {
      // Login (incluye sesión restaurada por cookie al abrir la app):
      // se restaura el carrito guardado de ese usuario y se le suman
      // los items sueltos que hubiera en el carrito de invitado.
      setItems((current) => {
        const savedUserCart = loadFromStorage(userKey(currentUserId));
        const merged = mergeItems(savedUserCart, current);
        saveToStorage(userKey(currentUserId), merged);
        return merged;
      });
      localStorage.removeItem(GUEST_KEY);
      activeKeyRef.current = userKey(currentUserId);
    } else if (prev != null) {
      // Logout explícito: el carrito se vacía en pantalla. Los datos del
      // usuario que cerró sesión ya quedaron guardados bajo su propia
      // clave (se persisten en cada cambio) y van a reaparecer si vuelve
      // a loguearse.
      localStorage.removeItem(GUEST_KEY);
      activeKeyRef.current = GUEST_KEY;
      setItems([]);
    } else {
      // Primera resolución de sesión y sigue anónimo -- nada que reconciliar.
      activeKeyRef.current = GUEST_KEY;
    }

    reconciledUserIdRef.current = currentUserId;
  }, [authLoading, user?.id]);

  useEffect(() => {
    saveToStorage(activeKeyRef.current, items);
  }, [items]);

  const addItem = useCallback((product: Product, quantity = 1) => {
    if (product.stock <= 0) return; // sin stock -- no se puede agregar
    setItems((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      const cap = product.stock;
      if (existing) {
        const nextQty = Math.min(existing.quantity + quantity, cap);
        return prev.map((i) => (i.productId === product.id ? { ...i, quantity: nextQty } : i));
      }
      return [
        ...prev,
        {
          productId: product.id,
          quantity: Math.min(quantity, cap),
          name: product.name,
          sku: product.sku,
          price: product.price,
          imageUrl: product.image_url,
          stock: product.stock,
        },
      ];
    });
  }, []);

  const removeItem = useCallback((productId: number) => {
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  }, []);

  const setQuantity = useCallback((productId: number, quantity: number) => {
    setItems((prev) => {
      if (quantity < 1) return prev.filter((i) => i.productId !== productId);
      return prev.map((i) => (i.productId === productId ? { ...i, quantity } : i));
    });
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const value = useMemo<CartContextValue>(() => {
    const count = items.reduce((acc, i) => acc + i.quantity, 0);
    const subtotal = items.reduce((acc, i) => acc + (i.price ?? 0) * i.quantity, 0);
    return { items, count, subtotal, addItem, removeItem, setQuantity, clear };
  }, [items, addItem, removeItem, setQuantity, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart debe usarse dentro de <CartProvider>");
  return ctx;
}
