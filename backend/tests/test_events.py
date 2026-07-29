"""
Tests del broker de eventos.

Corren contra el fallback en memoria, que es el modo que usa la suite
(`conftest.py` fuerza `REDIS_URL=""`). El camino de Redis no se prueba acá:
haría falta un Redis de verdad y lo que se estaría probando es `redis-py`, no
código nuestro. Lo que sí se prueba es todo lo que es propio -- el ruteo por
canal, la limpieza al desuscribirse y que publicar jamás tire una excepción.

La invariante que más importa: **publicar no puede voltear la operación que lo
generó.** Un pedido guardado y no avisado es un inconveniente; un pedido que no
se guarda porque el canal de avisos falló es un problema.
"""

import asyncio
import contextlib

import pytest

from app.core import events


@pytest.fixture(autouse=True)
def _limpiar():
    events._reset_memoria()
    events.registrar_loop(asyncio.get_event_loop_policy().new_event_loop())
    yield
    events._reset_memoria()


async def _primer_evento(canales: list[str]):
    """Se suscribe y deja pedido el próximo evento, sin esperarlo."""
    generador = events.suscribir(canales)
    tarea = asyncio.create_task(anext(generador))  # type: ignore[arg-type]
    # Un ciclo del loop para que la suscripción quede registrada antes de
    # publicar: si se publica primero, no hay nadie escuchando y el evento se
    # pierde (es pub/sub, no una cola persistente).
    await asyncio.sleep(0.01)
    return generador, tarea


async def _cerrar(generador, tarea) -> None:
    """Cancela la espera y recién ahí cierra el generador.

    `tarea.cancel()` solo marca la cancelación: hasta que no se la espera, el
    generador sigue formalmente en ejecución y `aclose()` revienta con
    "asynchronous generator is already running".
    """
    tarea.cancel()
    with contextlib.suppress(asyncio.CancelledError):
        await tarea
    await generador.aclose()


class TestRuteoPorCanal:
    @pytest.mark.asyncio
    async def test_llega_lo_publicado_en_el_canal_suscrito(self):
        events.registrar_loop(asyncio.get_running_loop())
        generador, tarea = await _primer_evento(["admin"])

        events.publicar(["admin"], "order.created", order_id=7)

        evento = await asyncio.wait_for(tarea, timeout=1.0)
        assert evento == {"type": "order.created", "order_id": 7}
        await generador.aclose()

    @pytest.mark.asyncio
    async def test_no_llega_lo_publicado_en_otro_canal(self):
        """El aislamiento entre canales es lo que evita que una persona vea los
        pedidos de otra: el filtrado es del servidor, no del navegador."""
        events.registrar_loop(asyncio.get_running_loop())
        generador, tarea = await _primer_evento([events.canal_usuario(1)])

        events.publicar([events.canal_usuario(2)], "order.updated", order_id=9)

        with pytest.raises(asyncio.TimeoutError):
            await asyncio.wait_for(asyncio.shield(tarea), timeout=0.15)
        await _cerrar(generador, tarea)

    @pytest.mark.asyncio
    async def test_un_evento_llega_a_todos_los_suscriptores_del_canal(self):
        """Dos admins con el panel abierto tienen que enterarse los dos."""
        events.registrar_loop(asyncio.get_running_loop())
        gen_a, tarea_a = await _primer_evento(["admin"])
        gen_b, tarea_b = await _primer_evento(["admin"])

        events.publicar(["admin"], "order.created", order_id=3)

        assert (await asyncio.wait_for(tarea_a, 1.0))["order_id"] == 3
        assert (await asyncio.wait_for(tarea_b, 1.0))["order_id"] == 3
        await gen_a.aclose()
        await gen_b.aclose()

    @pytest.mark.asyncio
    async def test_publica_a_varios_canales_de_una(self):
        """Un cambio de estado va al admin y al dueño del pedido a la vez."""
        events.registrar_loop(asyncio.get_running_loop())
        gen_admin, tarea_admin = await _primer_evento(["admin"])
        gen_user, tarea_user = await _primer_evento([events.canal_usuario(5)])

        events.publicar(["admin", events.canal_usuario(5)], "order.updated", order_id=11)

        assert (await asyncio.wait_for(tarea_admin, 1.0))["type"] == "order.updated"
        assert (await asyncio.wait_for(tarea_user, 1.0))["type"] == "order.updated"
        await gen_admin.aclose()
        await gen_user.aclose()


class TestLimpieza:
    @pytest.mark.asyncio
    async def test_al_cerrar_el_generador_se_borra_la_suscripcion(self):
        """Cada suscripción que queda colgada es memoria que no vuelve. Con una
        conexión por pestaña abierta, esto se acumula."""
        events.registrar_loop(asyncio.get_running_loop())
        generador, tarea = await _primer_evento(["admin"])
        assert events._colas.get("admin")

        await _cerrar(generador, tarea)

        assert not events._colas.get("admin")


