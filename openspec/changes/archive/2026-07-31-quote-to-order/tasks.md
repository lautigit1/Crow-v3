# Tasks: cerrar el circuito de cotizaciones

Cuatro fases. La 1 y la 2 son backend; recién en la 3 se ve algo.

---

## Fase 1 — Opciones de cotización

- [x] **1.1** Migración `021_quote_options`. Sin enums nuevos, así que no aplica
      la trampa de las etiquetas que nos costó la 019.
- [x] **1.2** `models/quote.py`: `QuoteOption` + `answered_at` + `order_id`.
      Índice espejado en `__table_args__` — en desarrollo y tests el esquema
      sale de `create_all()`, no de Alembic.
- [x] **1.3** Endpoints de admin: agregar, editar y borrar opciones.
      → El PATCH acepta campos sueltos (`exclude_unset`): se edita un precio sin
      reenviar la fila entera.
      → Los tres devuelven la **cotización completa**, no la opción: la pantalla
      necesita la lista actualizada y el estado, y así no hace una segunda
      request para refrescar.
- [x] **1.4** `Respondida` y `answered_at` se setean solos con la primera opción.
      → **Y el aviso al cliente sale una sola vez.** Cargar una segunda
      alternativa cinco minutos después no es una novedad: es la misma respuesta
      terminándose de escribir.
      → **Borrar la última opción NO deshace la respuesta.** El cliente ya
      recibió el correo, y revertir el estado del lado del sistema no revierte
      lo que ya salió.
- [x] **1.5** Tests: **14** (backend: 467). Incluye el cascade, verificado con
      un COUNT contra la base y no con `db.get()`, que devuelve el objeto de la
      sesión sin ir a consultar.

## Fase 2 — Convertir en pedido

- [x] **2.1** `POST /quotes/{id}/convert` (admin), con `option_id` en el body.
      Endpoint propio, **no** un modo de `create_order` (design §5).
      → Devuelve el **pedido**, no la cotización: después de convertir, donde el
      admin quiere estar es en el pedido.
      → El pedido nace **Pendiente**. "Confirmado" significa que verificaste
      stock y precio con el proveedor, y convertir no es eso.
- [x] **2.2** Los tres casos de design §3, más dos que el diseño no contemplaba:
      → **La búsqueda por email va en minúsculas.** Cotizó como `Juan@…` y se
      había registrado como `juan@…`: con comparación exacta no lo encuentra y
      el INSERT explota contra el índice único. Era el bug de la cuenta
      duplicada (D9) entrando por la puerta de al lado.
      → **Cuenta desactivada → 409.** Ni crear el pedido en una cuenta sin
      acceso, ni crear una segunda cuenta con el mismo mail.
- [x] **2.3** Cuenta creada desde los datos de la cotización, con
      `create_reset_token`. Nace con un hash de un secreto aleatorio: **sin
      contraseña utilizable** hasta que la persona defina la suya.
      → ⚠ **Plantilla propia, NO la de reset** (desvío de design §3, ver abajo).
- [x] **2.4** Pedido con línea libre (`product_id = NULL`) y los snapshots.
      **Sin tocar stock.**
      → `sku_snapshot` es obligatorio y no hay ninguno: va `COT-00012`, que
      permite volver de una línea de pedido a la consulta que la generó.
      → **El plazo prometido va en `notes`.** `OrderItem` no tiene dónde
      guardarlo, y sin esto lo único que sobrevive de la cotización es el precio.
- [x] **2.5** `quote.order_id`, estado `Finalizada`, y `quote.user_id` cuando
      entró anónima — si no, el cliente entra a "Mis cotizaciones" y no ve la
      consulta que originó su propio pedido.
- [x] **2.6** Tests: **23** (backend: 490). Incluye que no convierta dos veces,
      que no mueva stock, y que cancelar el pedido resultante no rompa.

### Desvío de diseño: el correo de la cuenta nueva

design §3 decía reusar la plantilla de recuperación de contraseña. **No se
puede.** Esa plantilla dice "recibimos una solicitud para restablecer la
contraseña de tu cuenta", y para alguien que nunca se registró eso es falso dos
veces: no pidió nada y no tenía cuenta. El correo se lee como un intento de
entrar a una cuenta ajena — que es la forma exacta de un phishing — y la
reacción sana es borrarlo. Con él se pierde el único enlace que le permite ver
su pedido.

El mecanismo sí se reusa: `create_reset_token`, un solo uso, 60 minutos. Lo que
cambia es lo que el correo dice que pasó.

Y **reemplaza** al aviso normal de pedido en vez de sumarse: mandarle a alguien
que todavía no puede entrar un mail que lo invita a "ver tus pedidos" es
mandarlo a una pared. La campana se registra igual y lo espera adentro.

## Fase 3 — Pantallas

