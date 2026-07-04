# Apply: cart-session-scoped

## Archivos tocados

- `frontend/src/app/providers/CartProvider.tsx` — único archivo modificado.

## Qué se hizo

- Storage particionado: `crow_cart_guest_v1` (invitado) y
  `crow_cart_user_<id>_v1` (por usuario logueado), en vez de una única
  clave global `crow_cart_v1`.
- `CartProvider` ahora usa `useAuth()` para reaccionar a transiciones de
  sesión mediante un `useEffect` que compara `user?.id` contra el último
  id reconciliado (`reconciledUserIdRef`):
  - **Login / sesión restaurada**: restaura el carrito guardado del
    usuario y le suma (merge por `productId`, cap por stock) lo que
    hubiera en el carrito de invitado; guarda el resultado bajo la clave
    del usuario y borra el bucket de invitado.
  - **Logout**: vacía el carrito visible (`setItems([])`) y borra el
    bucket de invitado. El carrito del usuario que se desloguea no se
    toca — ya estaba guardado bajo su propia clave.
  - **Primera carga anónima**: no-op, sigue usando el bucket de invitado.
- Un segundo efecto persiste `items` en `activeKeyRef.current` (mutado
  sincrónicamente en el efecto de reconciliación) cada vez que cambian.
- `addItem` / `removeItem` / `setQuantity` / `clear`: sin cambios de
  lógica, siguen operando sobre el estado en memoria.

## Por qué no se tocó nada más

- `/checkout` ya estaba protegido por `RequireAuth` desde el change
  anterior (`cart-checkout-flow`) — eso ya cubre "si agregás algo al
  carrito sin sesión y querés pagar, te exige loguearte". No hacía falta
  ningún cambio ahí.
- `Navbar.tsx` (badge del carrito), `CartPage.tsx` y `CheckoutPage.tsx`
  consumen `useCart()` sin conocer las claves de `localStorage` — no
  requieren cambios.

## Verificación

- Sandbox sin acceso a red — no se pudo correr `tsc`/build. Verificación
  manual: relectura completa de `CartProvider.tsx` confirmando tipos,
  dependencias de los `useEffect` y que no hay loops de renderizado
  (el efecto de reconciliación no depende de `items`, solo de
  `authLoading`/`user?.id`; el de persistencia sí depende de `items`
  pero no cambia el key ref por sí mismo).
- Revisados (sin cambios necesarios): `main.tsx` (orden de providers ya
  soporta `useAuth()` dentro de `CartProvider`), `Navbar.tsx`,
  `ProductDetailPage.tsx`, `CartPage.tsx`, `CheckoutPage.tsx`,
  `App.tsx`/`guards.tsx` (`RequireAuth` en `/checkout`).

## Comportamiento resultante

1. Invitado agrega productos → carrito funciona igual que antes,
   persiste en `crow_cart_guest_v1`.
2. Invitado va a pagar → `RequireAuth` lo manda a `/login` (sin cambios).
3. Se loguea → su carrito guardado (si tenía uno de una sesión anterior)
   se restaura y se le suman los items que traía como invitado.
4. Cierra sesión → el carrito desaparece de la pantalla/navbar
   inmediatamente.
5. Vuelve a loguearse (mismo usuario) → el carrito con el que se fue
   reaparece tal cual lo dejó.
