# Design: centro de notificaciones y avisos por email

## 1. Un solo lugar que reparte a los tres canales

El riesgo de este change es la **divergencia entre canales**. Si el aviso de la
campana se escribe en un lado, el email en otro y el evento SSE en un tercero,
tarde o temprano un estado nuevo aparece en dos de los tres y nadie se da
cuenta hasta que un cliente pregunta.

Por eso hay una sola puerta:

```python
notificar(db, usuario_id, tipo, titulo, cuerpo, enlace, *, email=None)
#   1. inserta la fila en `notifications`
#   2. publica el evento SSE al canal de esa persona  → la campana se actualiza
#   3. si `email` viene, lo encola en background     → sale el correo
```

Quien cambia un estado llama a `notificar()` y no piensa en canales. Agregar un
origen nuevo es una línea, y no se puede olvidar de uno de los tres.

**Ningún paso puede voltear la operación.** Todo lo que no sea el `INSERT` va en
`try/except` con log: que falle el aviso no puede hacer fallar el cambio de
estado del pedido. Es la misma regla que ya aplica el broker de eventos.

## 2. La tabla

```
notifications
  id
  user_id      FK users, ON DELETE CASCADE, index
  type         enum: order_status | order_payment | quote_answered
  title        String(120)
  body         String(400), nullable
  link         String(200), nullable   -- ej. /cuenta/pedidos
  read_at      DateTime, nullable      -- NULL = no leída
  created_at   DateTime
```

**`read_at` como fecha y no un booleano `is_read`.** Cuesta lo mismo y responde
una pregunta más: *cuánto tardó en verlo*. Un booleano solo dice si lo vio.

**Índice compuesto `(user_id, read_at)`.** La consulta que corre en cada carga
de página es "cuántas no leídas tiene esta persona", y sin ese índice es un scan
de la tabla entera a medida que crece.

**El texto se guarda ya redactado**, no se arma al leer. Si un pedido pasa de
Confirmado a Cancelado, la notificación vieja tiene que seguir diciendo lo que
decía cuando se emitió — no reinterpretarse con el estado actual. Es un registro
de algo que pasó, no una vista del presente.

## 3. Endpoints

```
GET   /api/notifications?unread_only=&skip=&limit=   propias, paginadas
GET   /api/notifications/unread-count                 solo el número
PATCH /api/notifications/{id}/read                    marcar una
PATCH /api/notifications/read-all                     marcar todas
```

Todos operan **siempre sobre `current_user`**. No existe forma de pedir las
notificaciones de otra persona: no se acepta un `user_id` por parámetro, así que
no hay nada que validar y por lo tanto nada que se pueda validar mal.

`unread-count` va aparte de la lista porque es lo único que necesita el badge
del navbar en cada página. Traer la lista completa para mostrar un número sería
mover datos de más en la consulta más frecuente de la app.

## 4. El interruptor del email

El email sale solo en cuatro transiciones:

| Eje | Estados que avisan | Estados que no |
|---|---|---|
| Entrega | Confirmado, Enviado, Entregado | Pendiente, En proceso, Cancelado |
| Cobro | Pagado | Sin cobrar, Link enviado |

"En proceso" y "Link enviado" son estados de tu operación interna: no cambian
nada del lado del cliente. Quedan en la campana, que es gratis, y no en la
casilla.

**Cancelado no manda email a propósito.** Un pedido se cancela por algo —falta
de stock, el cliente cambió de idea— y eso siempre viene con una conversación
por WhatsApp. Un correo automático diciendo "tu pedido fue cancelado", sin
contexto ni motivo, llega peor que no llegar.

## 5. Cotizaciones sin dueño

`Quote.user_id` es nullable y `customer_email` también. Tres casos:

| Situación | Campana | Email |
|---|---|---|
| Cotización de un usuario con cuenta | sí | sí, si tiene mail |
| Anónima con mail | no hay a quién | sí |
| Anónima sin mail | no | no |

El tercer caso **no es un error y no se registra como fallo**: alguien dejó una
consulta con teléfono nada más, y el contacto va a ser por WhatsApp. Lo que no
puede pasar es que reviente el cambio de estado de la cotización por intentar
notificar a nadie.

Solo se notifica al pasar a **Respondida**. "En revisión" y "Finalizada" son
estados de tu flujo interno.

## 6. La campana en vivo

Ya existe el canal SSE y ya existe el canal por usuario (`user:{id}`). Se agrega
un tipo de evento:

```json
{ "type": "notification.created" }
```

Sin `id` ni contenido: el frontend invalida el contador y la lista, y los vuelve
a pedir. Mismo criterio que con los pedidos —el evento es una señal, no los
datos— por las mismas tres razones: no se filtra nada por el canal, hay un solo
camino de lectura, y reconectar no requiere reproducir nada.

## 7. Dónde vive en el frontend

- `entities/notification/` — tipos, api y queries. Es una entidad de dominio
  propia, no una parte de `order`.
- `features/notifications/NotificationBell.tsx` — la campana con su panel.
  Va en `features` porque es una interacción completa, no un widget de
  presentación.
- Se monta en el navbar, visible para cualquier sesión iniciada.

El contador se pide con `staleTime` corto y se invalida por el evento SSE. No
hay sondeo: para eso está el canal.

## 8. Riesgos

| Riesgo | Mitigación |
|---|---|
| La tabla crece sin techo | Con este volumen no es problema en años. Anotado como pendiente, no resuelto: una limpieza de leídas con más de N meses es trivial de agregar cuando haga falta. |
| El email falla y el estado no cambia | Todo el fan-out va en `try/except`; el envío ya es en background |
| Dos admins reciben la misma notificación | Es correcto: cada uno tiene su fila y su estado de lectura |
| El texto guardado envejece mal | Es deliberado (§2): registra lo que pasó, no el presente |