class TestEndpointSSE:
    """El endpoint en sí, con el TestClient en modo streaming.

    No se prueba que lleguen eventos por el canal -- eso ya está cubierto arriba
    y acá haría falta publicar desde otro hilo mientras el stream está abierto,
    que es frágil y prueba el mismo código dos veces. Lo que se prueba es lo que
    solo puede fallar en el endpoint: quién puede conectarse, con qué cabeceras
    responde, y a qué canales termina suscripto según el rol.
    """

    def test_requiere_sesion(self, client):
        r = client.get("/api/events")
        assert r.status_code == 401

    @pytest.mark.asyncio
    async def test_cabeceras_que_evitan_el_buffering(self, user):
        """Las cabeceras son la mitad del trabajo: sin ellas el evento llega
        cuando algún buffer intermedio decide soltarlo, no cuando pasa."""
        from app.api.routes.events import stream_de_eventos

        respuesta = await stream_de_eventos(user)

        assert respuesta.media_type == "text/event-stream"
        assert respuesta.headers["cache-control"] == "no-cache"
        assert respuesta.headers["x-accel-buffering"] == "no"

    @pytest.mark.asyncio
    async def test_los_canales_dependen_del_rol(self, user, admin, monkeypatch):
        """El filtrado por rol es lo que separa "mis pedidos" de "todos los
        pedidos", y ocurre acá, en el servidor -- el navegador no elige a qué se
        suscribe."""
        from app.api.routes import events as ruta

        vistos: list[list[str]] = []
        # Función común, no `async def` con `yield`: un generador asíncrono no
        # ejecuta su cuerpo hasta que alguien lo consume, así que el registro
        # nunca llegaba a correr. Y guardamos la original antes de parchear,
        # porque después `events.suscribir` es el espía y llamarla desde adentro
        # sería recursión infinita.
        original = events.suscribir

        def espia(canales):
            vistos.append(canales)
            return original(canales)

        monkeypatch.setattr(ruta.events, "suscribir", espia)

        for persona, espera_admin in ((user, False), (admin, True)):
            respuesta = await ruta.stream_de_eventos(persona)
            # El generador no arranca hasta que se lo consume.
            await anext(respuesta.body_iterator)  # type: ignore[arg-type]
            await respuesta.body_iterator.aclose()  # type: ignore[attr-defined]

            canales = vistos[-1]
            assert events.canal_usuario(persona.id) in canales
            assert (events.CANAL_ADMIN in canales) is espera_admin

    @pytest.mark.asyncio
    async def test_saluda_al_conectar_y_late_si_no_pasa_nada(self, monkeypatch):
        """Dos cosas en una porque son la misma secuencia.

        El saludo importa porque hasta que no llega el primer byte el navegador
        no considera abierta la conexión y `onopen` no dispara. El latido
        importa porque nginx corta a los 60s de silencio y el navegador queda
        reconectando en loop.
        """
        from app.api.routes import events as ruta

        events.registrar_loop(asyncio.get_running_loop())
        monkeypatch.setattr(ruta, "_LATIDO_SEGUNDOS", 0.05)

        stream = ruta._stream(["admin"])
        assert (await anext(stream)).startswith(":")   # saludo
        assert (await anext(stream)).startswith(":")   # latido, sin eventos
        await stream.aclose()

    @pytest.mark.asyncio
    async def test_emite_el_evento_publicado(self, monkeypatch):
        from app.api.routes import events as ruta

        events.registrar_loop(asyncio.get_running_loop())
        monkeypatch.setattr(ruta, "_LATIDO_SEGUNDOS", 5.0)

        stream = ruta._stream(["admin"])
        await anext(stream)  # saludo

        siguiente = asyncio.create_task(anext(stream))  # type: ignore[arg-type]
        await asyncio.sleep(0.01)
        events.publicar(["admin"], "order.created", order_id=42)

        trozo = await asyncio.wait_for(siguiente, timeout=1.0)
        assert trozo == 'data: {"type": "order.created", "order_id": 42}\n\n'
        await stream.aclose()


class TestPublicarNuncaRompe:
    def test_publicar_sin_suscriptores_no_hace_nada(self):
        events.publicar(["admin"], "order.created", order_id=1)  # no debe tirar

    def test_publicar_sin_loop_registrado_no_tira(self):
        """Pasa en cualquier código que corra fuera del ciclo de vida de la app
        (un script, un test suelto). Tiene que ser inofensivo."""
        events._loop = None
        events.publicar(["admin"], "order.created", order_id=1)

    def test_un_error_del_cliente_redis_se_traga(self, monkeypatch):
        """El caso que justifica el try/except: Redis caído en medio de una
        compra. El evento se pierde, el pedido se guarda igual."""
        class RedisRoto:
            def publish(self, *_args, **_kwargs):
                raise RuntimeError("conexión caída")

        monkeypatch.setattr(events, "get_redis", lambda: RedisRoto())
        events.publicar(["admin"], "order.created", order_id=1)  # no debe tirar
