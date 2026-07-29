# Apply: gestión de pedidos en el panel y seguimiento del cobro

## Resumen

Cierra un agujero abierto: **un cliente podía hacer un pedido y del otro lado
no lo veía nadie.** El flujo del cliente estaba completo y el backend de
administración también (`GET /orders`, `PATCH /orders/{id}` con la regla de
stock resuelta); lo único que faltaba era la pantalla.

Además agrega el **estado de cobro como eje independiente** del estado de
entrega, porque el pago se coordina por WhatsApp —fuera del sitio— y no había
dónde registrar si el cliente pagó.

## Migración

- **`019_order_payment_status`** — enum `paymentstatus`
  (Sin cobrar / Link enviado / Pagado) en `orders`, con `server_default` y
  UPDATE explícito.

## Archivos

**Backend:** `models/order.py` (`PaymentStatus` + columna), `schemas/order.py`
(`payment_status` en `OrderRead`, opcional en `OrderStatusUpdate`,
`AdminOrderRead`/`AdminOrderList` nuevos), `api/routes/orders.py` (aplica el
cobro, auditoría por eje, `_a_schema_admin()`, filtros y `selectinload` del
usuario), `core/config.py` (`REGISTER_RATE_LIMIT_PER_IP`),
`api/routes/auth.py`. Tests: `test_orders.py` (+19), `test_security_hardening.py` (+1).

**Frontend:** `entities/order/index.ts` (`PaymentStatus`, `AdminOrder`,
filtros, `waLinkCliente()`), `pages/admin/AdminOrdersPage.tsx` (nuevo),
`AdminLayout.tsx`, `app/App.tsx`, `pages/checkout/CheckoutPage.tsx`,
`pages/account/MyOrdersPage.tsx`. Tests: `AdminOrdersPage.test.tsx` (12 nuevos),
`admin-orders.spec.ts` (3 E2E), `shopping-flow.spec.ts` y
`admin-imports.spec.ts` actualizados.

**Raíz:** `docker-compose.yml`.

## Decisiones

- **Dos ejes, no uno.** Entrega y cobro son ortogonales: "Pagado + En proceso"
  (pagó por adelantado) y "Entregado + Sin cobrar" (cliente que paga a fin de
  mes) son situaciones reales que un enum único no puede expresar.
- **Sin validación de transiciones de cobro.** El pago pasa por fuera del
  sistema, así que el sistema no conoce la verdad. Poner reglas solo lograría
  que el admin no pueda registrar lo que realmente pasó, incluido corregirse.
- **Cancelar un pedido pagado conserva "Pagado".** Devuelve el stock pero no
  borra que el cliente pagó — que es justo el dato que hace falta para saber
  que hay que devolverle la plata.
- **El enum de entrega no se tocó.** "Pendiente" ya significa "entró y nadie lo
  miró" y "Confirmado" ya significa "lo revisé y hay stock". Se evaluó agregar
  "Aprobado" para el ingreso automático y se descartó: *aprobado* le promete al
  cliente que alguien dijo que sí, que es lo que todavía no pasó.
- **El link de pago no se guarda.** Lo manda el admin por WhatsApp después de
  aprobar; guardarlo duplicaría algo que ya vive en la conversación.
- **"Pedido confirmado" → "Pedido recibido"** en el checkout. *Confirmado* es
  un estado real del pedido; usarlo cuando nadie lo miró le da dos significados
  al mismo término, y el del cliente es el optimista.
- **Al cliente se le habla en su idioma:** "Sin cobrar" es lenguaje del
  negocio, del otro lado se muestra "Pago pendiente". Y en gris, no en rojo: es
  el estado inicial de todo pedido y en rojo cada compra recién hecha parecería
  un problema.
- **Total parcial explícito.** `Product.price` es nullable ("Consultar"), así
  que la respuesta devuelve el total *y* cuántas líneas quedaron afuera. Un
  total que omite líneas en silencio es peor que no mostrar total.
- **Sin teléfono obligatorio en el checkout.** Fricción en la peor pantalla
  para cubrir un caso que se resuelve con un mail. Sin teléfono, la ficha
  ofrece "Copiar mail" en vez de un botón de WhatsApp muerto.

## Lo que encontraron los tests, y lo que no

