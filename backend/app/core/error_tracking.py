"""
Inicialización opcional de Sentry para error tracking en producción.

Hallazgo de la auditoría técnica del 2026-07-13: no había ninguna forma de
enterarse de un error 500 en producción salvo que un usuario lo reportara a
mano -- los logs estructurados (`logging_config.py`) existen pero nadie los
mira en tiempo real. Sentry cierra ese hueco con alertas automáticas.

Diseñado para que la ausencia de configuración sea 100% segura:
  - Si SENTRY_DSN está vacío (default), esta función no hace nada -- ni
    siquiera importa el paquete `sentry_sdk`. La app funciona exactamente
    igual que antes de este cambio, y no hace falta tener el paquete
    instalado (por eso el import es local a la función, no a nivel de
    módulo) para correr tests o desarrollo local sin Sentry.
  - `sentry-sdk` es una dependencia opcional en requirements.txt -- si por
    algún motivo no está instalada pese a haber un DSN configurado, se
    loguea un warning en vez de tirar abajo el arranque de la API.
"""
from app.core.config import settings
from app.core.logging_config import get_logger

logger = get_logger("crow.error_tracking")


def init_sentry() -> None:
    if not settings.SENTRY_DSN:
        logger.info("SENTRY_DSN no configurada -- error tracking deshabilitado")
        return

    try:
        import sentry_sdk
        from sentry_sdk.integrations.fastapi import FastApiIntegration
        from sentry_sdk.integrations.starlette import StarletteIntegration
    except ImportError:
        logger.warning(
            "SENTRY_DSN está configurada pero el paquete sentry-sdk no está "
            "instalado -- agregalo a requirements.txt (sentry-sdk[fastapi])."
        )
        return

    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        environment=settings.ENVIRONMENT,
        release="crow-repuestos-api@1.3.0",
        traces_sample_rate=settings.SENTRY_TRACES_SAMPLE_RATE,
        # No mandar bodies de request/response completos -- pueden traer
        # contraseñas u otros datos sensibles en payloads de auth/checkout.
        send_default_pii=False,
        integrations=[StarletteIntegration(), FastApiIntegration()],
    )
    logger.info("Sentry error tracking inicializado", extra={"environment": settings.ENVIRONMENT})
