# Proposal: gestión de pedidos en el panel y seguimiento del cobro

## El problema

**Hoy un cliente puede hacer un pedido y nadie del otro lado lo ve.**

No es una carencia de funcionalidad futura: es un agujero abierto. El flujo del
cliente está completo — carrito, checkout, "Mis pedidos", cancelación — y el
backend de administración también existe (`GET /orders` lista todo,
`PATCH /orders/{id}` cambia estado y notas internas, con la regla de stock ya
resuelta). Lo único que falta es la página. Cotizaciones tiene su pantalla y su
ítem de menú; Pedidos no tiene ninguna de las dos.

La consecuencia práctica: el pedido entra a la base y se queda ahí. La única
forma de enterarse es que el cliente arranque la conversación desde el botón
"Coordinar por WhatsApp" del checkout. Si no lo hace, el pedido no existe para
nadie.

## El segundo problema, más silencioso

El estado del pedido hoy describe **la entrega**:

    Pendiente → Confirmado → En proceso → Enviado → Entregado → Cancelado

No hay dónde anotar si el cliente pagó. Y como el cobro se coordina por fuera
del sitio, esa es justamente la pregunta que más se hace el admin. Sin un lugar
propio, la respuesta termina escrita en las notas internas como texto libre —
imposible de filtrar, fácil de olvidar, y con el riesgo de que "Confirmado"
pase a significar "ya me pagó" para una persona y "ya lo despaché" para otra.

## Qué se construye

1. **`payment_status` como eje independiente** del estado de entrega:
   *Sin cobrar → Link enviado → Pagado*. Los dos ejes se mueven por separado,
   así que "Pagado + En proceso" y "Sin cobrar + Entregado" son ambos
   representables y ninguno es contradictorio.

2. **La página `/admin/pedidos`**: lista filtrable por estado, por cobro y por
   cliente; ficha con los ítems, los dos estados editables, notas internas y un
   botón que abre WhatsApp con el mensaje ya escrito.

3. **El texto del checkout**, de "Pedido confirmado" a "Pedido recibido", más
   una línea que diga qué sigue. Hoy el cliente lee que su pedido está
   confirmado antes de que nadie lo haya mirado, y "Confirmado" es justamente
   el estado que va a significar "lo revisé y hay stock".

4. **El estado de cobro visible para el cliente** en "Mis pedidos", para que no
   tenga que preguntar si su pago ya figura.

## Qué NO se construye, a propósito

- **Pasarela de pago.** No hay checkout con tarjeta ni integración con Mercado
  Pago. El sitio nunca prometió eso: el checkout ya termina en "Coordinar por
  WhatsApp". Este change formaliza el modelo que ya estaba implícito.

- **El link de pago guardado en el sistema.** El admin lo genera y lo manda él
  por WhatsApp después de aprobar. Guardarlo sería duplicar algo que ya vive en
  la conversación, y obligaría a mantenerlo sincronizado con la realidad.

- **Estados nuevos en el enum de entrega.** "Pendiente" ya significa "entró y
  nadie lo miró" y "Confirmado" ya significa "lo revisé y va". El escalón que
  hacía falta ya existía; lo que faltaba era que el cliente entendiera en cuál
  está, y eso se arregla con el texto, no con una migración.

- **Teléfono obligatorio en el checkout.** Ver `design.md` §4.

## Señal para revisar esta decisión

El modelo depende del tiempo de respuesta del admin: un pedido que espera un
día se enfría. Ninguna función arregla eso. **La señal de que conviene integrar
una pasarela de verdad va a ser el tiempo de respuesta, no el volumen de
pedidos.**