Esta parte es la más útil de conservar, porque **tres de los cuatro problemas
serios se escaparon de toda la suite y aparecieron recién al levantar el
stack.**

**Lo que atajó la verificación automática:**

- `typecheck` detectó el fixture de `CheckoutPage.test.tsx` sin `payment_status`.
- Los E2E detectaron cuatro localizadores mal asumidos (abajo).

**Lo que NO atajó, y por qué:**

1. **`op.add_column` con `sa.Enum` no emite el CREATE TYPE.** El stack no
   arrancó: `type "paymentstatus" does not exist`. El `design.md` decía "se
   sigue el patrón de la 009" — y ese patrón nunca se había ejercido en la
   condición que lo rompe, porque en toda base real el tipo ya existía creado
   por `create_all()`. **Copiar un patrón presente en el repo no es lo mismo
   que copiar un patrón probado.**

2. **SQLAlchemy persiste el NOMBRE del miembro del enum, no su valor.** La
   migración creó el tipo con `'Sin cobrar'` y el ORM manda `'SIN_COBRAR'`.
   Los 382 tests de backend pasaban igual: **corren sobre SQLite, donde un Enum
   es un VARCHAR sin restricción de etiquetas.** Es un punto ciego de toda la
   suite, no de este cambio. Se agregó un test que compara las etiquetas de la
   migración contra las que emite SQLAlchemy, sin necesidad de Postgres.

3. **El nombre accesible de un `<select>` envuelto en `<label>`** se calcula
   desde el `textContent` de la etiqueta, que **incluye el texto de todas las
   opciones**: quedaba `"EntregaPendienteConfirmado…"`. Los 108 tests de vitest
   pasaban porque jsdom lo resuelve distinto que Chromium. Se resolvió con
   `aria-label` explícito, que además es lo que anuncia un lector de pantalla.

4. **Playwright matchea por substring**, tanto en `getByLabel` como en el
   `name` de `getByRole`. `"Entrega"` agarraba también `"Filtrar por entrega"`,
   y `"Cerrar"` agarraba el `"Cerrar sesión"` del sidebar.

## Dos cosas que aparecieron de costado

**El tope de registros por IP estaba justo al límite.** La suite completa hace
exactamente 10 registros por corrida y el tope era 10 por hora. Los 3 tests
nuevos la llevaron de 7 a 10. Con `retries: 1` en CI, **un solo reintento de
cualquier test hacía fallar en cascada todo lo que necesitara registrar a
alguien**, con errores sin relación con lo que se estaba probando. Ahora es
`REGISTER_RATE_LIMIT_PER_IP`, default **10** (producción, sin cambios), 200 en
el compose de desarrollo —que es el que usa CI—. Un test fija ese default para
que subirlo en producción tenga que ser explícito.

**El spec de importaciones se degradaba con el uso.** Daba verde en CI y rojo
en una máquina con varias corridas encima: la lista de proveedores ordena por
nombre y pagina de a 15, así que el proveedor recién creado terminaba fuera de
la primera página. Ahora busca por nombre antes de mirar la fila.

## Verificación

- **Backend:** `ruff` limpio, **383** tests.
- **Frontend:** `typecheck` y `eslint` limpios, **108** de vitest.
- **E2E:** **18/18** contra el stack de docker.

## Pendiente

- **La migración 019 no se probó contra una copia de producción.** Hay que
  hacerlo antes de deployar.
- **Las migraciones 007 y 009 tienen el mismo bug del CREATE TYPE** (y declaran
  los tipos con los valores en vez de los nombres). No se tocaron: Alembic no
  reejecuta revisiones aplicadas y una base nueva se arma con `create_all()` y
  se marca en head, así que ese código es inalcanzable. Si alguna vez se quiere
  una base reproducible solo con migraciones —lo que hace falta para ensayar el
  upgrade de producción— hay que arreglarlas y sumar una migración 000 con el
  esquema base. Es un change propio.
- **El estado de cobro no aparece en la tarjeta de "Mis pedidos"**, solo al
  abrir el detalle. La tarjeta ya lleva estado y total.
- **El modelo depende del tiempo de respuesta del admin.** La señal de que
  conviene integrar una pasarela va a ser esa, no el volumen de pedidos.
