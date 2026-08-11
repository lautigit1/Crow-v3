# Pendientes — Crow Repuestos

Estado al 07/08/2026. Ordenado por lo que te frena, no por esfuerzo.

Los detalles de cada tema están en los `apply.md` de
`openspec/changes/archive/`. Acá está la lista corta.

---

## 1. Bloquean el deploy

Sin esto el stack de producción **no arranca**.

- [ ] **`DOMAIN` en el `.env`** — el compose de producción tiene una guarda
      `${DOMAIN:?}` y se niega a levantar si falta.
- [ ] **`SECRET_KEY` nueva** (`openssl rand -hex 32`). No reusar la de
      desarrollo: con esa, cualquiera que vea el repo puede firmar tokens
      válidos.
- [ ] **DNS apuntando al servidor y puertos 80/443 abiertos** — Caddy los
      necesita para emitir el certificado.

---

## 2. Bloquean vender (legal)

**No soy abogado y esto no es asesoramiento legal.** Es la lista de lo
verificable, para que la consulta con un profesional sea corta.

### En el sitio (es código, lo puedo hacer)

- [ ] **Botón de arrepentimiento** — Disposición 954/2025. En la portada,
      destacado, y **sin pedir registro ni ningún trámite previo**.
- [ ] **Formulario 960/NM de ARCA (Data Fiscal)** — el QR interactivo, en lugar
      visible de la página principal. Hoy no está.
- [ ] **CUIT visible** — hay razón social, dirección y horarios configurables;
      falta el campo para el CUIT.
- [ ] **La política de privacidad debe nombrar a los terceros reales**:
      Cloudinary (imágenes), Sentry (errores, que pueden incluir IP) y Google
      (correo). Hoy dice "terceros" en general.
- [ ] **Atención al cliente**: falta indicar el canal y el área responsable.

### Trámites (no es código)

- [ ] **Inscripción en ARCA y facturación electrónica.** Sin esto cada venta es
      informal.
- [ ] **Inscribir la base de datos en el RNBD de la AAIP.** Guardás nombre,
      mail, teléfono e historial de compras: eso es una base de datos personales
      según la Ley 25.326, y no inscribirla es en sí una infracción. **Es el que
      más se pasa por alto.**
- [ ] **Confirmar si te aplica el "botón de baja"** — la misma disposición lo
      exige para servicios y suscripciones. Si solo vendés productos,
      probablemente no, pero que lo diga un abogado.
- [ ] **Revisión profesional de los textos legales.** Puedo armar la estructura
      y el flujo; no redactar cláusulas que después te tengan que defender.

> De todo lo legal, **lo que más se sanciona en la práctica no es el sitio sino
> lo fiscal y lo registral**. Y eso no se arregla con código.

---

## 3. Operación — antes de dormir tranquilo

- [x] **Backup agendado.** Hechas las unidades `deploy/crow-backup.service` y
      `.timer`: corren `backup-postgres.sh` todos los días a las 3:15, recuperan
      la corrida si el servidor estuvo apagado, y dejan rastro en el journal.
      **Falta activarlas en el servidor** (`systemctl enable --now
      crow-backup.timer`) — las instrucciones están en el `.service`.
      Se eligió systemd sobre cron porque con cron la salida se pierde y un
      fallo no deja señal en ningún lado.
- [ ] **Probar una restauración.** Un backup que nunca restauraste no es un
      backup. Media hora, una sola vez. `deploy/restore-postgres.sh` existe.
- [ ] **Monitoreo de caída externo.** Sentry avisa cuando la aplicación tira una
      excepción, **no** cuando el servidor deja de responder. Son cosas
      distintas y hoy la segunda no la ve nadie. Apuntar un servicio gratuito
      (UptimeRobot y similares) a `/api/health`, que ya existe.

---

## 4. Seguridad

- [x] **`npm audit`** — de 5 avisos a 2. Se cerraron los **3 de severidad alta**
      en `undici` (desincronización de respuestas, filtrado entre usuarios,
      inyección CRLF).
