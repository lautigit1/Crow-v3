# Design: cart-session-scoped

## Storage particionado

Antes: una sola clave `crow_cart_v1` en `localStorage`, sin relación con
el usuario.

Ahora, en `CartProvider.tsx`:

- `crow_cart_guest_v1` — carrito de navegación anónima.
- `crow_cart_user_<id>_v1` — carrito propio de cada usuario logueado,
  sobrevive a logout/login.

## Reconciliación en transiciones de auth

`CartProvider` ahora usa `useAuth()` (`user`, `loading`). Un `useEffect`
compara el `user.id` actual contra el último `id` reconciliado
(`reconciledUserIdRef`) y dispara una de tres ramas quando cambia:

1. **Login / sesión restaurada** (`currentUserId != null` y distinto del
   anterior): carga el carrito guardado de ese usuario, le suma (merge
   por `productId`, cantidades sumadas con cap por stock) los items que
   hubiera en memoria en ese momento (típicamente el carrito de invitado
   que traía antes de loguearse), guarda el resultado bajo la clave del
   usuario, borra `crow_cart_guest_v1`, y pasa a usar la clave del
   usuario como destino de persistencia.
2. **Logout explícito** (había un `id` reconciliado antes y ahora es
   `null`): vacía el carrito en pantalla (`setItems([])`), borra
   `crow_cart_guest_v1`, y vuelve a usar esa clave de invitado como
   destino. Los datos del usuario que se deslogueó no se tocan — ya
   estaban guardados bajo su propia clave por el efecto de persistencia
   normal mientras estaba logueado.
3. **Primera resolución sin sesión** (arranque anónimo de la app): no
   hace nada más que fijar la clave activa en la de invitado.

Se espera a que `authLoading` sea `false` antes de reconciliar, para no
tratar el estado transitorio de "todavía no sabemos si hay sesión" como
un logout.

## Persistencia

Un segundo `useEffect`, disparado por cambios en `items`, guarda siempre
en `activeKeyRef.current` (un `useRef`, mutado sincrónicamente dentro
del efecto de reconciliación antes de que se vuelva a renderizar, así
que cuando corre el efecto de persistencia ya apunta a la clave
correcta).

## Qué NO cambia

- `addItem` / `removeItem` / `setQuantity` / `clear`: misma lógica de
  siempre sobre el estado en memoria.
- `/checkout` sigue protegido por `RequireAuth` — sin cambios ahí.
