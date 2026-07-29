# Apply: pedidos y estados en vivo (SSE)

## Resumen

Los pedidos y sus estados ahora se actualizan solos, sin recargar. En el panel,
un pedido nuevo levanta una barra *"N pedidos nuevos — mostrar"* que no toca la
tabla hasta que se la aprieta; los cambios de estado se aplican en silencio. En
"Mis pedidos", el cliente ve moverse la entrega y el cobro.

Se pidió WebSocket y se implementó **SSE**: el canal es estrictamente
unidireccional —el navegador no manda nada— y todo lo bidireccional de
WebSocket habría sido código que escribir, probar y mantener sin que nadie lo
use. Reconexión y detección de conexión muerta vienen gratis con `EventSource`.

## Archivos

**Backend — nuevos:** `app/core/events.py` (broker), `app/api/routes/events.py`
(endpoint), `tests/test_events.py` (13).

**Backend — modificados:** `app/api/routes/orders.py` (3 puntos de
publicación), `app/api/__init__.py`, `app/main.py` (registro del event loop),
`app/core/config.py` y `app/api/routes/auth.py` (del change anterior).

**Frontend — nuevos:** `shared/lib/serverEvents.ts` (contexto + hook),
`app/providers/ServerEventsProvider.tsx`, `e2e/live-orders.spec.ts` (2).

**Frontend — modificados:** `main.tsx`, `pages/admin/AdminOrdersPage.tsx` (a
TanStack Query + barra), `pages/account/MyOrdersPage.tsx`,
`entities/order/queries.ts`, `__tests__/AdminOrdersPage.test.tsx` (+4, y los 12
que ya estaban envueltos en un `QueryClientProvider`).

**Infra:** `frontend/nginx.conf`.

## Decisiones

- **Redis pub/sub, no una cola en memoria.** Es lo más grande del change y no
  es opcional: uvicorn corre con 4 workers en producción y 2 en desarrollo, que
  son procesos separados. El pedido entra por un worker y el admin está
  conectado a otro. Una cola en memoria andaría perfecto con un worker,
  entregaría el evento una de cada dos veces con dos, y sería un misterio en
  producción.
- **El evento es una señal, no los datos:** `{type, order_id}`. El navegador
  vuelve a pedir la lista por la API de siempre. Así el canal nunca transporta
  nombres ni totales —un error de filtrado expone un número de pedido— y los
  permisos siguen viviendo en un solo lugar.
- **El filtrado es del servidor.** Los canales se eligen según el rol:
  `user:{id}` siempre, `admin` además si corresponde. El navegador no elige a
  qué se suscribe.
- **Publicar nunca propaga.** `try/except` + log: un pedido guardado y no
  avisado es un inconveniente; un pedido que no se guarda porque Redis estaba
  caído es un problema.
- **El endpoint es `async` y no toca la base.** Si fuera sync, cada pestaña
  abierta ocuparía un hilo del threadpool para siempre.
- **Pedidos nuevos avisan; los cambios de estado se aplican solos.** Reordenar
  la tabla cuando alguien está por hacer clic es peor que enterarse diez
  segundos después. Un cambio de estado, en cambio, no agrega filas: solo
  cambian las que ya están.
- **No se reconecta a mano.** `EventSource` ya lo hace con su propia espera;
  hacerlo encima multiplicaría los intentos justo cuando el servidor está
  caído.

## Lo que encontró cada cosa

**El E2E encontró un bug de producto.** `MyOrdersPage` guardaba una **copia**
del pedido en estado al abrir la ficha. La lista se refrescaba con el evento,
pero la ficha abierta seguía mostrando el dato viejo — y tener la ficha abierta
es justo el momento en que alguien mira si su pedido se movió. La feature habría
parecido andar en la lista y fallado donde importa. Ahora se guarda el ID y el
pedido se deriva de la lista.

**Steiger encontró un error de arquitectura.** El contexto y el hook estaban en
`app/providers`, y una página no puede importar de la capa `app`. Es la misma
razón por la que `AuthProvider` es solo un re-export de `entities/session`.
Quedaron en `shared/lib/serverEvents.ts`.

**Dos veces el mismo error de asincronía, y vale registrarlo.** `tarea.cancel()`
solo *marca* la cancelación: hasta que no se la espera, el generador sigue
formalmente corriendo y `aclose()` falla con *"asynchronous generator is already
running"*. Apareció primero en los tests del broker y después, en su versión
peligrosa, en el latido: la forma obvia de escribirlo —`asyncio.wait_for(anext(...),
timeout=25)`— cancela la corrutina al vencer y rompe el stream en la primera
conexión que pase 25 segundos en silencio. O sea, en todas. Va con
`asyncio.wait`, que espera sin cancelar.

**Los tests de streaming por `TestClient` cuelgan.** La respuesta no termina
nunca y cada caso se comía el latido entero. Se apuntó directo al generador y a
la función del endpoint, que además es donde está la lógica propia.

## Verificación

- **Backend:** `ruff` limpio, **396** tests (eran 383).
- **Frontend:** `typecheck`, `eslint` y `steiger` limpios, **112** de vitest.
- **E2E:** **20/20** contra el stack de docker.

## Pendiente

- **Verificar a mano que al cerrar la pestaña la conexión se libera** del lado
  del servidor. Los tests cubren que el generador se cierre; el camino real
  —navegador que cierra, nginx que corta, worker que libera— no se probó.
- **¿Producción sirve por HTTP/2?** Sobre HTTP/1.1 la conexión SSE se queda con
  1 de las 6 que el navegador permite por origen. Alcanza igual, pero conviene
  saberlo.
- **`proxy_buffering off` es la línea de la que depende todo.** Sin ella nginx
  acumula la respuesta y el evento no llega nunca — y anda perfecto en
  desarrollo, donde Vite habla directo con la API. Si alguna vez "dejan de
  llegar los eventos en producción", empezar por ahí.
- **Sin notificación del navegador ni sonido.** El canal queda listo para
  engancharlo.
- **Solo eventos de pedidos.** El mecanismo es genérico; cotizaciones,
  importaciones y stock podrían usarlo.
