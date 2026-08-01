# Apply: cerrar el circuito de cotizaciones

## Resumen

La cotización **ya no muere en el estado "Respondida"**. Antes el sistema
guardaba lo que el cliente pedía y en qué estado estaba la consulta, pero no la
respuesta: ni precio, ni plazo. En un negocio que trae a pedido, esa respuesta
ES la venta, y quedaba entera en WhatsApp.

Ahora el admin carga las alternativas cotizadas —original, alternativo, usado—,
el cliente las ve con precio y plazo, y una de ellas se convierte en pedido con
un clic.

## Migración

- **`021_quote_options`** — tabla `quote_options` con índice por `quote_id`, más
  `answered_at` y `order_id` en `quotes`. Sin enums nuevos, así que no aplica la
  trampa de las etiquetas que costó la 019.

## Archivos

**Backend — nuevos:** `alembic/versions/021_quote_options.py`,
`templates/emails/account_created.{html,txt}.jinja`.
Tests: `test_quote_options.py` (14), `test_quote_convert.py` (23).

**Backend — modificados:** `models/quote.py` (`QuoteOption` + dos campos),
`models/__init__.py`, `schemas/quote.py`, `api/routes/quotes.py` (cuatro
endpoints), `core/email.py` (un builder), `tests/test_quotes.py`,
`tests/test_security_hardening.py`.

**Frontend — nuevos:** `pages/admin/ui/QuoteSheet.tsx`. Tests:
`AdminQuotesPage.test.tsx` (12), `MyQuotesPage.test.tsx` (7),
`e2e/quote-to-order.spec.ts` (2).

**Frontend — modificados:** `entities/quote/index.ts`,
`pages/admin/AdminQuotesPage.tsx`, `pages/account/MyQuotesPage.tsx`,
`features/quote/QuoteModal.tsx`, `shared/ui/Modal.tsx` (nombre accesible de la
X, ver abajo).

## Decisiones

- **Las opciones son filas, no columnas.** `precio_1`, `precio_2`, `precio_3` se
  rompe la primera vez que hay que cotizar cuatro cosas.
- **`lead_time` es texto.** Lo que se le dice al cliente es "3 a 5 días" o
  "depende del importador", y eso no entra en un entero de días. Un campo
  numérico obligaría a inventar precisión que no se tiene.
- **"Respondida" se setea solo** al cargar la primera opción. Que dependa de que
  alguien se acuerde de moverlo a mano es la forma segura de que el cliente
  nunca se entere de que ya lo cotizaste — que es justamente el agujero que este
  change vino a tapar.
- **El aviso al cliente sale una sola vez.** Cargar una segunda alternativa
  cinco minutos después no es una novedad: es la misma respuesta terminándose de
  escribir. Tres correos por la misma consulta se leen como un error del sistema.
- **Borrar la última opción NO deshace la respuesta.** El cliente ya recibió el
  correo; revertir el estado no revierte lo que salió.
- **Endpoint propio para convertir**, no un modo de `create_order`. Aquel valida
  producto, stock y tope de pedidos por usuario, y ninguna de esas reglas aplica:
  no hay producto, no hay stock, y el que crea el pedido es el admin.
- **Línea libre sin producto y sin mover stock.** Se está trayendo a pedido, no
  sacando de una estantería. Por lo mismo, cancelar el pedido resultante no
  devuelve nada: `_restore_stock` ya saltea las líneas sin `product_id`.
- **Anónima con mail → se crea la cuenta.** Un pedido sin dueño rompe "Mis
  pedidos", las notificaciones y la lista del panel: sería un pedido de segunda
  categoría a contemplar en cada consulta futura. La cuenta nace **sin
  contraseña utilizable** (hash de un secreto aleatorio).
- **Anónima sin mail → 409 con instrucciones.** No es un error del sistema:
  alguien dejó su consulta con un teléfono nada más.
- **El pedido nace Pendiente.** "Confirmado" significa que se verificó stock y
  precio con el proveedor, y convertir no es eso.
- **El botón de convertir dice por qué está deshabilitado**, en el orden en que
  la persona lo resolvería: faltan opciones → falta contacto → falta elegir cuál.
  El del medio ni siquiera se arregla en esa pantalla.

## Lo que se descubrió en el camino

**`admin_reply` era un campo fantasma.** El tipo `Quote` del frontend lo
declaraba y `MyQuotesPage` pintaba una caja "Respuesta del equipo" con él, pero
**el backend nunca lo devolvió, en ninguna versión**. Esa caja no se mostró
jamás: el cliente veía su cotización en "Respondida" y no tenía ninguna forma de
ver qué se le había cotizado. El agujero que este change venía a tapar estaba
disimulado por un tipo que mentía.

