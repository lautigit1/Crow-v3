"""
Dónde cierra la transacción de una request.

Hasta ahora cerraba en el teardown de `get_db()`, que es el código después del
`yield` de una dependencia. Desde FastAPI 0.141 ese teardown corre **después de
que la respuesta salió** (fastapi/fastapi#14099), así que la API contestaba 200
con datos todavía sin commitear: quien escribía y leía enseguida veía el valor
anterior. Medido contra el stack real antes del arreglo, **20 de 20** lecturas
inmediatas después de un PATCH devolvieron el valor viejo. Dos tests E2E se
caían por eso desde que el panel dejó de esperar 200 ms antes de recargar.

Ahora el commit lo hace este middleware, que corre cuando el endpoint ya
devolvió pero antes de que la respuesta se entregue y antes del teardown de las
dependencias (verificado con las tres marcas en ese orden). Lo que NO cambia:

- Sigue habiendo un solo commit por request y las rutas siguen sin llamarlo.
- Si la request falla no se commitea: el rollback lo hace este mismo middleware
  ante un error o una respuesta 4xx/5xx, y `get_db()` revierte igual en su
  teardown si la excepción lo atraviesa.
- Los efectos post-commit (correos, eventos de la campana) siguen saliendo
  después del commit y solo si hubo commit.

Va como middleware y no como `route_class`: desde 0.141 `include_router` no
propaga la clase de ruta del router padre a los hijos (verificado), así que
habría que repetirla en cada módulo de rutas y alcanzaría con olvidarla una vez
para que ese recurso volviera a responder antes de commitear.
"""

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

from app.core.post_commit import ejecutar_post_commit

_ATRIBUTO = "db"


def registrar_sesion(request: Request, sesion) -> None:
    """`get_db()` deja acá la sesión de la request para que el middleware la cierre."""
    setattr(request.state, _ATRIBUTO, sesion)


def _sesion_de(request: Request):
    return getattr(request.state, _ATRIBUTO, None)


def confirmar(request: Request) -> None:
    """Cierra la unidad de trabajo: commitea y recién ahí dispara los efectos.

    Los efectos se ejecutan aunque no haya sesión: hay rutas que encolan sin
    escribir en la base.
    """
    sesion = _sesion_de(request)
    if sesion is not None:
        sesion.commit()
    ejecutar_post_commit(request)


def descartar(request: Request) -> None:
    """Revierte y tira lo encolado -- un aviso de algo que no pasó es peor que ninguno."""
    sesion = _sesion_de(request)
    if sesion is not None:
        sesion.rollback()


class UnitOfWorkMiddleware(BaseHTTPMiddleware):
    """Commitea (o revierte) la transacción de la request antes de responder."""

    async def dispatch(self, request: Request, call_next) -> Response:
        try:
            respuesta = await call_next(request)
        except Exception:
            descartar(request)
            raise

        if respuesta.status_code >= 400:
            # Los handlers de excepciones corren más adentro que este
            # middleware, así que una excepción ya manejada llega hasta acá
            # convertida en respuesta. Una operación que terminó en error no se
            # persiste, y lo encolado se descarta con ella.
            descartar(request)
            return respuesta

        confirmar(request)
        return respuesta
