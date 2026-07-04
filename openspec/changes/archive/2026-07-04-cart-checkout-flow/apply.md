# Apply: cart-checkout-flow

## Archivos modificados/creados

**Nuevos:**
- `frontend/src/app/providers/CartProvider.tsx` — contexto `CartProvider` + hook `useCart()`. Persiste en `localStorage` (`crow_cart_v1`). Expone `items`, `count`, `subtotal`, `addItem`, `removeItem`, `setQuantity`, `clear`. Cantidad acotada al stock del producto (o sin límite si `stock === 0`, caso "bajo pedido").
- `frontend/src/pages/cart/CartPage.tsx` — vista `/carrito`. Lista de ítems (`CartRow`: imagen, nombre/SKU, stepper +/-, subtotal de línea, quitar), estado vacío, footer con "Vaciar carrito" (confirmación vía `useConfirm`), subtotal total y botón "Continuar" → `/checkout`.
- `frontend/src/pages/checkout/CheckoutPage.tsx` — vista `/checkout` (requiere login). Resumen de solo lectura del pedido, campo de notas opcional, botón "Confirmar pedido" que llama a `orderApi.create(...)` reusando el modelo `Order` existente (sin gateway de pago online). Pantalla de éxito con CTA a WhatsApp y link a "Mis pedidos". Maneja carrito vacío con `EmptyState`.

**Modificados:**
- `frontend/src/shared/ui/Icon.tsx` — ícono `cart` agregado.
- `frontend/src/main.tsx` — `<CartProvider>` envolviendo `<App />` (dentro de `AuthProvider`).
- `frontend/src/widgets/navbar/Navbar.tsx` — `CartButton` (ícono + badge con `count`, tope "99+", oculto si 0) en mobile y desktop.
- `frontend/src/pages/product/ProductDetailPage.tsx` — `QuantityStepper`, botones "Comprar ahora" (agrega + navega a checkout) y "Agregar al carrito" (agrega + feedback "¡Agregado!" 1.8s).
- `frontend/src/app/App.tsx` — rutas `/carrito` (eager) y `/checkout` (lazy, dentro de `RequireAuth`).

## Alcance (definido con el usuario)

- Sin gateway de pago online: el checkout crea un `Order` en estado pendiente y la coordinación de pago/entrega sigue por WhatsApp, igual que el flujo de cotizaciones existente.
- Carrito accesible sin login (localStorage); login solo se exige al llegar a `/checkout` (vía `RequireAuth`, con redirect post-login a `/checkout`).
- Confirmado por el usuario con "segui dale" tras un fallo del tool de preguntas — se usaron los defaults recomendados arriba.

## Verificación

- Lectura completa (Read tool) de los 8 archivos tocados/creados: `CartProvider.tsx`, `Icon.tsx`, `main.tsx`, `Navbar.tsx`, `ProductDetailPage.tsx`, `CartPage.tsx`, `CheckoutPage.tsx`, `App.tsx`. Balance de JSX, imports y tipos verificado manualmente.
- `App.tsx`: import de `CartPage` (eager) y `CheckoutPage` (lazy) correctos; rutas `/carrito` y `/checkout` insertadas dentro de `<PublicLayout>`, checkout envuelto en `RequireAuth` + `Suspense`.
- No fue posible correr `tsc --noEmit` ni `npm run build` (sin acceso a red para instalar dependencias en este sandbox). Verificación limitada a revisión manual de código.

## Desviaciones del plan

- Ninguna respecto a `design.md`. Se corrigieron dos bugs menores durante la implementación (documentados en el historial): padding con shorthand de 3 valores en `ProductDetailPage.tsx`, y uso incorrecto de la prop `maxWidth` en `CartPage.tsx`. Ambos corregidos antes de esta verificación final.
