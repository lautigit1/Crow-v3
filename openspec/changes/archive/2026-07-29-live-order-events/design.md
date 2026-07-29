# Design: pedidos y estados en vivo (SSE)

## 1. El problema central no es SSE, son los workers

Un `StreamingResponse` que emite eventos es media pantalla de código. Lo que
hace grande a este change es esto:

```
                    ┌── worker 1 ──┐
POST /orders  ──────┤              │   ← el pedido entra por acá
                    └──────────────┘
                    ┌── worker 2 ──┐
GET /api/events ────┤              │   ← el admin está conectado acá
                    └──────────────┘
```

Uvicorn corre con `--workers 4` en producción y `--workers 2` en desarrollo.
Son **procesos separados, sin memoria compartida**. El worker que atiende el
POST no tiene forma de tocar la conexión que vive en el otro.

Una cola en memoria del proceso funcionaría perfecto en desarrollo con un
worker, andaría a medias con dos —el evento llega una de cada dos veces— y
sería un misterio en producción. Es la clase de bug que no se reproduce.

**Por eso el evento viaja por Redis pub/sub**, que ya está en el stack. El
worker que atiende el POST publica; todos los workers están suscritos; el que
tiene la conexión del admin la usa. Es la pieza más grande del change y no es
opcional.

### Cuando no hay Redis

`REDIS_URL` vacía es un escenario real: los tests lo fuerzan (`conftest.py`) y
alguien puede levantar la API sin Redis. El broker cae a un fanout en memoria,
igual que hacen el rate limiter y la blocklist.

Hay un detalle que **no** se puede resolver de la forma obvia. Las rutas que
publican son `def` sync, así que FastAPI las corre en un hilo del threadpool,
mientras que las colas de los suscriptores viven en el event loop.
`asyncio.Queue.put_nowait` **no es thread-safe**; llamarlo desde el hilo del
handler funciona casi siempre y se rompe raro. La forma correcta es capturar el
loop en el arranque y publicar con `loop.call_soon_threadsafe(...)`.

## 2. El evento es una señal, no los datos

```json
{ "type": "order.created", "order_id": 412 }
```

Nada más. El cliente recibe esto y **vuelve a pedir la lista por la API de
siempre**. Tres razones:

1. **No se filtra nada.** El canal nunca transporta nombre, teléfono ni
   totales, así que un error en el filtrado de canales no expone datos de otro
   cliente: expone un número de pedido.
2. **Una sola forma de leer.** Los permisos, los filtros y el cálculo del total
   parcial ya viven en `GET /orders`. Si el evento trajera el objeto armado,
   habría dos caminos que tienen que coincidir para siempre.
3. **Reconectar es trivial.** Sin datos en el canal no hay nada que
   reproducir: al volver, se pide la lista y listo.

El costo es una request extra por evento. Con este volumen de pedidos, nada.

## 3. Canales y autenticación

```
user:{id}   → los eventos de los pedidos de esa persona
admin       → todos los eventos de pedidos
```

Al conectarse, cada usuario se suscribe a su canal. Si además es admin, también
a `admin`. **El filtrado ocurre del lado del servidor al elegir a qué canal
suscribir**, nunca en el navegador.

La autenticación reusa `CurrentUser`: la cookie `access_token` es HttpOnly y
`EventSource` la manda sola por ser mismo origen. Esto importa porque
**`EventSource` no permite cabeceras propias** — no se le puede poner un
`Authorization`. Con cookies no hace falta, pero condiciona cualquier futuro
cambio a tokens en header.

Vencimiento: el token dura 30 minutos y la conexión puede durar más. No se
corta el stream al vencer — la conexión ya fue autorizada y solo transporta
números de pedido. Si el refresh falla, las requests que dispara el evento van
a fallar y el frontend ya maneja eso.

## 4. El endpoint no puede tocar la base

El handler tiene que ser `async def`: si fuera `def`, FastAPI lo correría en un
hilo del threadpool y **cada conexión abierta ocuparía un hilo para siempre**.
Con el pool por defecto, unas pocas pestañas abiertas dejarían la API sin
hilos para atender requests normales.

Y siendo `async`, **no puede usar la sesión sync de SQLAlchemy** dentro del
generador: bloquearía el event loop. Por eso el generador solo lee del broker.
La única consulta a la base ocurre una vez, en la dependencia de autenticación,
antes de empezar a emitir.

