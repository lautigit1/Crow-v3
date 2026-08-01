# Design: cerrar el circuito de cotizaciones

## 1. Las opciones son filas, no columnas

```
quote_options
  id
  quote_id      FK quotes, ON DELETE CASCADE, index
  title         String(120)   -- "Original Bosch", "Alternativo Valeo"
  detail        String(400), nullable
  unit_price    Numeric(12,2)
  quantity      Integer, default 1
  lead_time     String(60), nullable  -- "3 a 5 días hábiles"
  created_at
```

Tres columnas en `quotes` (`precio_1`, `precio_2`, `precio_3`) sería más rápido
de escribir y se rompe la primera vez que quieras cotizar cuatro cosas. Filas no
tienen techo y permiten ordenar, borrar y agregar sin migración.

**`lead_time` es texto, no un número de días.** Lo que le decís al cliente es "3
a 5 días" o "depende de si lo tiene el importador", y eso no entra en un entero.
Un campo numérico obligaría a inventar precisión que no tenés.

**El precio es unitario y hay cantidad**, para que una cotización de 4 pastillas
no te obligue a multiplicar a mano.

## 2. Qué se agrega a `quotes`

```
answered_at    DateTime, nullable   -- cuándo se respondió
order_id       FK orders, nullable  -- el pedido que salió de acá
```

`answered_at` como fecha y no un booleano, mismo criterio que `read_at` en
notificaciones: responde además cuánto tardaste, que es un número que vas a
querer mirar.

`order_id` en `quotes` y no `quote_id` en `orders`: la cotización es la que
tiene una vida más larga y la que consultás. Y deja explícito que **una
cotización genera como mucho un pedido** — si el cliente después pide otra cosa,
es otra cotización.

## 3. A nombre de quién queda el pedido

Este es el punto difícil. `Order.user_id` es **no nullable**, y una cotización
puede venir del formulario público sin ninguna cuenta detrás.

Tres casos, tres respuestas:

| Cotización | Al convertir |
|---|---|
| De un cliente con cuenta (`user_id`) | Se usa esa cuenta. Directo. |
| Anónima **con** mail | Se crea la cuenta con los datos de la cotización y se le manda el correo para que defina su contraseña |
| Anónima **sin** mail | **No se puede convertir.** El panel lo dice y ofrece asociar un cliente existente |

**Por qué crear la cuenta en el segundo caso y no hacer `user_id` nullable.** Un
pedido sin dueño rompe cosas que ya funcionan: "Mis pedidos" no tendría a quién
mostrárselo, las notificaciones no tendrían destinatario, y el panel perdería el
nombre y el teléfono del cliente en la lista. Sería un tipo de pedido de segunda
categoría que hay que contemplar en cada consulta futura.

**El correo para definir la contraseña reusa el flujo de reset que ya existe** —
`create_reset_token` + la plantilla que ya está. No hay nada nuevo que construir
ahí, y la cuenta nace sin contraseña utilizable hasta que la persona la define.

**El tercer caso no es un error del sistema**: alguien dejó una consulta con un
teléfono nada más. El panel tiene que decirlo con esas palabras y ofrecer la
salida, no tirar un 500.

## 4. La línea libre no mueve stock

El ítem del pedido se crea con `product_id = NULL` y los datos en los snapshots
que `OrderItem` ya tiene (`sku_snapshot`, `name_snapshot`,
`unit_price_snapshot`). El modelo ya lo soporta.

**Y no se descuenta stock, porque no hay producto que descontar.** Es correcto —
lo estás trayendo a pedido, no sacándolo de una estantería — pero tiene que
quedar escrito, porque `create_order` sí mueve stock y alguien va a asumir que
este camino hace lo mismo.

Por lo mismo, **cancelar un pedido convertido no devuelve nada**: `_restore_stock`
ya saltea las líneas sin `product_id`, así que funciona sin tocarlo.

## 5. Un endpoint aparte, no un parámetro de `create_order`

```
POST /api/quotes/{id}/convert   (admin)
     body: { option_id }
```

`create_order` valida producto, stock y tope de pedidos por usuario. Ninguna de
esas reglas aplica acá: no hay producto, no hay stock, y el que crea el pedido es
el admin, no el cliente. Meterlo ahí con un `if` convertiría una función con
reglas claras en una con dos modos y la mitad de las validaciones apagadas.

El endpoint nuevo hace lo suyo: valida que la cotización tenga esa opción, que no
esté ya convertida, resuelve el cliente (§3), crea el pedido con la línea libre,
enlaza y notifica.

## 6. Estados de la cotización

No se agregan estados. Los cuatro que hay alcanzan:

- **Nueva** → entró
- **En revisión** → la estás averiguando
- **Respondida** → cargaste las opciones (se setea solo al guardar la primera)
- **Finalizada** → se convirtió en pedido, o murió ahí

Que "Respondida" se ponga solo al cargar una opción evita el caso de siempre:
alguien carga los precios y se olvida de cambiar el estado, y el cliente nunca
se entera.

## 7. Vehículo obligatorio

En el formulario público. Mismo razonamiento que el teléfono en el registro: es
el dato sin el cual no podés hacer tu trabajo, y pedirlo en el momento en que la
persona ya está escribiendo su consulta es marginal.

**Rompe los tests que crean cotizaciones sin vehículo** — `test_quotes.py` y el
helper `_quote` de `test_security_hardening.py`. Es el mismo radio de explosión
que tuvo el teléfono, y se arregla en el mismo commit.

## 8. Avisos

Reusa `notificar()` tal cual:

| Momento | Campana | Email |
|---|---|---|
| Se responde la cotización | sí, al dueño | sí |
| Se convierte en pedido | sí | sí — es el aviso de pedido que ya existe |

Para las anónimas con mail, solo correo. Ya está resuelto así en
`_avisar_cotizacion_respondida`.

## 9. Riesgos

| Riesgo | Mitigación |
|---|---|
| Convertir dos veces la misma cotización | `order_id` no nulo bloquea la segunda conversión |
| Crear cuentas duplicadas al convertir | Se busca por email antes de crear |
| El precio cotizado envejece | Queda en el snapshot del pedido; la cotización guarda el suyo. Ninguno se recalcula |
| Cuentas creadas que nadie usa | Nacen sin contraseña utilizable; si no definen una, no hay acceso |
