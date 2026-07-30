# Proposal: centro de notificaciones y avisos por email

## El problema

Hoy los avisos existen pero **no dejan rastro**.

- En el panel, la barra de "pedidos nuevos" solo aparece si tenés la pantalla
  abierta en ese momento. Si no estabas, el pedido entró y nadie se enteró.
- Del lado del cliente, el estado se actualiza en vivo si está mirando la
  página. Cuando marcás su pedido como pagado tres horas después, esa persona
  ya cerró la pestaña y no ve nada.
- Y cuando respondés una cotización, el cliente no tiene forma de saberlo salvo
  que vuelva a entrar a chequear.

El canal SSE resolvió *"que se actualice sin recargar"*. Lo que falta es
**persistencia**: un lugar donde el aviso quede esperando a que la persona
vuelva.

## Qué se construye

**Una tabla `notifications`**, con dueño, título, cuerpo, enlace y estado de
lectura. Sirve igual para el cliente y para el admin: cuesta prácticamente lo
mismo que hacerla para uno solo.

**Una campana en el navbar**, con el contador de no leídas y un panel con las
últimas. Se marca al leer, y hay "marcar todas". Se actualiza en vivo por el
canal SSE que ya existe.

**Avisos por email** en los cuatro cambios que le importan al cliente:
Confirmado, Enviado, Entregado y Pagado. La campana registra todo; el correo
sale solo en esos.

**Orígenes:** cambios de estado de pedidos (entrega y cobro) y respuesta a una
cotización.

## Lo que NO se construye

- **Preferencias por tipo de aviso.** Nadie va a configurar nada con este
  volumen. Si algún día molesta, se agrega la columna.
- **Notificaciones del navegador ni sonido.** Quedan para después; el canal y
  la tabla ya alcanzan para engancharlas.
- **Push web.** Requiere service worker y VAPID, y el email ya cubre el caso de
  "no está en el sitio".

## Un caso que hay que resolver, no ignorar

**Las cotizaciones pueden ser anónimas.** `Quote.user_id` es nullable —alguien
puede pedir una cotización sin tener cuenta— y `customer_email` también. O sea
que hay cotizaciones a las que no se le puede notificar a nadie: no hay usuario
para la campana ni dirección para el correo.

No es un caso raro que se pueda dejar para después: es el formulario público del
sitio. La regla queda explícita en `design.md` §5.
