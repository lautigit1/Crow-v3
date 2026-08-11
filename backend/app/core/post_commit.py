"""
Efectos que solo tienen sentido si la transacción confirmó.

El correo de bienvenida, el evento que despierta la campana, el aviso al panel:
todos son señales que dicen "ya pasó, andá a mirarlo". Si salen antes del
commit mienten -- del otro lado preguntan y todavía no hay nada -- y si la
transacción termina revirtiéndose, mienten para siempre.

`BackgroundTasks` parecía el lugar correcto para esto, y durante mucho tiempo
lo fue **por accidente**: hasta FastAPI 0.115 las tareas de background corrían
después del teardown de las dependencias, o sea después del `commit()` de
`get_db()`. En 0.141 ese orden se invirtió (fastapi/fastapi#14099) y pasaron a
correr antes. El síntoma fue un registro que devolvía 201 con un token válido
para un usuario que todavía no estaba en la base: el `/auth/me` siguiente daba
401 y la fila aparecía un par de segundos después.

Esta cola no depende de ese orden. La vacía `get_db()` con sus propias manos,
justo después del commit y **solo si el commit ocurrió**: si la request explota,
el rollback se lleva puesta la operación y las tareas encoladas se descartan
sin ejecutarse, que es exactamente lo que uno quiere de un correo que anuncia
algo que no pasó.

La interfaz es la misma de `BackgroundTasks` -- `add_task(fn, *args, **kwargs)`
-- a propósito: quien escribe una ruta no tiene que aprender nada nuevo, y la
migración fue cambiar el tipo del parámetro.

Sobre la latencia: desde FastAPI 0.141 el teardown de las dependencias corre
**después** de que la respuesta salió, así que encolar acá no hace esperar a
nadie. Verificado midiendo un teardown con `sleep(1)`: el cliente recibe la
respuesta en 0.04s.
"""

from __future__ import annotations

import logging
from collections.abc import Callable
from typing import Annotated, Any

from fastapi import Depends, Request

logger = logging.getLogger(__name__)

_ATRIBUTO = "post_commit"


class DespuesDelCommit:
    """Cola de efectos de una request, ejecutada cuando la transacción cerró."""

    def __init__(self) -> None:
        self._tareas: list[tuple[Callable[..., Any], tuple[Any, ...], dict[str, Any]]] = []

    def add_task(self, fn: Callable[..., Any], /, *args: Any, **kwargs: Any) -> None:
        """Encola `fn(*args, **kwargs)` para después del commit.

        Misma firma que `BackgroundTasks.add_task`, para que los call sites no
        tengan que cambiar de forma.
        """
        self._tareas.append((fn, args, kwargs))

    def ejecutar(self) -> None:
        """Corre lo encolado, en orden, y aísla los fallos.

        **Cada tarea va envuelta.** Es el mismo criterio de `notificar()`: que
        no salga un aviso es un inconveniente; que un pedido ya confirmado
        explote porque el SMTP rechazó la conexión es un problema. Y acá la
        excepción no llegaría a nadie de todos modos -- la respuesta ya salió
        --, así que sin el `try` quedaría como un 500 fantasma en los logs.

        Un fallo tampoco puede cancelar a los que siguen: el correo y el evento
        de la campana son independientes entre sí.
        """
        tareas, self._tareas = self._tareas, []
        for fn, args, kwargs in tareas:
            try:
                fn(*args, **kwargs)
            except Exception as exc:  # noqa: BLE001 -- deliberado, ver docstring
                logger.warning(
                    "Efecto post-commit falló (%s): %s", getattr(fn, "__name__", repr(fn)), exc
                )

    def __len__(self) -> int:
        return len(self._tareas)


def cola_post_commit(request: Request) -> DespuesDelCommit:
    """Dependencia: la cola de esta request, creada la primera vez que se pide.

    Vive en `request.state` y no en la dependencia misma porque la comparten dos
    lados que no se conocen: quien encola (las rutas) y quien vacía (`get_db`).
    """
    cola = getattr(request.state, _ATRIBUTO, None)
    if cola is None:
        cola = DespuesDelCommit()
        setattr(request.state, _ATRIBUTO, cola)
    return cola


def ejecutar_post_commit(request: Request) -> None:
    """Vacía la cola de la request, si hubo algo encolado. La llama `get_db()`."""
    cola = getattr(request.state, _ATRIBUTO, None)
    if cola is not None:
        cola.ejecutar()


PostCommit = Annotated[DespuesDelCommit, Depends(cola_post_commit)]