- [x] **3.1** `QuoteSheet`: ficha en un Drawer con cliente, consulta y las
      opciones con alta y edición en línea.
      → La ficha se referencia **por id, no por objeto**: los endpoints de
      opciones devuelven la cotización entera, así que guardar el objeto dejaría
      la ficha mostrando una copia vieja mientras la tabla ya se actualizó.
      → La lista gana una columna **"Cotizado"** con el precio más bajo: antes
      mostraba el estado pero no si había un precio detrás.
- [x] **3.2** Botón **Convertir en pedido** con radio de selección y
      confirmación.
      → El impedimento se **dice**, en el orden en que la persona lo
      resolvería: faltan opciones → falta contacto → falta elegir cuál. Un botón
      gris sin explicación obliga a adivinar, y el caso sin contacto ni siquiera
      se arregla en esta pantalla.
      → La confirmación avisa cuándo se le va a **crear una cuenta** al cliente.
      Es un efecto sobre una persona que no lo pidió; no puede pasar callado.
- [x] **3.3** `MyQuotesPage` muestra las opciones con precio y plazo.
      → ⚠ **`admin_reply` era un campo fantasma.** Estaba declarado en el tipo
      del front pero el backend NUNCA lo devolvió: la caja amarilla "Respuesta
      del equipo" leía `undefined` y no se mostró jamás. El cliente no tenía
      forma de ver lo cotizado ni cuando el estado decía "Respondida". Eliminado.
      → Dice "escribinos por WhatsApp para confirmar": no hay botón de aceptar,
      y sin esa línea la pantalla parece estar esperando una acción que no existe.
- [x] **3.4** Enlace en las dos puntas: la lista del panel muestra "→ pedido
      00042" y la tarjeta del cliente lleva a Mis pedidos.
- [x] **3.5** Tests: **19** (AdminQuotesPage 12, MyQuotesPage 7).
      → ⚠ Mockean la API, así que **no** habrían detectado el bug de
      `admin_reply`: un mock que incluya el campo lo hace pasar igual. Contra el
      tipo del front declarando algo que la API no manda, lo único que protege
      es el E2E de la fase 4.

## Fase 4 — Vehículo obligatorio y verificación

- [x] **4.1** `vehicle` obligatorio, **solo en `QuoteCreate`**.
      → ⚠ **No en `QuoteBase`.** `QuoteRead` hereda del mismo base: volverlo
      obligatorio ahí haría que listar el historial —lleno de cotizaciones
      anteriores a este cambio, sin vehículo— devuelva un 500. Hay un test que
      lee una cotización vieja justamente para fijar eso.
      → `min_length=1` no alcanza: `"   "` son tres caracteres y pasa. Va un
      validador que hace `strip()`.
- [x] **4.2** Tests arreglados: `test_quotes.py` (`test_create_quote_minimal`,
      `test_create_quote_missing_name`) y el helper `_quote` de
      `test_security_hardening.py`.
- [x] **4.3** E2E `quote-to-order.spec.ts`: consulta pública → dos opciones →
      convertir → el cliente ve precio, plazo y su pedido. Más un segundo test
      de que no se puede consultar sin vehículo.
- [x] **4.4** `ruff` ✔ · backend **496** ✔ · `tsc` ✔ · `eslint` ✔ · `steiger` ✔ ·
      vitest **157** ✔ (corridos por Lauti; en este entorno el runner se cuelga
      antes de recolectar).
      → ⏳ **`npm run e2e` pendiente**: los 2 specs nuevos nunca se ejecutaron.

### De yapa: el formulario hablaba de "tú"

`QuoteModal` decía "Cuéntanos qué necesitas", "puedes acelerar", "que buscas".
Es el único formulario del sitio que no vosea, y en Argentina el "tú" se lee
como traducción. Cambiado a "Contanos qué necesitás".

---

## Decisiones tomadas

| # | Decisión | Dónde |
|---|---|---|
| D1 | Varias opciones por cotización, como filas | design §1 |
| D2 | `lead_time` es texto, no un número de días | design §1 |
| D3 | `order_id` vive en `quotes`: una cotización → un pedido | design §2 |
| D4 | Anónima con mail → se crea la cuenta; sin mail → no se convierte | design §3 |
| D5 | Línea libre sin producto y **sin mover stock** | design §4 |
| D6 | Endpoint propio, no un modo de `create_order` | design §5 |
| D7 | "Respondida" se setea solo al cargar la primera opción | design §6 |
| D8 | Convierte el admin; el cliente no acepta desde el sitio | proposal |

## Abierto

- **D9 — ¿Se puede convertir una opción con cantidad > 1 en varias líneas?**
  Por ahora una opción = una línea de pedido. Si alguna vez cotizás un combo
  (pastillas + discos) con un precio total, esto se queda corto.
- **D10 — ¿Guardar de qué proveedor sale cada opción?** Sería útil para repetir
  la compra, y `suppliers` ya existe. Queda afuera para no agrandar la primera
  versión.
