# Tasks: cart-session-scoped

- [x] T1 — Particionar storage: `crow_cart_guest_v1` + `crow_cart_user_<id>_v1` en `CartProvider.tsx`.
- [x] T2 — Importar `useAuth()` en `CartProvider` y agregar `mergeItems()` (suma por `productId`, cap por stock).
- [x] T3 — Efecto de reconciliación: login (restaura + merge), logout (vacía pantalla), primera carga anónima (no-op).
- [x] T4 — Efecto de persistencia guarda siempre en la clave activa (`activeKeyRef`).
- [x] T5 — Confirmar que `/checkout` sigue exigiendo login vía `RequireAuth` (sin cambios necesarios).
- [x] T6 — Revisar `Navbar.tsx` (badge de `count`) y `CartPage.tsx` / `CheckoutPage.tsx` — no dependen de la clave de storage, siguen funcionando sin cambios.
- [x] T7 — Verificación manual (sin `tsc` disponible en el sandbox): releer `CartProvider.tsx` completo y confirmar que compila mentalmente (tipos, hooks, deps de efectos).