**Los tests con mocks no lo habrían detectado**, y conviene que quede escrito: un
mock que incluya `admin_reply` hace pasar el bug igual. Contra el tipo del front
declarando algo que la API no manda, lo único que protege es el E2E.

**El vehículo obligatorio va en `QuoteCreate`, NO en `QuoteBase`.** `QuoteRead`
hereda del mismo base: volverlo obligatorio ahí haría que listar el historial
—lleno de cotizaciones anteriores a este cambio— devuelva un 500. Hay un test
que lee una cotización vieja sin vehículo justamente para fijar eso. Y
`min_length=1` no alcanza: `"   "` son tres caracteres y pasa.

**La búsqueda del cliente por email va en minúsculas.** Si cotizó como `Juan@…`
y se había registrado como `juan@…`, la comparación exacta no lo encuentra, se
intenta crear la cuenta y el INSERT explota contra el índice único. Era el riesgo
"cuentas duplicadas" del diseño entrando por una puerta que el diseño no miraba.

**Desvío de diseño: el correo de la cuenta nueva.** El diseño decía reusar la
plantilla de reset. No se puede: dice *"recibimos una solicitud para restablecer
la contraseña de tu cuenta"*, y a alguien que nunca se registró le afirma dos
cosas falsas. Se lee como un intento de entrar a una cuenta ajena —la forma
exacta de un phishing— y la reacción sana es borrarlo, perdiendo el único enlace
que le permite ver su pedido. El mecanismo sí se reusa (`create_reset_token`, un
uso, 60 minutos); cambia lo que el correo dice que pasó. Y **reemplaza** al aviso
normal de pedido: mandarle "entrá a ver tus pedidos" a alguien que todavía no
puede entrar es mandarlo a una pared.

**El plazo prometido se habría perdido.** `OrderItem` no tiene dónde guardarlo,
así que sin meterlo en `notes` lo único que sobrevivía de la cotización era el
precio — y el plazo es lo que se le prometió al cliente. Va ahí junto al número
de consulta y el vehículo. Por lo mismo `sku_snapshot`, que es obligatorio y acá
no existe, quedó como `COT-00012`: permite volver de una línea de pedido a la
consulta que la generó.

**El formulario público hablaba de "tú".** Era el único del sitio que no voseaba
("Cuéntanos qué necesitas", "puedes acelerar"). En Argentina se lee como
traducción. Corregido de paso.

**Dos botones con el mismo nombre accesible, en un componente compartido.**
`shared/ui/Modal.tsx` le ponía `aria-label="Cerrar"` a la X del encabezado, y
varias ventanas traen además un botón "Cerrar" en el pie. Dos controles con el
mismo nombre dentro del mismo diálogo son indistinguibles para quien navega con
lector de pantalla: escucha "Cerrar, botón" dos veces sin saber cuál es cuál. La
X pasó a **"Cerrar ventana"**. Lo encontró un test que no podía apuntarle a
ninguno de los dos, que es la señal habitual de este problema. El `Drawer` queda
como estaba: su X es la única "Cerrar" que hay, y dos E2E la usan por ese nombre.

**Cuatro fallas seguidas del E2E, todas del test y ninguna de la app.** Dos
colisiones de nombre accesible (`getByLabel` hace coincidencia por subcadena, y
"Repuesto" agarraba el logo "Crow Repuestos"), el Drawer tapando el botón de
logout con su overlay `fixed inset-0`, y un login del cliente sin esperar el
redirect —el `goto` siguiente abortaba el POST en vuelo y la app rebotaba a
/login—. El `error-context.md` que deja Playwright trae el snapshot del DOM y lo
decía en la primera línea; leer solo el mensaje de error costó dos vueltas de más.

## Verificación

- **Backend:** `ruff` limpio, **496** tests (eran 453).
- **Frontend:** `typecheck`, `eslint` y `steiger` limpios, **157** de vitest
  (eran 138).
- **E2E:** 25 specs. Los 23 previos pasaron en la corrida completa; los 2 nuevos
  se arreglaron **después** de esa corrida.

## Pendiente

- ⚠ **Confirmar `npm run e2e` completo en verde** con la última versión del spec.
- **Una opción = una línea de pedido.** Si alguna vez se cotiza un combo
  (pastillas + discos) con un precio total, esto se queda corto.
- **No se guarda de qué proveedor sale cada opción.** Sería útil para repetir la
  compra y `suppliers` ya existe; queda afuera para no agrandar la primera
  versión.
- **El cliente no acepta desde el sitio.** Convierte el admin, y la confirmación
  se coordina por WhatsApp. Es deliberado mientras no haya pagos en línea.
