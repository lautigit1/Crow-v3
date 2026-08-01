# Proposal: cerrar el circuito de cotizaciones

## El problema

El negocio es traer a pedido. La cotización no es un formulario de contacto: **es
la venta**. Y hoy el sistema guarda solo la mitad.

`Quote` tiene lo que pide el cliente —nombre, contacto, vehículo, mensaje— y un
estado. **No tiene la respuesta.** Ni precio, ni plazo, ni de qué proveedor sale.
Vos cotizás por WhatsApp y el sistema apenas registra que la marcaste
"Respondida".

Tres consecuencias concretas:

**No podés consultar lo que ya cotizaste.** Si el mismo cliente vuelve en dos
meses, o si otro pregunta por la misma pieza, no hay nada que mirar. El trabajo
de averiguar precio y plazo se hace de nuevo cada vez.

**No hay puente de cotización a pedido.** Cuando el cliente acepta, alguien carga
el pedido a mano y lo que se vendió queda desligado de lo que se cotizó.

**El vehículo es opcional.** En un negocio donde el vehículo es *el* dato para
poder cotizar, hoy podés recibir una consulta sin él.

Es el mismo agujero que cerramos con los pedidos —algo que pasaba y no quedaba
registrado en ningún lado— pero una etapa antes, en la parte donde realmente
vive tu negocio.

## Qué se construye

**Respuestas con varias opciones.** Original, alternativo, usado: cada una con su
precio, su plazo y una nota. Es como se cotiza un repuesto en la práctica, y
evita el ida y vuelta de "¿y más barato no hay?".

**Un botón "Convertir en pedido"** en la ficha de la cotización. El pedido se crea
con la opción elegida como **línea libre** —nombre y precio de la cotización, sin
producto de catálogo— y queda ligado a la cotización que lo originó.

**El vehículo pasa a ser obligatorio** en el formulario público.

**El cliente ve la respuesta** en "Mis cotizaciones", con las opciones y sus
precios, y le llega el aviso por la campana y por correo — reusando el centro de
notificaciones que ya existe.

## Lo que NO se construye

- **El cliente no acepta desde el sitio.** Convertís vos desde el panel. La
  aceptación sigue siendo por WhatsApp, como ya la hacés, y así funciona igual
  para las cotizaciones anónimas —que hoy son la mayoría, porque el formulario
  es público.
- **No se crean productos de catálogo.** Un repuesto que traés una vez no tiene
  por qué quedar en el catálogo para siempre.
- **No se toca el stock.** Una línea libre no tiene producto, así que no hay
  stock que mover. Ver `design.md` §4.

## El obstáculo que hay que resolver, no esquivar

**`Order.user_id` no es nullable y las cotizaciones anónimas no tienen usuario.**

O sea que "convertir en pedido" no es copiar datos de una tabla a otra: hace
falta decidir a nombre de quién queda ese pedido. La respuesta está en
`design.md` §3, y no es la misma para los tres casos posibles.
