# Tasks: centro de notificaciones y avisos por email

Cuatro fases. La 1 y la 2 son invisibles; la campana aparece en la 3.

---

## Fase 1 — Tabla y la puerta única

- [x] **1.1** Migración `020_notifications` — tabla + dos índices compuestos:
      `(user_id, read_at)` para el contador del navbar y
      `(user_id, created_at)` para la lista paginada.
      → Enum declarado con los **nombres** de los miembros y
      `create_type=False` + `checkfirst`, aplicando la lección de la 019. Se
      agregó un test que compara las etiquetas de la migración contra las que
      emite el ORM, así el error no puede volver.
- [x] **1.2** `app/models/notification.py` con `NotificationType`.
      → Los índices se espejan en `__table_args__`: en desarrollo y en los
      tests el esquema sale de `create_all()`, no de Alembic, y sin eso los
      índices no existirían justo donde se corren los tests.
- [x] **1.3** `app/core/notify.py` → `notificar()` y `notificar_a_admins()`.
      → `notificar_a_admins()` crea **una fila por admin**: que uno lo lea no
      puede marcarlo como leído para el resto. Y no manda email — los avisos al
      admin son de alta frecuencia y le llenarían la casilla.
- [x] **1.4** Tests: **14**. Tres de ellos son los que justifican los
      `try/except`: falla el evento, falla el email, fallan los dos, y en los
      tres casos la notificación queda y nada propaga.

## Fase 2 — Los orígenes y el email

- [x] **2.1** `PATCH /orders/{id}` notifica al dueño en los dos ejes; al admin
      no, que acaba de hacer el cambio él mismo.
      → La redacción y el criterio del email viven en `app/core/order_notify.py`,
      **no en la ruta**: la ruta se ocupa del estado y del stock. Si estuvieran
      juntos, agregar un estado implicaría tocar el endpoint.
- [x] **2.2** Alta de pedido → notificación a todos los admins activos.
- [x] **2.3** `PATCH /quotes/{id}/status` notifica al pasar a **Respondida**,
      con los tres casos. El helper **no valida nada**: decide y sale, porque lo
      único inaceptable sería que el cambio de estado falle por no tener a quién
      avisarle.
- [x] **2.4** Plantillas nuevas + **`_base.html.jinja` extraído**.
      → No estaba en el plan: copiar el layout de la plantilla de reset en cada
      aviso nuevo garantizaba tres variantes distintas en tres meses. Ahora las
      tres extienden una base con bloques.
- [x] **2.5** El interruptor: `ENTREGA_CON_EMAIL` y `COBRO_CON_EMAIL` como
      conjuntos explícitos.
      → **Un solo correo cuando los dos ejes cambian a la vez.** Es un caso real
      (el admin resuelve todo de una) y dos correos sobre el mismo pedido en el
      mismo segundo se leen como un error del sistema.
- [x] **2.6** Tests: **17** nuevos (backend: 427).
      → Hay un test por cada transición que **NO** debe mandar correo, no solo
      por las que sí: un sistema que avisa de todo equivale a uno que no avisa
      de nada. Y uno que verifica que todo estado del enum tenga texto escrito,
      así agregar un estado sin redacción no pasa silenciosamente.

## Fase 3 — La campana

- [x] **3.1** Endpoints: lista paginada, `unread-count`, marcar una, marcar
      todas. **16 tests** de backend (total: 443).
      → Marcar leída es **idempotente**: `read_at` dice cuándo la vio por
      primera vez y marcarla de nuevo no puede reescribir ese dato.
      → La de otra persona da **404 y no 403**: un 403 le confirmaría a quien
      prueba IDs al azar que ese registro existe.
      → `read-all` es un solo UPDATE, no traer filas y recorrerlas.
- [x] **3.2** `entities/notification/` con tipos, api y queries.
      → El ícono y el color por tipo viven acá y **no en la base**: es
      presentación y tiene que poder cambiar sin migración.
