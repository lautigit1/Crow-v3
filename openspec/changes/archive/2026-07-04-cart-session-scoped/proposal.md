# Proposal: cart-session-scoped

## What

Atar el carrito al estado de sesión: se vacía en pantalla al cerrar
sesión, pero el contenido de cada usuario logueado persiste por su
cuenta (no en el navegador en general) y reaparece automáticamente la
próxima vez que ese usuario se loguea.

## Why

El change anterior (`cart-checkout-flow`) dejó el carrito 100% atado al
navegador vía `localStorage`, sin ninguna relación con la sesión. El
usuario pidió corregir esto: si cierra sesión con cosas en el carrito,
esas cosas no deberían quedar visibles para quien use la compu después;
pero tampoco deberían perderse — tienen que volver a aparecer cuando el
mismo usuario se vuelve a loguear.

## Alcance

- El carrito de invitado (sin sesión) se sigue permitiendo — se puede
  seguir agregando productos navegando sin cuenta, igual que antes.
- Al loguearse: se restaura el carrito guardado de ese usuario y se le
  suman (merge por cantidad) los items sueltos que hubiera en el
  carrito de invitado en ese momento.
- Al cerrar sesión: el carrito visible se vacía y el bucket de invitado
  se limpia. El carrito del usuario que se desloguea queda guardado bajo
  su propia clave de storage, intacto, para la próxima vez que se
  loguee.
- `/checkout` ya exige login vía `RequireAuth` (no requiere cambios) —
  esto ya cubre "si agrega algo sin sesión y quiere pagar, se le exige
  loguearse".

## Non-goals

- No se agrega sincronización de carrito contra el backend (sigue siendo
  100% client-side, ahora particionado por `localStorage` key en vez de
  una única clave global).
- No se cambia el checkout ni el modelo de `Order`.
