"""
La cola post-commit: que los efectos vean la transacción ya confirmada.

Estos tests existen por un bug concreto. Los correos y los eventos de la
campana salían por `BackgroundTasks`, que hasta FastAPI 0.115 corría después
del teardown de las dependencias -- o sea después del `commit()` de `get_db()`.
En 0.141 ese orden se invirtió (fastapi/fastapi#14099). Nadie había escrito esa
dependencia en ningún lado, así que el salto de versión pasó los 504 tests del
backend y rompió el registro en producción: 201 con un token válido para un
usuario que todavía no estaba en la base, y el `/auth/me` siguiente daba 401.

Por eso la prueba no mira "se llamó a send_email" -- eso ya lo hacía el test
del correo de bienvenida y no alcanzó. Mira **desde otra sesión**, que es lo
único que distingue "ya commiteó" de "todavía no": si el efecto corre antes del
commit, la segunda sesión no ve la fila y el test falla.
"""

import pytest
from sqlalchemy import create_engine, delete, select
from sqlalchemy.orm import sessionmaker

from app.core import database
from app.core.database import get_db
from app.core.post_commit import DespuesDelCommit, cola_post_commit
from app.core.unit_of_work import confirmar, descartar
from app.models.brand import Brand
from tests.conftest import TEST_DATABASE_URL


class _RequestFalsa:
    """Lo único que la cola necesita de una Request es `.state`."""

    class _Estado:
        pass

    def __init__(self) -> None:
        self.state = self._Estado()


@pytest.fixture()
def base_en_disco(monkeypatch):
    """La base de tests, pero con commits reales.

    Estos tests necesitan que `get_db()` commitee de verdad para poder abrir una
    **segunda** conexión que vea lo commiteado por la primera, así que no pueden
    usar el fixture `db` (que revierte todo). A cambio, limpian lo suyo al
    terminar para no dejarle marcas al resto de la suite.
    """
    engine = create_engine(TEST_DATABASE_URL)
    monkeypatch.setattr(database, "SessionLocal", sessionmaker(autocommit=False, autoflush=False, bind=engine))
    yield engine
    with engine.begin() as conn:
        conn.execute(delete(Brand).where(Brand.slug.in_(("bosch", "fantasma"))))
    engine.dispose()


def _marcas_visibles_desde_afuera(engine) -> list[str]:
    """Lee con una conexión propia: solo ve lo que está commiteado."""
    with engine.connect() as conn:
        return [fila[0] for fila in conn.execute(select(Brand.name))]


class TestOrden:
    def test_el_efecto_ve_la_fila_ya_commiteada(self, base_en_disco):
        request = _RequestFalsa()
        visto: list[list[str]] = []

        gen = get_db(request)
        db = next(gen)
        db.add(Brand(name="Bosch", slug="bosch"))
        db.flush()
        cola_post_commit(request).add_task(
            lambda: visto.append(_marcas_visibles_desde_afuera(base_en_disco))
        )

        # Cierra la unidad de trabajo como lo hace el middleware cuando el
        # endpoint terminó bien, y después la dependencia, como hace FastAPI.
        confirmar(request)
        with pytest.raises(StopIteration):
            next(gen)

        assert visto == [["Bosch"]], "el efecto corrió antes del commit"

    def test_una_request_que_falla_no_dispara_nada(self, base_en_disco):
        """El correo que anuncia algo que se revirtió es peor que no mandarlo."""
        request = _RequestFalsa()
        corrio = []

        gen = get_db(request)
        db = next(gen)
        db.add(Brand(name="Fantasma", slug="fantasma"))
        db.flush()
        cola_post_commit(request).add_task(lambda: corrio.append(True))

        # El endpoint explota: el middleware revierte y no confirma nada, y la
        # excepción sigue subiendo por la dependencia.
        descartar(request)
        with pytest.raises(RuntimeError):
            gen.throw(RuntimeError("la ruta explotó"))

        assert corrio == []
        assert _marcas_visibles_desde_afuera(base_en_disco) == []

    def test_sin_efectos_encolados_no_molesta(self, base_en_disco):
        """El 99% de las rutas no encola nada; no tienen que pagar por esto."""
        request = _RequestFalsa()
        gen = get_db(request)
        next(gen)
        confirmar(request)
        with pytest.raises(StopIteration):
            next(gen)


