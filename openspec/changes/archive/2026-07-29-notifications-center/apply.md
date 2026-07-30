# Apply: centro de notificaciones y avisos por email

## Resumen

Los avisos ahora **dejan rastro**. Antes existían pero se perdían: la barra de
"pedidos nuevos" del panel solo aparecía si estabas mirando la pantalla en ese
momento, y el cliente veía moverse su pedido únicamente si tenía la página
abierta.

Ahora hay una tabla `notifications`, una campana en el navbar con contador y
panel, y correos al cliente en los cuatro cambios que le importan.

## Migración

- **`020_notifications`** — tabla + dos índices compuestos:
  `(user_id, read_at)` para el contador del navbar —la consulta más frecuente de
  la app— y `(user_id, created_at)` para la lista paginada.

## Archivos

**Backend — nuevos:** `models/notification.py`, `core/notify.py`,
`core/order_notify.py`, `schemas/notification.py`,
`api/routes/notifications.py`, `alembic/versions/020_notifications.py`.
Plantillas: `_base.html.jinja`, `order_update.{html,txt}.jinja`,
`quote_answered.{html,txt}.jinja`. Tests: `test_notify.py` (14),
`test_order_notify.py` (17), `test_notifications_api.py` (16).

**Backend — modificados:** `core/email.py` (dos builders nuevos),
`api/routes/orders.py`, `api/routes/quotes.py`, `api/__init__.py`,
`models/__init__.py`, `templates/emails/reset_password.*` (pasaron a extender la
base).

**Frontend — nuevos:** `entities/notification/{index,queries}.ts`,
`features/notifications/NotificationBell.tsx`,
`shared/lib/notificationSound.ts`. Tests: `NotificationBell.test.tsx` (17),
`notificationSound.test.ts` (7), `e2e/notifications.spec.ts` (3).

**Frontend — modificados:** `widgets/navbar/Navbar.tsx`, `shared/ui/Icon.tsx`
(íconos `volumeOn`/`volumeOff`), `playwright.config.ts`, `e2e/helpers.ts`.

**Infra:** `.github/workflows/e2e.yml`.

## Decisiones

- **Una sola puerta.** `notificar()` inserta la fila, publica el evento SSE y
  encola el correo. El riesgo de este change era la divergencia entre los tres
  canales: si cada uno se escribe en un lugar distinto, tarde o temprano un
  estado nuevo aparece en dos de los tres y nadie se entera hasta que un cliente
  pregunta.
- **Solo el INSERT puede fallar hacia afuera.** El evento y el correo van en
  `try/except`: un pedido confirmado sin notificar es un inconveniente; un
  pedido que no se confirma porque el SMTP rechazó la conexión es un problema.
- **El texto se guarda ya redactado.** Si un pedido pasa de Confirmado a
  Cancelado, la notificación vieja sigue diciendo lo que decía: es el registro
  de algo que pasó, no una vista del presente.
- **`read_at` como fecha, no booleano.** Cuesta lo mismo y responde además
  cuánto tardó la persona en verla. Marcar leída es idempotente para no
  reescribir ese dato.
- **Los endpoints no aceptan `user_id`.** Siempre `current_user`: no hay permiso
  que validar y por lo tanto no hay permiso que se pueda validar mal.
- **404 y no 403** para la notificación de otra persona: un 403 le confirmaría a
  quien prueba IDs al azar que ese registro existe.
- **Una fila por admin**, no una compartida: que uno la lea no puede marcarla
  como leída para el resto.
- **El email sale en cuatro transiciones** (Confirmado, Enviado, Entregado,
  Pagado) y **un solo correo si los dos ejes cambian a la vez**. Cancelado no
  manda: se cancela por algo, y eso viene con una conversación por WhatsApp.
- **La lista se pide solo al abrir el panel.** El contador va en cada carga de
  página; traer la lista para un panel que puede no abrirse nunca sería trabajo
  de más en la request más frecuente del sitio.
- **Sonido generado con Web Audio**, sin archivo. Apagable con preferencia
  persistida, con antirrebote de 1,5 s —dos avisos simultáneos suenan a error
  del sistema— y falla en silencio, porque el autoplay bloqueado es el
  comportamiento normal y no un error que reportar.

## Lo que se descubrió en el camino

**Las cotizaciones pueden ser anónimas.** `Quote.user_id` y `customer_email` son
los dos opcionales, así que hay consultas sin nadie a quien avisar. Se resolvió
con tres casos explícitos, y el helper **no valida nada**: decide y sale. Lo
único inaceptable sería que el cambio de estado falle por no tener destinatario.

**La credencial del admin de los E2E estaba escrita a mano.** Cuando cambió
`SEED_ADMIN_EMAIL`, los 23 tests fallaron con *"expected /admin, got /login"* —
un error que no insinúa en ningún momento que el problema sea una credencial
desincronizada. Ahora `playwright.config.ts` carga el `.env` de la raíz y
`helpers.ts` toma `E2E_ADMIN_*` → **`SEED_ADMIN_*`** → default, así que sale del
mismo lugar que siembra la base. En CI van explícitas en los dos pasos con un
comentario que avisa que tienen que coincidir.

**Dos colisiones de nombre accesible, encontradas antes de ejecutar:** el panel
de la campana tiene `aria-label="Notificaciones"` igual que el botón, y el
botón de sonido decía "Silenciar notificaciones" —que contiene la etiqueta de la
campana—. Dos etiquetas donde una contiene a la otra hacen ambigua cualquier
búsqueda por nombre, para un lector de pantalla y para los tests.

**`_base.html.jinja` no estaba en el plan.** Copiar el layout de la plantilla de
reset en cada aviso nuevo garantizaba tres variantes distintas en tres meses.

**TanStack Query v5 pasa un segundo argumento a `mutationFn`.** Un
`toHaveBeenCalledWith(1)` exacto falla por eso. Es la tercera vez en la sesión
que un test se rompe por asumir el comportamiento de una librería en vez de
verificarlo.

## Verificación

- **Backend:** `ruff` limpio, **443** tests (eran 396).
- **Frontend:** `typecheck`, `eslint` y `steiger` limpios, **136** de vitest.
- **E2E:** **23** specs escritos.

## Pendiente

- ⚠ **La fase 5 no se hizo: el teléfono sigue siendo opcional en el registro.**
  Estaba planificada acá con su radio de explosión anotado —hay que actualizar
  `registerNewCustomer` en `helpers.ts` o fallan los ~10 E2E que registran a
  alguien— y quedó afuera. Es un change chico y propio.
- ⚠ **La suite completa no volvió a correr en verde después del arreglo de la
  credencial del admin.** Los 6 tests del sonido y los 3 E2E de notificaciones
  no se ejecutaron nunca todavía.
- **Migración 020 contra una copia de producción** antes de deployar.
- **La tabla crece sin techo.** Con este volumen no es problema en años; borrar
  leídas con más de N meses es trivial cuando lo sea.
- **Sin notificación del navegador ni push.** La tabla y el canal quedan listos.
- **Solo pedidos y cotizaciones.** El mecanismo es genérico: importaciones y
  stock podrían usarlo.