- [x] **3.3** `NotificationBell.tsx` — badge, panel, marcar al tocar, marcar
      todas, cierre por clic afuera y Escape.
      → **La lista se pide solo al abrir el panel.** El contador va en cada
      carga de página; traer la lista para un panel que puede no abrirse nunca
      sería trabajo de más en la request más frecuente del sitio.
- [x] **3.4** Enganchada a `notification.created`. Sin sondeo: `staleTime` corto
      y el evento invalida.
- [x] **3.5** Montada en el navbar.
      → Estilada para el fondo **oscuro** de la navbar, igual que los botones de
      búsqueda y carrito que tiene al lado. La primera versión estaba pensada
      para fondo claro y se veía como un parche pegado encima.
      → Se oculta sola para invitados, y **no le pide el contador al servidor**:
      sin eso, cada visitante anónimo generaría un 401 por carga de página.
- [x] **3.6** Tests de frontend: **15** (total vitest: 127).
      → `typecheck`, `eslint` y `steiger` limpios. **vitest no se pudo ejecutar
      acá** (límite de tiempo): hay que correrlo en la máquina.

## Fase 4 — Verificación

- [ ] **4.1** `ruff` + `pytest`; `typecheck`, `lint`, `steiger`, `vitest`.
- [ ] **4.2** E2E: el admin mueve un pedido → el cliente ve el contador subir
      sin recargar y la notificación en el panel.
- [ ] **4.3** `npm run e2e` completo.
- [ ] **4.4** Migración 020 contra una **copia** de la base de producción.

## Fase 5 — Teléfono obligatorio en el registro

Entra acá porque es la otra mitad de "poder avisarle al cliente": hoy el botón
de WhatsApp del panel a veces no tiene a dónde ir.

**El lugar importa.** En el change anterior se descartó pedirlo en el
*checkout* (D4 de admin-orders-and-payment) y sigue siendo la decisión correcta:
ahí es fricción justo antes de confirmar. En el *registro* la persona ya está
completando un formulario y un campo más es marginal.

- [ ] **5.1** `RegisterRequest.phone` pasa a obligatorio, con validación
      permisiva: mínimo de dígitos, y se aceptan espacios, guiones y paréntesis.
      **Rechazar un número válido es peor que aceptar uno raro.**
- [ ] **5.2** El campo en el formulario de registro, con su validación.
- [ ] **5.3** **`User.phone` sigue siendo nullable en la base.** Los usuarios
      que ya existen no tienen teléfono y no hay de dónde sacarlo; poner la
      columna NOT NULL rompería esas filas. Lo obligatorio es el formulario de
      alta, no el modelo.
- [ ] **5.4** El fallback a mail del panel **se mantiene** por lo de arriba: va
      a seguir habiendo clientes sin teléfono para siempre.
- [ ] **5.5** ⚠ **`registerNewCustomer` en `e2e/helpers.ts` no completa
      teléfono**, así que al hacerlo obligatorio **fallan los ~10 tests E2E que
      registran a alguien**. Se actualiza el helper en el mismo commit.
- [ ] **5.6** Revisar los tests de vitest del formulario de registro.

---

## Decisiones tomadas

| # | Decisión | Dónde |
|---|---|---|
| D1 | Una sola puerta (`notificar()`) reparte a los tres canales | design §1 |
| D2 | `read_at` como fecha, no un booleano | design §2 |
| D3 | El texto se guarda redactado, no se arma al leer | design §2 |
| D4 | Los endpoints no aceptan `user_id`: siempre `current_user` | design §3 |
| D5 | Email solo en 4 transiciones; Cancelado no manda | design §4 |
| D6 | Cotización anónima sin mail no notifica y no es un error | design §5 |
| D7 | El evento SSE es una señal sin datos | design §6 |
| D8 | Campana para clientes **y** admin, misma tabla | conversación |

## Abierto

- **D9 — ¿Se limpian las notificaciones viejas?** Con este volumen no es
  problema en años. Cuando lo sea, borrar leídas con más de N meses es trivial.
- **D10 — ¿Notificación del navegador y sonido?** La tabla y el canal quedan
  listos para engancharlo; no entra acá.
