# Proposal: pedidos y estados en vivo (SSE)

## El problema

El change anterior hizo visibles los pedidos en el panel. Pero **solo si te
acordás de recargar**: `AdminOrdersPage` carga al montar y cuando cambiás un
filtro, y nada más. No hay websockets, no hay SSE, no hay sondeo, y el
`QueryClient` global tiene `refetchOnWindowFocus: false`.

En la práctica eso significa que un pedido puede estar esperando media hora
sin que nadie lo sepa, que es una versión más leve del problema que el change
anterior vino a resolver. Y del otro lado, el cliente que ya pagó no ve
moverse su pedido hasta que recarga.

## Qué se construye

Un canal de eventos del servidor al navegador, con **SSE (Server-Sent
Events)**, que avisa cuando un pedido entra o cambia de estado.

- **En el panel:** una barra "2 pedidos nuevos — mostrar" que no toca la lista
  hasta que la persona la aprieta. Los cambios de estado que hace ella misma
  sí se reflejan al toque.
- **En "Mis pedidos":** el estado de entrega y el de cobro se actualizan solos.

## Por qué SSE y no WebSocket

Se pidió WebSocket y se propuso SSE en su lugar, por razones concretas:

| | SSE | WebSocket |
|---|---|---|
| Dirección | Servidor → navegador | Bidireccional |
| Reconexión | Nativa del navegador | A mano, con backoff |
| Conexión muerta | La detecta el navegador | Latido propio (ping/pong) |
| nginx | Apagar buffering | Bloque nuevo con cabeceras de upgrade |
| Transporte | HTTP común | Handshake de upgrade |

**Lo que necesitamos es estrictamente unidireccional**: el navegador no tiene
nada que mandar por ese canal. Todo lo bidireccional de WebSocket sería código
que hay que escribir, probar y mantener sin que nadie lo use.

Si algún día hace falta que el navegador hable por el mismo canal —por ejemplo
"otro admin ya está editando este pedido"— ahí sí conviene WebSocket, y el
cambio queda acotado al transporte porque el resto (pub/sub, canales,
autenticación, el cliente que reacciona a los eventos) es idéntico.

## Lo que NO se construye

- **Historial de eventos ni reenvío de los perdidos.** Al reconectar, el
  cliente vuelve a pedir la lista. Es más simple y más correcto que intentar
  reproducir una cola: el estado de verdad está en la base, no en el canal.
- **Notificaciones del navegador ni sonido.** Se puede sumar después sobre el
  mismo canal.
- **Eventos de otras entidades** (cotizaciones, importaciones, stock). El
  mecanismo queda genérico, pero solo se publican eventos de pedidos.

## Lo que hay que aceptar

El costo real de este change no es el endpoint SSE: son **treinta líneas de
infraestructura de pub/sub que existen únicamente porque la API corre con
varios workers** (4 en producción, 2 en desarrollo). Ver `design.md` §1.
