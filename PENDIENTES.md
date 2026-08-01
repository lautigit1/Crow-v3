# Pendientes — Crow Repuestos

Estado al 30/07/2026. Ordenado por lo que te frena, no por esfuerzo.

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

- [ ] **Agendar el backup con cron.** `deploy/backup-postgres.sh` existe y no
      corre solo. Un script que nunca se ejecuta es peor que no tenerlo: da
      sensación de estar cubierto.
- [ ] **Probar una restauración.** Un backup que nunca restauraste no es un
      backup. Media hora, una sola vez.
- [ ] **Monitoreo de caída externo.** Sentry avisa cuando la aplicación tira una
      excepción, **no** cuando el servidor deja de responder. Son cosas
      distintas y hoy la segunda no la ve nadie.

---

## 4. Seguridad

- [ ] **`npm audit fix`** — 2 vulnerabilidades moderadas en `react-router`. El
      aviso es sobre hidratación SSR y esta app es una SPA, así que
      probablemente no aplique, pero cerrarlo es gratis.
- [ ] **`pip-audit` al CI**, junto a `ruff`. Hoy las dependencias del backend no
      se auditan.
- [ ] **Segundo factor para el admin.** Una sola cuenta controla precios, stock
      y pedidos. Es lo único que agregaría del lado de seguridad.
- [ ] Anotado: **`img-src` quedó abierto a cualquier host HTTPS** para que el
      campo de URL manual sirva. Si algún día todas las fotos pasan por
      Cloudinary, conviene volver a la versión estricta (el valor viejo está
      comentado en `frontend/nginx.conf`).

---

## 5. Producto — por valor para el negocio

- [ ] **Cerrar el circuito de cotizaciones.** Es lo más valioso de esta lista
      para tu modelo. Hoy `Quote` guarda el pedido del cliente y su estado, pero
      **no guarda la respuesta**: ni precio, ni plazo, ni proveedor. Si el mismo
      cliente vuelve en dos meses, no hay nada que consultar, y cuando acepta,
      alguien carga el pedido a mano sin ligarlo a lo cotizado.
      Falta: precio, plazo, y un botón que convierta la cotización en pedido.
- [ ] **El campo `vehicle` de las cotizaciones es opcional.** Para un negocio
      que trae a pedido, el vehículo es *el* dato: podés estar recibiendo
      consultas sin él.
- [ ] **Fotos del catálogo.** Los productos importados salen con el tile
      generado. Funciona, pero una tienda de repuestos sin imágenes convierte
      mal.
- [ ] **El panel desde el celular.** La tabla tiene ancho mínimo de 640px, o sea
      scroll horizontal. Si vas a gestionar pedidos desde el mostrador, hoy es
      incómodo.
- [ ] **Barrido de contraste.** Ya apareció un fallo real de AA en el panel del
      checkout, y esa paleta se repite en otros lados. Medirlo con números en
      vez de a ojo.

---

## 6. Correo

- [ ] **Dominio verificado** si querés firmar como `ventas@crowrepuestos.com.ar`.
      Hoy el remitente es tu `@gmail.com` y **está bien así** — alinea y no cae
      en spam. El día que cambies el remitente al dominio sin SPF/DKIM, deja de
      alinear y puede ser rechazo directo, no solo spam.
      Camino: Brevo o Google Workspace, verificar el dominio, publicar los tres
      registros DNS, y recién ahí cambiar `SMTP_FROM`.

---

## 7. Verificaciones que quedaron sin hacer

- [ ] **Que al cerrar la pestaña se libere la conexión SSE** del lado del
      servidor. Los tests cubren que el generador se cierre; el camino real
      —navegador que cierra, nginx que corta, worker que libera— no se probó.
- [ ] **La migración 020 contra una copia de producción.** Hoy no hay
      producción, así que el riesgo es bajo: una base vacía se arma con
      `create_all()` y se marca en head. Aplica recién cuando haya datos reales.

---

## Lo que NO hay que hacer

- **Búsqueda por vehículo en el catálogo.** Se descartó: si traés a pedido, no
  tiene sentido etiquetar compatibilidad sobre productos que no stockeás. Su
  lugar lo ocupa el circuito de cotizaciones (punto 5).
