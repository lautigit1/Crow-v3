# Design: cart-checkout-flow

## 1. `CartProvider` (`frontend/src/app/providers/CartProvider.tsx`, nuevo)

Mismo patrón que `AuthProvider`: Context + hook `useCart()`. Persistencia en
`localStorage` bajo la key `crow_cart_v1`. Se guarda un snapshot mínimo del
producto al momento de agregarlo (no se refetchea después — el carrito es
"provisional", como pidió el usuario).

```typescript
export type CartItem = {
  productId: number;
  quantity: number;
  name: string;
  sku: string;
  price: number | null;
  imageUrl: string | null;
  stock: number; // snapshot, solo para acotar el stepper de cantidad
};

type CartContextValue = {
  items: CartItem[];
  count: number;      // suma de quantities
  subtotal: number;   // suma de price*quantity (ignora price null)
  addItem: (product: Product, quantity?: number) => void;
  removeItem: (productId: number) => void;
  setQuantity: (productId: number, quantity: number) => void;
  clear: () => void;
};
```

- `addItem`: si el producto ya está en el carrito, suma la cantidad
  (capada a `product.stock` si `stock > 0`; si `stock === 0` -- "bajo
  pedido" -- no se capa). Si no está, lo agrega.
- Persistencia: `useEffect` que serializa `items` a `localStorage` en cada
  cambio; hidratación lazy en el `useState` inicial leyendo
  `localStorage.getItem("crow_cart_v1")` con `try/catch` (JSON corrupto no
  debe romper la carga de la app).
- No depende de `useAuth()` -- el carrito es 100% client-side y anónimo.

## 2. Ícono (`frontend/src/shared/ui/Icon.tsx`)

Se agrega `"cart"` a `IconName` y su path (carrito de compras, estilo
feather, mismo `viewBox="0 0 24 24"`):

```tsx
cart: (
  <>
    <circle cx="9" cy="21" r="1" />
    <circle cx="20" cy="21" r="1" />
    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
  </>
),
```

## 3. Navbar (`frontend/src/widgets/navbar/Navbar.tsx`)

Botón con ícono `cart` + badge (círculo con `count`, oculto si `count ===
0`), como link a `/carrito`. Se agrega:
- Desktop: al lado de `AccountMenu`.
- Mobile: dentro de `MobileMenu`, junto a los `NavItem`.

```tsx
function CartButton() {
  const { count } = useCart();
  return (
    <Link to="/carrito" style={{ position: "relative", ... }}>
      <Icon name="cart" size={18} />
      {count > 0 && <span style={{ /* badge */ }}>{count}</span>}
    </Link>
  );
}
```

## 4. `ProductDetailPage.tsx` — cantidad + acciones

Se agrega un stepper de cantidad (1..stock, o libre si `stock === 0`,
mismo criterio que "Bajo pedido") y dos botones nuevos junto a
Cotizar/WhatsApp:

```tsx
const [qty, setQty] = useState(1);
const { addItem } = useCart();
const navigate = useNavigate();

<QuantityStepper value={qty} max={inStock ? product.stock : 99} onChange={setQty} />

<Button variant="outline" onClick={() => addItem(product, qty)}>
  <Icon name="cart" size={15} /> Agregar al carrito
</Button>
<Button onClick={() => { addItem(product, qty); navigate("/checkout"); }}>
  Comprar ahora
</Button>
```

"Comprar ahora" agrega el ítem al carrito (mergea con lo que ya hubiera) y
navega directo a `/checkout` -- no salta el carrito lógicamente, solo el
paso de revisarlo primero.

## 5. `frontend/src/pages/cart/CartPage.tsx` (nuevo, ruta pública `/carrito`)

- Vacío: `EmptyState` con link a `/catalogo`.
- Con ítems: lista con thumbnail (`ProductImage`), nombre, SKU, precio
  unitario, stepper de cantidad, botón quitar (ícono `trash`), subtotal de
  la línea.
- Footer: subtotal total + botón "Vaciar carrito" (con `useConfirm`) +
  botón primario "Continuar" -> `navigate("/checkout")`.
- Nota aclaratoria: "El pago y la entrega se coordinan al confirmar el
  pedido" (mismo tono que el resto del sitio, sin prometer pago online).

## 6. `frontend/src/pages/checkout/CheckoutPage.tsx` (nuevo, ruta
   `/checkout`, envuelta en `RequireAuth`, lazy como el resto de `/cuenta`)

- Si el carrito está vacío al entrar: `EmptyState` con link a `/catalogo`
  (evita un checkout vacío accidental, ej. si alguien navega directo a la
  URL).
- Resumen de ítems (solo lectura) + subtotal.
- `Textarea` para notas (opcional) -- mismo campo que ya usa
  `MyOrdersPage` al crear un pedido.
- Botón "Confirmar pedido": llama
  `orderApi.create({ notes, items: cart.items.map(i => ({product_id: i.productId, quantity: i.quantity})) })`.
- Éxito: limpia el carrito (`clear()`) y muestra una pantalla de
  confirmación: "Pedido #N creado" + botón "Coordinar por WhatsApp"
  (`waLink(...)`) + link a "Ver mis pedidos" (`/cuenta/pedidos`).
- Error: `apiError(err)` mostrado igual que en el resto del sitio (ej. si
  un producto fue eliminado entre que se agregó al carrito y el checkout,
  el backend responde 422 y se muestra el detalle).

## 7. Rutas (`frontend/src/app/App.tsx`)

```tsx
import { CartPage } from "@/pages/cart/CartPage";
const CheckoutPage = lazy(() => import("@/pages/checkout/CheckoutPage").then((m) => ({ default: m.CheckoutPage })));

// dentro de <Route element={<PublicLayout />}>
<Route path="/carrito" element={<CartPage />} />
<Route
  path="/checkout"
  element={
    <RequireAuth>
      <Suspense fallback={<CenteredSpinner />}>
        <CheckoutPage />
      </Suspense>
    </RequireAuth>
  }
/>
```

`/carrito` eager (público, se visita apenas se agrega algo, sin
justificar un lazy chunk). `/checkout` lazy, mismo criterio que el resto
de `/cuenta/*` (requiere auth, no es un punto de entrada crítico del
bundle inicial).

## 8. `frontend/src/main.tsx`

`CartProvider` envuelve `<App />` (adentro de `AuthProvider`, aunque no
depende de él -- mantiene el orden lógico "identidad primero, luego
features"):

```tsx
<AuthProvider>
  <CartProvider>
    <App />
  </CartProvider>
</AuthProvider>
```
