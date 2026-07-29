# Design: gestión de pedidos y seguimiento del cobro

## 1. Dos ejes, no uno

El estado del pedido responde "¿en qué punto de la entrega está?". El cobro
responde "¿ya me pagó?". Son preguntas ortogonales y meterlas en un solo enum
obliga a inventar estados híbridos que después no se pueden desarmar.

```
entrega:  Pendiente → Confirmado → En proceso → Enviado → Entregado
                                                          ↘ Cancelado
cobro:    Sin cobrar → Link enviado → Pagado
```

Combinaciones legítimas que un enum único no podría expresar:

| entrega    | cobro        | situación real                            |
|------------|--------------|-------------------------------------------|
| En proceso | Pagado       | pagó por adelantado, lo estoy armando      |
| Entregado  | Sin cobrar   | cliente de confianza, paga a fin de mes    |
| Confirmado | Link enviado | hay stock, le mandé el link, espero        |

**No se validan transiciones entre ejes.** Nada impide marcar Pagado sobre un
pedido Pendiente. Es a propósito: el cobro pasa por fuera del sistema y el
sistema no tiene forma de saber la verdad. Poner reglas acá solo lograría que
el admin no pueda registrar lo que realmente pasó.

### El enum de entrega no se toca

Ya tiene el escalón que hacía falta. `Pendiente` es "entró y nadie lo miró";
`Confirmado` es "revisé stock y va". Agregar "Aprobado" para el ingreso
automático sería peor que el problema que resuelve: *aprobado* le promete al
cliente que alguien dijo que sí, que es exactamente lo que todavía no pasó.

Lo que falla no es el estado sino que el cliente no sabe qué significa, y eso
se arregla con el texto del checkout (§5).

## 2. Regla de stock al cancelar: se hereda, no se toca

`PATCH /orders/{id}` ya devuelve el stock al pasar a Cancelado y bloquea salir
de Cancelado (el stock ya se devolvió; volver a descontarlo puede dejarlo
inconsistente). Ese comportamiento queda igual.

**`payment_status` no participa de la regla de stock.** Cancelar un pedido
pagado devuelve el stock y deja el cobro en Pagado, que es la verdad: la plata
está y hay que devolverla por fuera. Ponerlo automáticamente en "Sin cobrar"
borraría el rastro de que ese cliente pagó.

## 3. El total no existe como columna, y a veces es parcial

`Order` no tiene `total`; se calcula sumando `unit_price_snapshot * quantity`
de los ítems. Pero **`unit_price_snapshot` es nullable**, porque `Product.price`
lo es: son los productos "Consultar precio".

Un total que omite en silencio esas líneas es peor que no mostrar total —
el admin lee un número que parece completo y no lo es. La respuesta de admin
devuelve entonces dos campos:

```python
total: float          # suma de las líneas con precio
items_sin_precio: int # cuántas quedaron afuera
```

y la UI muestra `$ 45.000 + 2 a consultar` cuando el segundo es distinto de
cero. El precio se sigue calculando desde el snapshot, nunca desde el producto
actual: un pedido viejo no cambia de monto porque hoy el producto valga otra
cosa.

## 4. El teléfono es opcional y se queda así

`User.phone` es nullable y el registro no lo pide. El botón de WhatsApp,
entonces, a veces no va a tener a dónde ir.

**No se agrega el teléfono al checkout.** Sumar un campo obligatorio en la
pantalla previa a confirmar es fricción en el peor lugar posible, para cubrir
un caso que se resuelve mandando un mail. Si más adelante resulta que falta
seguido, agregarlo es trivial; sacarlo una vez que la gente se acostumbró, no.

Cuando no hay teléfono, la ficha muestra el mail con un botón de copiar en
lugar del botón de WhatsApp. Nunca un botón que no lleva a ningún lado.

### El helper de WhatsApp que existe no sirve acá

`useWaLink()` arma links **hacia el número del negocio** (sale de
`settings.whatsapp_number`). Acá hace falta lo inverso: un link hacia el número
**del cliente**. Es una función aparte, no un parámetro más del hook — mezclar
las dos direcciones en un solo helper es la clase de cosa que termina mandando
un mensaje al número equivocado.

## 5. El texto del checkout

Hoy:

> **Pedido confirmado** — [Coordinar por WhatsApp]

