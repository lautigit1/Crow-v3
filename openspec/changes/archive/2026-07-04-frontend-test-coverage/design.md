# Design: frontend-test-coverage

## format.test.ts

Funciones puras, sin mocks. Verifica formato de moneda (con fallback
"Consultar" para null/undefined, y que 0 no se confunda con "sin
precio"), separador de miles es-AR, y formato de fecha/fecha-hora.

## CartProvider.test.tsx

`CartProvider` depende de `useAuth()` (de `AuthProvider`) solo para
`user`/`loading`. En vez de montar un `AuthProvider` real + MSW (como
hace `AuthProvider.test.tsx`), se mockea el módulo completo con
`vi.mock("@/app/providers/AuthProvider", ...)` devolviendo un
`vi.fn()` controlable por test -- permite simular login/logout
llamando `mockReturnValue` + `rerender` sin depender de red.

Un componente `Harness` expone `count`/`subtotal`/`items` como texto y
botones para cada acción del contexto (`addItem`, `addItem` con
cantidad, `removeItem`, `setQuantity` a 0 y a un valor positivo,
`clear`).

Cubre:
- Agregar producto nuevo, sumar cantidades de un producto repetido.
- Tope por stock tanto en la primera carga como al sumar de nuevo.
- `stock <= 0` bloquea el agregado por completo.
- `setQuantity` a 0 elimina el item; a un valor positivo lo actualiza
  sin tope de stock (tal cual está en el código real).
- `removeItem`, `clear`.
- `subtotal` como precio × cantidad, con precio `null` tratado como 0.
- Persistencia en `localStorage` bajo la clave de invitado.
- Reconciliación: login fusiona el carrito de invitado con el ya
  guardado del usuario (vía `mergeItems`) y borra la clave de invitado;
  logout vacía el carrito en pantalla; mientras `authLoading` es
  `true` no reconcilia nada.

## useFavorites.test.tsx

Mismo approach: se mockea `useAuth` (solo `user`) y `favoriteApi`
(`list`/`add`/`remove`) con `vi.mock`, usando `renderHook` de
Testing Library en vez de un componente intermedio.

Cubre:
- Sin sesión: no llama a la API, `ids` vacío, `toggle` es no-op.
- Con sesión: carga favoritos al montar, `ids` vacío si la API falla,
  `isFavorite` refleja el estado.
- `toggle` optimista: agrega/quita antes de que responda la API, y
  revierte el cambio si `add`/`remove` fallan.
- `refresh()` vuelve a pedir la lista.