- [ ] ⚠ **Los 2 que quedan son de `react-router` y NO se pueden cerrar sin
      saltar a la versión 7**, que es un cambio mayor. Se revisó si aplican:
      - *Hidratación SSR*: esta app es una SPA pura, no hay SSR. No aplica.
      - *Redirección abierta vía `<Link>`/`useNavigate`*: se auditaron los
        cuatro llamados dinámicos a `navigate()`. Ninguno recibe algo que venga
        de la URL o del usuario — son literales, el enlace de una notificación
        (que escribe el backend con strings fijos) y el `from` del guard de
        auth, que viaja por `location.state` y no se puede fabricar desde un
        link. **No es explotable hoy**, pero cualquier `navigate()` nuevo con
        datos de afuera lo vuelve explotable.
- [x] **`pip-audit` en el CI** — ya estaba (`backend.yml`), el pendiente estaba
      desactualizado. Corre informativo, sin bloquear.
- [x] **CVEs del backend: `pip-audit` en cero.** `python-multipart` 0.0.12 →
      0.0.32 (seis avisos, todos de DoS al parsear archivos subidos),
      `jinja2` 3.1.4 → 3.1.6, `pdfplumber` 0.11.4 → 0.11.10 (arrastraba
      `pdfminer-six` con dos avisos; procesa PDFs de proveedores, o sea entrada
      no confiable), y los 13 últimos con el salto de FastAPI/Starlette de acá
      abajo.
