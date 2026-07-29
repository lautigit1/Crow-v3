# Tasks: pedidos y estados en vivo (SSE)

Cuatro fases. Las dos primeras dejan el canal funcionando de punta a punta sin
que se note en la interfaz; recién la tercera lo hace visible.

---

## Fase 1 — El broker

- [x] **1.1** `app/core/events.py`: `publicar(canal, payload)` desde código
      sync usando el cliente Redis que ya existe, y `suscribir(canal)` async
      con un cliente `redis.asyncio` propio.
      → El async va aparte **a propósito**: una suscripción bloquea la conexión
      mientras espera, y el cliente sync lo comparten el rate limiter, la
      blocklist y el cache del dashboard. Colgarles la conexión dejaría media
      API sin Redis.
- [x] **1.2** Fallback en memoria cuando no hay Redis, con el loop capturado en
      el arranque (`registrar_loop()` en el lifespan) y `call_soon_threadsafe`.
- [x] **1.3** `publicar()` nunca propaga: `try/except` + log.
- [x] **1.4** Tests del broker: **8**, contra el fallback en memoria.
      → El camino de Redis no se prueba: haría falta un Redis real y se estaría
      probando `redis-py`, no código nuestro. Sí se prueba lo propio — ruteo por
      canal, aislamiento entre canales, fanout a varios suscriptores, limpieza
      al desuscribirse, y que publicar no tire ni con el cliente roto.

## Fase 2 — El endpoint y los puntos de publicación

- [x] **2.1** `GET /api/events` — `async def`, `StreamingResponse` con
      `text/event-stream`, `Cache-Control: no-cache`, `X-Accel-Buffering: no`.
      → Manda un comentario apenas conecta: hasta que no llega el primer byte
      el navegador no considera abierta la conexión y `onopen` no dispara.
- [x] **2.2** Canales según quién sea: `user:{id}` siempre, `admin` además si
      el rol lo es.
- [x] **2.3** Latido cada 25s y `finally` que cancela la suscripción.
      → **El latido NO usa `asyncio.wait_for`**: cancela la corrutina al vencer
      y volver a pedirle un elemento al generador falla con "asynchronous
      generator is already running". Usa `asyncio.wait`, que espera sin
      cancelar y deja seguir esperando la misma tarea.
- [x] **2.4** Publicar en el alta (`order.created` → solo admin: el cliente
      acaba de crearlo), en el `PATCH` de admin (`order.updated` → admin **y**
      dueño) y en la cancelación del cliente (`order.updated` → admin).
- [x] **2.5** Tests: **5** del endpoint (13 en total con los del broker).
      → Los tests de streaming **a través de `TestClient` cuelgan**: la
      respuesta no termina y cada caso se comía el latido entero. Se apuntó
      directo al generador y a la función del endpoint, que además es donde
      está la lógica propia. Por `TestClient` quedó solo el 401.

## Fase 3 — El navegador

- [x] **3.1** `ServerEventsProvider`: **un solo** `EventSource` para toda la
      app, montado dentro de `AuthProvider` para que solo abra con sesión.
      → El contexto y el hook viven en `shared/lib/serverEvents.ts`, **no** en
      `app/providers`: steiger rechaza que una página importe de `app`. Es la
      misma razón por la que `AuthProvider` es solo un re-export de
      `entities/session`.
      → No se reconecta a mano: `EventSource` ya lo hace con su propia espera, y
      hacerlo a mano multiplicaría los intentos justo cuando el servidor está
      caído.
- [x] **3.2** `AdminOrdersPage` pasa a TanStack Query.
- [x] **3.3** Barra "N pedidos nuevos — mostrar" que no reordena la tabla
      hasta que se la aprieta; `order.updated` refresca en silencio.
- [x] **3.4** `MyOrdersPage` se refresca con `order.updated`. Sin barra: no
      aparecen filas nuevas, solo cambian las que ya están.
- [x] **3.5** Tests: **4 nuevos** (16 en el archivo). Los 12 que ya existían
      hubo que envolverlos en un `QueryClientProvider` — el cambio a TanStack
      Query los rompía a todos.
      → `typecheck`, `eslint` y `steiger` limpios.
      → ⚠ **vitest no se pudo ejecutar acá** (mismo límite de tiempo de
      siempre): hay que correrlo en la máquina.

## Fase 4 — nginx y verificación

- [x] **4.1** `location = /api/events` con `proxy_buffering off`, `gzip off`,
      `proxy_read_timeout 1h` y **sin** `limit_req`. Match exacto (`=`) para
      que gane sobre el `location /api/`.
- [x] **4.2** E2E: **2 tests**, con dos contextos de navegador — el panel se
      entera del pedido nuevo, y el cliente ve moverse su cobro.
      → **Encontró un bug de producto, no del test:** `MyOrdersPage` guardaba
      una copia del pedido en estado, así que la ficha abierta seguía mostrando
      el dato viejo aunque la lista se refrescara. Y tener la ficha abierta es
      justo el momento en que alguien mira si su pedido se movió. Ahora se
      guarda el ID y el pedido se deriva de la lista.
- [x] **4.3** `ruff` limpio y **396** tests de backend (eran 383).
      `typecheck`, `eslint` y `steiger` limpios, **112** de vitest (eran 108).
      **20/20** E2E contra el stack de docker (eran 18).
- [ ] **4.4** Verificar a mano que al cerrar la pestaña la conexión se libera
      del lado del servidor. Los tests cubren que el generador se cierre; lo
      que no se probó es el camino real — navegador que cierra la pestaña,
      nginx que corta, worker que libera.

---

## Decisiones tomadas

| # | Decisión | Dónde |
|---|---|---|
| D1 | SSE y no WebSocket: el canal es unidireccional | proposal |
| D2 | Redis pub/sub obligatorio por los 4 workers | design §1 |
| D3 | El evento es una señal (`{type, order_id}`), no los datos | design §2 |
| D4 | Filtrado por canal del lado del servidor | design §3 |
| D5 | Sin historial ni reenvío: al reconectar se refresca | proposal |
| D6 | Pedidos nuevos avisan con una barra; los cambios de estado se aplican solos | design §9 |
| D7 | Alcance: panel **y** clientes | (decidido en conversación) |

## Abierto

- **D8 — ¿Producción sirve por HTTP/2?** Si es HTTP/1.1, la conexión SSE se
  queda con 1 de las 6 que el navegador permite por origen. Alcanza igual, pero
  conviene saberlo (design §7).
- **D9 — ¿Suena o avisa el navegador con un pedido nuevo?** Fuera de alcance
  acá; el canal queda listo para engancharlo.
