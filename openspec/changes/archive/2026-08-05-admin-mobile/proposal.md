# Proposal: el panel desde el celular

## Por qué

`DataTable` tenía `min-w-[640px]` y scroll horizontal. En un teléfono de 390px
eso significa ver menos de dos tercios de cada fila y arrastrar de costado para
leer el resto — o sea, el problema empujado a la persona.

No es un detalle estético: si vas a gestionar pedidos **desde el mostrador**, el
panel se usa en el celular con una mano y el cliente enfrente. Hoy es incómodo
al punto de que conviene ir a buscar la computadora.

Nueve pantallas del panel usan ese componente.

## Qué se hace

Abajo de 768px cada fila se convierte en una tarjeta. Las columnas pueden
declarar qué rol cumplen ahí (`titulo`, `subtitulo`, `accion`, `oculta`), y
las que no declaran nada caen en un default razonable.

## Qué NO se hace

- **No se toca la tabla de escritorio.** Arriba de 768px se ve exactamente igual
  que antes.
- **No se rediseña el layout del panel** (sidebar, encabezados, filtros). Es la
  tabla lo que rompe; el resto ya se adapta.
- **No se recortan datos.** Todo lo que muestra una fila sigue estando en la
  tarjeta, salvo lo que se marque explícitamente como redundante.

## Riesgo conocido

El cambio vive en un componente compartido por nueve pantallas y **cubierto por
E2E que corren solo en escritorio**. Un error en la rama de tarjetas no lo
detecta nada de lo que existe hoy — de ahí que la fase 4 agregue un proyecto de
Playwright con viewport de teléfono.
