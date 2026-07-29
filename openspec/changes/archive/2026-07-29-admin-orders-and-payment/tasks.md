# Tasks: gestión de pedidos y seguimiento del cobro

Cuatro fases. Cada una deja el sistema funcionando: se puede parar al final de
cualquiera sin dejar nada a medias.

---

## Fase 1 — El eje de cobro (backend)

- [x] **1.1** Migración `019_order_payment_status` — enum `paymentstatus`
      (Sin cobrar / Link enviado / Pagado), `server_default` + UPDATE
      explícito, `downgrade` que dropea columna **y** tipo (design §8).
- [x] **1.2** `PaymentStatus` en `app/models/order.py` y la columna en `Order`.
- [x] **1.3** `payment_status` en `OrderRead` (lo ve el cliente) y en
      `OrderStatusUpdate` como campo **opcional** — mandar solo el estado de
      entrega tiene que seguir funcionando igual que hoy.
- [x] **1.4** `admin_update_order` aplica `payment_status` si viene, y lo
      registra en la auditoría junto con el cambio de estado.
      **Sin regla de stock asociada** (design §2).
      → El detalle de auditoría pasó a listar **solo los ejes que cambiaron**.
      Registrar siempre los dos llenaría el historial de "Pagado → Pagado" y
      volvería inútil la búsqueda de cuándo se cobró un pedido.
- [x] **1.5** Tests: cada eje se mueve sin tocar al otro; cancelar un pedido
      pagado devuelve stock y deja el cobro en Pagado; un PATCH que solo manda
      `status` no pisa `payment_status`.
      → 7 tests nuevos. Suite de backend: **370** (eran 363). `ruff` limpio.
      Cadena de Alembic verificada: 19 revisiones, un solo head, sin ramas.

## Fase 2 — Lo que la lista necesita (backend)

- [x] **2.1** `AdminOrderRead` extendiendo `OrderRead`: `customer_name`,
      `customer_email`, `customer_phone`, `total`, `items_sin_precio`.
- [x] **2.2** Cálculo del total desde los snapshots, salteando las líneas sin
      precio y contándolas aparte (design §3). Nunca desde el producto actual.
- [x] **2.3** Filtros en `GET /orders`: `status`, `payment_status`, `q`
      (nombre/mail, y número de pedido si `q` es numérico). `user_id` se
      mantiene.
      → `status` va como `Query(alias="status")` sobre un parámetro llamado
      `order_status`: `status` a secas colisiona con el módulo `status` de
      FastAPI que el archivo ya importa para los códigos HTTP.
- [x] **2.4** `selectinload` del usuario en la query de admin — sin eso, listar
      20 pedidos son 21 consultas.
- [x] **2.5** Tests: filtros combinados, total con productos "Consultar",
      pedido cuyo usuario fue borrado.
      → 11 tests nuevos. Suite: **381**. `ruff` limpio.
      → **Agregado sobre lo diseñado:** el `PATCH` ahora devuelve
      `AdminOrderRead` en vez de `OrderRead`, para que la lista pueda
      actualizar la fila sin volver a pedir la página entera.

## Fase 3 — La página del panel (frontend)

- [x] **3.1** Tipos y api en `entities/order`: `PaymentStatus`, `AdminOrder`,
      `listAll` con los filtros nuevos, `updateOrder` con los dos estados.
- [x] **3.2** `AdminOrdersPage`: lista con cliente, fecha, total, los dos
      estados y buscador.
      → **Filtrado del lado del servidor**, no en memoria como Cotizaciones:
      los pedidos se acumulan sin techo y traerlos todos para filtrar en el
      navegador deja de funcionar en algún momento. Con paginado y debounce.
- [x] **3.3** Ficha del pedido: ítems con snapshots, los dos estados
      editables, notas internas, notas del cliente.
      → **D7 resuelto: Drawer a 720px**, no página propia. Entra cómodo y
      evita perder el contexto de la lista al gestionar varios pedidos
      seguidos.