class TestAislamiento:
    def test_un_efecto_que_falla_no_frena_a_los_demas(self):
        """El correo y el evento de la campana no dependen uno del otro."""
        cola = DespuesDelCommit()
        corrieron = []

        def explota():
            raise RuntimeError("connection refused")

        cola.add_task(explota)
        cola.add_task(lambda: corrieron.append("segundo"))

        cola.ejecutar()  # no levanta

        assert corrieron == ["segundo"]

    def test_no_repite_lo_ya_ejecutado(self):
        cola = DespuesDelCommit()
        veces = []
        cola.add_task(lambda: veces.append(1))

        cola.ejecutar()
        cola.ejecutar()

        assert veces == [1]

    def test_respeta_el_orden_de_encolado(self):
        cola = DespuesDelCommit()
        orden = []
        cola.add_task(lambda: orden.append("uno"))
        cola.add_task(lambda: orden.append("dos"))

        cola.ejecutar()

        assert orden == ["uno", "dos"]

    def test_pasa_args_y_kwargs_como_background_tasks(self):
        """Los call sites usan las dos formas; la firma tiene que aceptarlas."""
        cola = DespuesDelCommit()
        recibido = {}

        def efecto(canal, evento, *, order_id):
            recibido.update(canal=canal, evento=evento, order_id=order_id)

        cola.add_task(efecto, ["admin"], "order.created", order_id=7)
        cola.ejecutar()

        assert recibido == {"canal": ["admin"], "evento": "order.created", "order_id": 7}


class TestIntegracion:
    def test_el_registro_deja_al_usuario_visible_antes_de_avisar(self, client, monkeypatch):
        """La forma en que se manifestó el bug, de punta a punta.

        El correo de bienvenida se manda con el `id` del usuario ya asignado y
        la cuenta consultable. Antes el token salía primero y el `/auth/me`
        siguiente daba 401.
        """
        momentos = []
        monkeypatch.setattr(
            "app.core.email.send_email",
            lambda **kw: momentos.append(kw["to"]),
        )

        r = client.post(
            "/api/auth/register",
            json={
                "full_name": "Ana Gómez",
                "email": "orden@test.com",
                "password": "Password1!",
                "phone": "261 660-0569",
            },
        )
        assert r.status_code == 201
        assert momentos == ["orden@test.com"]

        # Con la cookie que devolvió el registro, la cuenta ya responde.
        me = client.get("/api/auth/me")
        assert me.status_code == 200
        assert me.json()["email"] == "orden@test.com"


class TestMomentoDelCommit:
    """Cuándo commitea la request, que es de dónde salió el bug de lectura vieja.

    El commit vivía en el teardown de `get_db()`. Desde FastAPI 0.141 ese
    teardown corre DESPUÉS de que la respuesta salió, así que la API contestaba
    200 con datos que todavía no estaban en la base: medido contra el stack
    real, 20 de 20 lecturas inmediatas después de un PATCH devolvían el valor
    anterior.

    Este test fija el orden en un app mínimo -- endpoint, commit, recién
    después el teardown de la dependencia -- para que un cambio futuro de
    FastAPI o del orden de los middlewares no lo vuelva a dar vuelta en
    silencio.
    """

    def _app_minima(self, orden: list[str], falla: bool = False):
        from fastapi import Depends, FastAPI, HTTPException, Request
        from fastapi.testclient import TestClient

        from app.core.unit_of_work import UnitOfWorkMiddleware, registrar_sesion

        class _SesionFalsa:
            def commit(self) -> None:
                orden.append("commit")

            def rollback(self) -> None:
                orden.append("rollback")

        def dependencia(request: Request):
            registrar_sesion(request, _SesionFalsa())
            yield
            orden.append("teardown de la dependencia")

        app = FastAPI()
        app.add_middleware(UnitOfWorkMiddleware)

        @app.get("/x")
        def x(_=Depends(dependencia)):
            orden.append("endpoint")
            if falla:
                raise HTTPException(status_code=400, detail="no")
            return {"ok": True}

        return TestClient(app)

    def test_commitea_despues_del_endpoint_y_antes_de_cerrar_la_dependencia(self):
        orden: list[str] = []
        assert self._app_minima(orden).get("/x").status_code == 200
        assert orden == ["endpoint", "commit", "teardown de la dependencia"]

    def test_una_respuesta_de_error_revierte(self):
        """Sin "teardown": la excepción se le tira a la dependencia en el
        `yield`, así que su código de cierre no llega a correr -- y para
        entonces la sesión ya está cerrada, con lo que este rollback es la red
        de la respuesta de error, no el único rollback."""
        orden: list[str] = []
        assert self._app_minima(orden, falla=True).get("/x").status_code == 400
        assert orden == ["endpoint", "rollback"]