## 5. Latido

Cada 25 segundos se manda un comentario SSE (`: ping`). Sin eso, nginx y
cualquier proxy intermedio cierran una conexión que estuvo callada un minuto, y
el navegador la reconecta en loop. 25s queda cómodo bajo el default de 60s de
nginx.

## 6. nginx

Un `location` propio para `/api/events`, antes del `/api/` general:

```nginx
location = /api/events {
    proxy_pass $upstream_api$request_uri;
    proxy_http_version 1.1;
    proxy_set_header Connection "";   # sin keep-alive del upstream
    proxy_buffering off;              # sin esto nginx acumula y no entrega nada
    gzip off;                         # gzip también bufferea
    proxy_read_timeout 1h;
    # ...las mismas cabeceras de Host/X-Forwarded-* que el bloque general
}
```

`proxy_buffering off` es el que importa: con el buffering puesto, nginx junta
la respuesta y el evento llega tarde o no llega.

**Sin `limit_req`.** El bloque `/api/` general tiene
`limit_req zone=api_general burst=40`. Una conexión SSE es una sola request, así
que no molesta en régimen — pero si la API se reinicia, todos los navegadores
abiertos reconectan a la vez y ese pico sí puede pegarle al límite,
justo cuando el sistema está volviendo. Reconectar no es una operación que
valga la pena limitar.

## 7. Presupuesto de conexiones

Cada pestaña abierta mantiene **una** conexión viva. De ahí dos decisiones:

- **Un solo `EventSource` para toda la app**, en un provider, no uno por
  página. Si cada pantalla abriera el suyo, una persona con el panel y sus
  pedidos abiertos tendría dos.
- **Sobre HTTP/1.1 el navegador permite 6 conexiones por origen**, y la de SSE
  se queda con una de forma permanente. Quedan 5 para todo lo demás, que
  alcanza, pero conviene **verificar si producción sirve por HTTP/2**, donde el
  problema no existe. Anotado en `tasks.md`.

## 8. El panel pasa a TanStack Query

`AdminOrdersPage` hoy usa `useState` + `useEffect`. Para reaccionar a un evento
hace falta poder decir "esta lista quedó vieja" desde afuera del componente, que
es exactamente `invalidateQueries`. Reimplementar eso a mano sería reescribir
peor lo que la librería ya hace, y que el resto del proyecto ya usa.

De paso trae deduplicación y caché entre navegaciones, que hoy no tiene.

## 9. Qué hace cada pantalla con el evento

| Evento | Panel de admin | Mis pedidos |
|---|---|---|
| `order.created` | Suma al contador de la barra. **No toca la lista.** | — |
| `order.updated` | Invalida y refresca en silencio | Invalida y refresca |

La barra existe porque reordenar la tabla mientras alguien está por hacer clic
es peor que enterarse diez segundos después. Los cambios de estado, en cambio,
se aplican solos: son la confirmación de algo que la persona acaba de hacer, o
de algo que hizo otro admin, y en los dos casos ver el dato viejo es peor.

## 10. Riesgos

| Riesgo | Mitigación |
|---|---|
| Un worker se reinicia y caen sus conexiones | `EventSource` reconecta solo; al reconectar se refresca la lista |
| Todos reconectan a la vez tras un deploy | Sin `limit_req` en ese location (§6); el `retry` de SSE agrega su propia espera |
| La conexión queda colgada sin datos | Latido cada 25s (§5) |
| El generador no se cierra al irse el cliente | `finally` que cancela la suscripción; hay que probarlo, no asumirlo |
| Publicar rompe el alta de un pedido | La publicación va en `try/except` y loguea: **que falle el aviso no puede hacer fallar la compra** |

## 11. Cómo se prueba

- **Broker:** tests directos de publicar/suscribir, con Redis y sin Redis.
- **Endpoint:** con `TestClient` en modo streaming, verificando que llega el
  evento publicado, que un usuario común **no** recibe los eventos de `admin`, y
  que la suscripción se limpia al cortar.
- **E2E:** un solo test — dos contextos de navegador, el cliente hace un pedido
  y el panel muestra la barra sin recargar. Es el único lugar donde se ejerce la
  cadena entera contra nginx, que es donde vive el riesgo real
  (`proxy_buffering`).