- [x] **3.4** Botón de WhatsApp al **número del cliente** — `waLinkCliente()`,
      separado de `useWaLink()` que apunta al negocio (design §4). Fallback a
      "Copiar mail" cuando no hay teléfono.
- [x] **3.5** Ruta `/admin/pedidos` + ítem de menú al lado de Cotizaciones +
      lazy import en `App.tsx`. Ícono `cart` (no existe uno de pedidos).
- [x] **3.6** Tests de `AdminOrdersPage`: filtros, cambio de cada estado por
      separado, y el fallback sin teléfono. **12 tests** (suite: 96 → **108**).
      → `typecheck` limpio (agarró el fixture de `CheckoutPage.test.tsx` sin
      `payment_status`), `eslint` limpio sobre lo tocado.
      → ⚠ **Los 14 tests no se pudieron ejecutar en el sandbox**: `node_modules`
      está instalado para Windows y vitest sobre el mount excede el límite de
      tiempo por comando. Hay que correrlos en la máquina.

## Fase 4 — El lado del cliente

- [x] **4.1** Texto del checkout: "Pedido confirmado" → **"Pedido recibido"**.
      → **La línea extra de "qué sigue" NO se agregó**: la pantalla ya tiene
      tres pasos numerados y el primero dice "Un asesor real revisa tu pedido
      y confirma stock y precio". Sumar otra línea repetía lo mismo.
- [x] **4.2** Actualizado `shopping-flow.spec.ts`, que verificaba el texto
      viejo. Mismo commit que 4.1.
- [x] **4.3** Estado de cobro en "Mis pedidos" (`PaymentBadge` en el detalle).
      → **Con las palabras del cliente**: "Sin cobrar" es lenguaje del
      negocio; del otro lado se muestra "Pago pendiente". "Sin cobrar" además
      queda en gris y no en rojo — es el estado inicial de todos los pedidos y
      pintarlo de alarma haría que cada compra recién hecha parezca un
      problema.
      → Solo en el detalle, no en la tarjeta de la lista: la tarjeta ya tiene
      estado y total, y un segundo chip la amontona.
- [x] **4.4** Spec E2E del flujo de admin: 3 tests — el circuito completo, el
      filtro de "entregado sin cobrar", y lo que ve el cliente.
      → `typecheck` y `eslint` limpios. **Los E2E no se pudieron ejecutar acá**
      (requieren el stack de docker), hay que correrlos en la máquina.

---

## Verificación

- [x] `ruff` limpio y **383** tests de backend.
- [x] `typecheck`, `eslint` y **108** de vitest.
- [x] `npm run e2e`: **18/18**, contra el stack de docker
      (`E2E_BASE_URL=http://localhost:8080`; el default de la config apunta al
      dev server de Vite en 5173).
- [ ] Migración 019 contra una **copia** de la base de producción antes de
      deployar.

## Al cerrar

- [x] `apply.md` con lo que se construyó, las decisiones y lo que encontraron
      los tests.
- [x] Mover a `openspec/changes/archive/2026-07-29-admin-orders-and-payment/`.

---

## Decisiones ya tomadas

| # | Decisión | Dónde |
|---|---|---|
| D1 | Cobro como eje separado, no estados nuevos | design §1 |
| D2 | El enum de entrega no se toca; "Aprobado" se descartó | design §1 |
| D3 | El link de pago no se guarda: lo manda el admin por WhatsApp | proposal |
| D4 | Sin teléfono obligatorio en el checkout; fallback a mail | design §4 |
| D5 | Total parcial explícito con contador de ítems sin precio | design §3 |
| D6 | Sin validación de transiciones entre ejes | design §1 |

## Abierto

- **D7** — ¿La ficha del pedido es un `Drawer` (como proveedores) o una página
  propia? Un pedido tiene más contenido que un proveedor: ítems, dos estados,
  dos juegos de notas. Se decide viéndolo.