- [x] **FastAPI 0.115 → 0.141.1 y Starlette 0.41 → 1.5.1.** Hecho el 08/08/2026
      en el segundo intento, con `pip-audit` del backend en **cero avisos**
      (cierra los 9 de starlette y los 4 de `cryptography` 48 → 50). Los 504
      tests del backend pasan, más 8 nuevos. `starlette` quedó declarada
      explícita en `requirements.txt`: antes no estaba y la versión la resolvía
      el build, que es demasiado azar para una dependencia cuyos avisos recién
      cierran en 1.3.1.

      **Lo que lo destrabó fue no commitear antes.** El primer intento se cayó
      contra una decisión de atomicidad que no había que tomar: el problema no
      era *cuándo* commitea `get_db()` sino *quién* dispara los efectos. Ahora
      hay una cola propia (`app/core/post_commit.py`) que `get_db()` vacía con
      sus propias manos justo después del commit, y solo si el commit ocurrió.
      El Unit-of-Work quedó igual: nadie llama `commit()`, sigue habiendo uno
      solo por request y sigue siendo lo último que pasa.

      La cola expone `add_task(fn, *args, **kwargs)`, la misma firma de
      `BackgroundTasks`, así que los 8 call sites no cambiaron de forma -- solo
      el tipo del parámetro. De yapa apareció un bug que el pendiente no tenía
      anotado: el evento SSE de la campana viajaba por el mismo camino, o sea
      que también salía antes del commit. El navegador iba a buscar, no
      encontraba nada, y como no llega un segundo evento la campana se quedaba
      en cero para siempre. Silencioso y sin test que lo agarrara.

      **Verificado con el servidor de verdad** (uvicorn, commit real, versiones
      nuevas): `POST /register` devuelve 201 en 0.29s con un `send_email` que
      tarda 0.6s -- o sea que el correo no está en el camino de la respuesta --
      y el `GET /auth/me` inmediato siguiente da 200. Antes daba 401.

      `tests/test_post_commit.py` cubre la regresión mirando **desde otra
      sesión**, que es lo único que distingue "ya commiteó" de "todavía no";
      se comprobó que falla si se vuelve a poner el efecto antes del commit.

      Notas de lo aprendido en el primer intento, que siguen valiendo:

      **El miedo estaba puesto en el lugar equivocado.** `BaseHTTPMiddleware`
      **no** se eliminó en Starlette 1.x -- era una propuesta (discusión #2160)
      que no entró. Se verificó importándolo con 1.5.0. De lo que 1.0 sí sacó
      (`on_startup`, `on_event`, `@app.route`, `@app.middleware`,
      `@app.exception_handler`, la firma vieja de `TemplateResponse`) este
      código no usa nada: ya venía con `lifespan=` y `add_*()`.

      **El problema real es otro y es de diseño.** `get_db()` implementa
      Unit-of-Work: nadie llama `commit()`, commitea el teardown de la
      dependencia. Ese teardown ahora corre **después** de las tareas de
      `BackgroundTasks` (ver fastapi/fastapi#14099), y esas tareas mandan
      correo por SMTP. Resultado: el registro devuelve 201 con un token válido
      para un usuario que todavía no está en la base, y el `/auth/me`
      siguiente da 401. Verificado: el usuario aparece un par de segundos
      después. Un endpoint que muta **sin** agendar correo (crear producto)
      no tiene el problema.

      Son 8 lugares (`auth.py` registro y reset, `orders.py` ×3,
      `quotes.py` ×3). Se descartó commitear antes de agendar el correo, que
      era el arreglo obvio: **cambia la atomicidad** -- si algo falla después
      del `add_task`, hoy la operación se revierte y así quedaría hecha -- y
      además hay que volver a acordarse de la regla en cada endpoint nuevo que
      mande un correo.

      Un dato que dio vuelta la solución: **desde 0.141 el teardown de las
      dependencias corre después de que la respuesta salió**. Antes bloqueaba
      al cliente, y por eso el correo tenía que ir a `BackgroundTasks`. Medido
      con un teardown de `sleep(1)`: en 0.115 el cliente esperaba 1.03s, en
      0.141 recibe la respuesta en 0.04s. O sea que el lugar correcto para el
      correo ya no cuesta latencia -- pero esto es también la razón por la que
      el refactor y el salto de versión **tenían que entrar juntos**.

- [ ] Quedó pendiente de esto: los **12 e2e** que se caían (de 33) son
      exactamente los flujos que registran o crean algo, así que deberían
      pasar; no se pudieron correr acá porque necesitan el stack levantado.
      **Vale correrlos antes de deployar.**
- [ ] Menor, apareció con el salto: `starlette.testclient` avisa que usar
      `httpx` está deprecado y pide `httpx2`. Solo warnings en la suite, nada
      roto. `requirements-dev.txt` pinea `httpx>=0.27,<0.28`.
- [x] **Fail-fast de `SEED_ADMIN_PASSWORD`.** Tenía default `admin1234` y
      ninguna guarda: un deploy que se olvidara de definirla arrancaba con la
      cuenta que controla precios, stock y pedidos protegida por esa clave, y
      **sin ningún síntoma visible**. Ahora en producción la app no arranca.
- [ ] **Segundo factor para el admin.** Una sola cuenta controla precios, stock
      y pedidos. Es lo único que agregaría del lado de seguridad.
- [ ] Anotado: **`img-src` quedó abierto a cualquier host HTTPS** para que el
      campo de URL manual sirva. Si algún día todas las fotos pasan por
      Cloudinary, conviene volver a la versión estricta (el valor viejo está
      comentado en `frontend/nginx.conf`).

---

## 5. Producto — por valor para el negocio

- [x] **Circuito de cotizaciones cerrado** — change `quote-to-order`, archivado
      el 31/07. Opciones con precio y plazo, el cliente las ve, y un botón que
      convierte la elegida en pedido creando la cuenta si hace falta.
- [x] **`vehicle` obligatorio** en el formulario público. Va en `QuoteCreate` y
      no en `QuoteBase`, para no romper la lectura del historial anterior.
- [ ] ⚠ **Fotos del catálogo. Es lo más importante que queda de esta lista.**
      Subió de prioridad: la tarjeta nueva del catálogo es **imagen a sangre**,
      o sea que la foto ocupa la tarjeta entera. Con fotos va a verse mejor que
      cualquier versión anterior; **sin fotos se ve peor que el diseño que
      reemplazó**. Es la única deuda de esta lista que hoy juega en contra.
      **No falta código: falta contenido.** El circuito está entero — Cloudinary
      integrado (el backend firma, el navegador sube directo, los bytes no pasan
      por la API), botón de subida y campo de URL en el panel, y un tile de
      reemplazo prolijo cuando no hay foto. Hoy además **no hay ningún producto
      cargado**, así que esto no se puede empezar hasta que exista el catálogo.
      Si van a ser muchos, conviene un import masivo (fotos nombradas por SKU)
      en vez de cargarlas de a una desde el panel.
- [x] **El panel desde el celular.** El `min-w-[640px]` quedó solo en la vista de
      escritorio: abajo de 768px `DataTable` renderiza otra cosa, donde cada fila
      es una tarjeta con sus datos etiquetados. No son las dos vistas con
      `hidden`, se monta una sola. Lo cubren cinco tests e2e con viewport real
      (`admin-panel.mobile.spec.ts`) — hacen falta porque los tests de vitest
      corren en jsdom, que no hace layout y no puede ver un desborde.
- [x] **Barrido de contraste.** Medido con la fórmula de WCAG, no a ojo. Los
      badges de estado de pedidos eran el problema grande: texto en el color
      puro sobre ese mismo color al 10-13%, entre 1.99:1 y 4.27:1 — los ocho
      estados por debajo del mínimo. Se separó el tono vivo (fondo y punto, que
      es decorativo) del tono del texto, que se oscurece hasta pasar 4.5:1.
      Los textos secundarios sobre `ink900` pasaron a usar el token
      `textOnDarkFaint`, que ya existía y nadie estaba usando.
      **El gradiente azul de esos paneles cambia la cuenta**: baja el contraste
      y un ajuste calculado contra el fondo plano no alcanza. Aparecieron dos
      textos más de los previstos (header del catálogo y la 404). Queda a
      propósito el separador `/` del breadcrumb en 2.46:1: es decorativo, la
      ruta se lee igual sin él.

---

## 6. Correo

- [x] **Correo de bienvenida al registrarse.** No existía: el endpoint creaba el
      usuario y no mandaba nada. Explica cómo trabajás en tres pasos, deja el
      WhatsApp a mano y lleva al catálogo.
- [x] **Todos los correos rediseñados** sobre `_base`, incluidas las dos
      plantillas que se maquetaban solas y se desincronizaban.
- [ ] ⚠ **Dominio propio + proveedor transaccional. CORREGIDO respecto de la
      versión anterior de este archivo**, que decía que el remitente
      `@gmail.com` "está bien así, no cae en spam". **Es falso y está
      verificado**: el correo de bienvenida cayó en spam en una prueba real.
      Mandar correo de negocio desde una cuenta gratuita de Gmail es una señal
      fuerte de spam, y con Gmail firmando como `gmail.com` **nunca se construye
      reputación para tu marca**.
      Camino: dominio + Resend/Brevo/Mailgun/SES, publicar SPF, DKIM y DMARC, y
      recién ahí cambiar `SMTP_FROM`. Google exige SPF o DKIM para todo
      remitente.
- [ ] **`FRONTEND_URL` apunta a `localhost`**, así que los correos salen con
      enlaces a `http://localhost:5173/...`. Un enlace a localhost es de lo más
      sospechoso que puede leer un filtro. Se arregla solo al configurar el
      dominio, pero mientras tanto suma puntos en contra.

---

## 7. Verificaciones que quedaron sin hacer

- [x] **Que al cerrar la pestaña se libere la conexión SSE** del lado del
      servidor. Probado el camino real contra nginx, con navegador de verdad:
      `frontend/e2e/sse-cleanup.spec.ts`. Libera en menos de un segundo, no
      acumula al abrir y cerrar repetido, y cerrar una pestaña no se lleva
      puesta la suscripción de otra.
      **Se verificó que el test pueda fallar**, induciendo una fuga real y
      confirmando que se pone en rojo. Eso destapó dos cosas que hacían falsa
      la verificación:
      - `PUBSUB CHANNELS` y `CLIENT LIST` a secas **no sirven** para medir esto:
        el primero vuelve a cero con la fuga puesta, el segundo cuenta también
        las conexiones del rate limiter y da falsos rojos. Lo que distingue un
        stream es el campo `sub=` de `CLIENT LIST`.
      - **`docker compose restart` no reconstruye la imagen.** El servicio `api`
        es `build:` sin volumen montado, así que editar un archivo y reiniciar
        deja corriendo el código viejo, sin ningún aviso. Hace falta
        `up -d --build`. Vale para cualquier prueba futura contra el backend.
- [ ] **La migración 020 contra una copia de producción.** Hoy no hay
      producción, así que el riesgo es bajo: una base vacía se arma con
      `create_all()` y se marca en head. Aplica recién cuando haya datos reales.

---

## Lo que NO hay que hacer

- **Búsqueda por vehículo en el catálogo.** Se descartó: si traés a pedido, no
  tiene sentido etiquetar compatibilidad sobre productos que no stockeás. Su
  lugar lo ocupa el circuito de cotizaciones (punto 5).