Pasa a:

> **Pedido recibido** — N.º 00012
> Revisamos stock y te escribimos por WhatsApp para coordinar el pago.

Tres razones: *recibido* es verdad en ese instante; deja libre la palabra
*confirmado* para cuando el admin la use con su significado real; y la segunda
línea pone la expectativa correcta, que es lo que evita el mensaje de "¿che,
qué pasó con mi pedido?".

**Esto rompe un test E2E** (`shopping-flow` verifica el texto "Pedido
confirmado"). Hay que actualizar el spec en el mismo commit.

## 6. Schema de admin separado

La lista del panel necesita datos que `OrderRead` no trae: nombre, mail y
teléfono del cliente, el total y el contador de ítems sin precio. Hoy solo
viaja `user_id`, que obligaría a la UI a pedir cada usuario por separado.

Se agrega `AdminOrderRead` extendiendo `OrderRead`, en vez de engordar el
schema compartido. `GET /orders/me` no tiene por qué devolverle al cliente su
propio nombre y teléfono: ya los sabe, y cada campo de más en una respuesta es
superficie que después hay que mantener.

`payment_status`, en cambio, **sí va en `OrderRead`**: el cliente lo ve en Mis
Pedidos.

## 7. Filtros de la lista

`GET /orders` hoy solo filtra por `user_id`. Se agregan `status`,
`payment_status` y `q` (nombre o mail del cliente, y número de pedido si `q` es
numérico).

El orden por defecto sigue siendo `created_at desc`. La pregunta más frecuente
del admin es "¿qué entró hoy?", no "¿qué está pendiente?" — y para lo segundo
están los filtros.

## 8. Migración 019

```python
op.add_column("orders", sa.Column("payment_status",
    sa.Enum("Sin cobrar", "Link enviado", "Pagado", name="paymentstatus"),
    nullable=False, server_default="Sin cobrar"))
op.execute("UPDATE orders SET payment_status = 'Sin cobrar' WHERE payment_status IS NULL")
```

El `server_default` cubre las filas existentes, pero el UPDATE explícito va
igual: es la lección de la migración 013, donde depender solo del default
hubiera dejado el catálogo vacío si algo salía distinto de lo esperado. El
`downgrade` dropea la columna **y el tipo** (`DROP TYPE IF EXISTS paymentstatus`),
como hace la 009 — si no, volver a aplicar la migración falla porque el tipo ya
existe.

Se sigue el patrón de la 009 (`sa.Enum` con los valores en castellano como
valores del tipo), no porque sea ideal —los valores de un enum en la base
idealmente son estables y los textos cambian— sino porque **es lo que ya hacen
`orderstatus`, `paymentmethod` y `quotestatus`**. Introducir un criterio nuevo
para una sola columna deja el esquema con dos convenciones y ninguna razón
visible para elegir entre ellas.

> **Corrección — lo de arriba estaba mal y lo encontró el arranque del stack.**
>
> `op.add_column()` con un `sa.Enum` **no emite el CREATE TYPE**. Alembic solo
> crea el tipo cuando crea la tabla entera, así que el ALTER TABLE falla con
> `type "paymentstatus" does not exist`.
>
> La 009 tiene el mismo bug y nunca se manifestó porque en las bases donde
> corrió el tipo `paymentmethod` ya existía, creado por `create_all()` desde el
> modelo. Copiar "el patrón que ya usa el proyecto" no garantizó nada: ese
> patrón nunca se había ejercido en las condiciones que lo rompen.
>
> La forma correcta es declarar el tipo con `create_type=False` y crearlo
> explícitamente con `checkfirst=True` antes del `add_column`. No hace falta
> arreglar la 009: con el entrypoint actual una base vacía se marca en head y
> nunca vuelve a ejecutar la cadena vieja.

## 9. Riesgos

| Riesgo | Mitigación |
|---|---|
| El admin marca Pagado sin que haya entrado la plata | Ninguna técnica: el sistema no puede verificarlo. Queda auditado con actor y fecha. |
| Pedido entregado que nunca se cobró | El filtro por cobro lo hace visible en dos clicks; hoy es invisible. |
| El cliente no tiene teléfono cargado | Fallback a mail (§4). |
| El texto del checkout rompe el E2E | Se actualiza el spec en el mismo commit (§5). |
