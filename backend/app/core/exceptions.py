"""
Global exception handlers for FastAPI.

Register all handlers via ``register_exception_handlers(app)`` in main.py.
Every handler returns a consistent JSON envelope:
    {"detail": "<human-readable message>", "request_id": "<uuid>"}

Rules:
  - Never expose internal details (stack traces, SQL, file paths) to the client.
  - Always log the full exception server-side with the request_id for tracing.
  - IntegrityError (duplicate key, FK violation) → 409 Conflict
  - Generic SQLAlchemyError → 503 Service Unavailable (DB issue)
  - RequestValidationError → 422 (FastAPI default, but we normalise the shape)
  - Unhandled Exception → 500 Internal Server Error
"""

import logging

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError, SQLAlchemyError

logger = logging.getLogger("crow.exceptions")


def _request_id(request: Request) -> str:
    return getattr(request.state, "request_id", "-")


def _error_response(request: Request, status_code: int, detail: str) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={"detail": detail, "request_id": _request_id(request)},
    )


# ---------------------------------------------------------------------------
# Handlers
# ---------------------------------------------------------------------------

async def integrity_error_handler(request: Request, exc: IntegrityError) -> JSONResponse:
    logger.warning(
        "IntegrityError",
        extra={"request_id": _request_id(request), "orig": str(exc.orig)},
    )
    # Detect duplicate-key vs. other constraint violations
    msg = str(exc.orig).lower()
    if "unique" in msg or "duplicate" in msg:
        detail = "Ya existe un registro con ese valor (clave duplicada)."
    elif "foreign key" in msg or "violates" in msg:
        detail = "La operación viola una restricción de integridad referencial."
    else:
        detail = "Conflicto de datos en la base de datos."
    return _error_response(request, status.HTTP_409_CONFLICT, detail)


async def sqlalchemy_error_handler(request: Request, exc: SQLAlchemyError) -> JSONResponse:
    logger.error(
        "SQLAlchemyError",
        extra={"request_id": _request_id(request)},
        exc_info=exc,
    )
    return _error_response(
        request,
        status.HTTP_503_SERVICE_UNAVAILABLE,
        "Error de base de datos. Intente nuevamente en unos momentos.",
    )


async def validation_error_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    # Flatten Pydantic's nested errors into a readable list
    errors = [
        f"{' → '.join(str(l) for l in e['loc'])}: {e['msg']}"
        for e in exc.errors()
    ]
    logger.info(
        "ValidationError",
        extra={"request_id": _request_id(request), "errors": errors},
    )
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "detail": "Datos de entrada inválidos.",
            "errors": errors,
            "request_id": _request_id(request),
        },
    )


async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.error(
        "UnhandledException",
        extra={"request_id": _request_id(request)},
        exc_info=exc,
    )
    return _error_response(
        request,
        status.HTTP_500_INTERNAL_SERVER_ERROR,
        "Error interno del servidor. El equipo ha sido notificado.",
    )


# ---------------------------------------------------------------------------
# Registration helper
# ---------------------------------------------------------------------------

def register_exception_handlers(app: FastAPI) -> None:
    """Call once in main.py after creating the FastAPI instance."""
    app.add_exception_handler(IntegrityError, integrity_error_handler)  # type: ignore[arg-type]
    app.add_exception_handler(SQLAlchemyError, sqlalchemy_error_handler)  # type: ignore[arg-type]
    app.add_exception_handler(RequestValidationError, validation_error_handler)  # type: ignore[arg-type]
    app.add_exception_handler(Exception, unhandled_exception_handler)  # type: ignore[arg-type]
