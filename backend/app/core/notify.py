"""
La única puerta por la que sale un aviso.

El riesgo de tener tres canales -- campana, evento en vivo y email -- es que se
separen: el aviso de la campana escrito en un lado, el correo en otro, el evento
en un tercero. Tarde o temprano se agrega un estado nuevo, aparece en dos de los
tres, y nadie se entera hasta que un cliente pregunta por qué no le avisaron.

Por eso todo pasa por `notificar()`. Quien cambia un estado no piensa en canales,
y agregar un origen nuevo no puede dejar uno afuera.

Ver openspec/changes/notifications-center/design.md §1.
"""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING, Any

from sqlalchemy.orm import Session

from app.core import events
from app.models.notification import Notification, NotificationType

if TYPE_CHECKING:
    from fastapi import BackgroundTasks

logger = logging.getLogger(__name__)


def notificar(
    db: Session,
    *,
    user_id: int,
    tipo: NotificationType,
    titulo: str,
    cuerpo: str | None = None,
    enlace: str | None = None,
    email: dict[str, Any] | None = None,
    background: BackgroundTasks | None = None,
) -> Notification:
    """Registra un aviso y lo reparte a los canales que correspondan.

    Devuelve la fila creada.

    **Solo el INSERT puede fallar hacia afuera.** El evento en vivo y el email
    van envueltos: que falle el aviso no puede voltear la operación que lo
    generó. Un pedido confirmado sin notificar es un inconveniente; un pedido
    que no se confirma porque Redis estaba caído o el SMTP rechazó la conexión
    es un problema.

    `email` es el dict que devuelven los builders de `app.core.email` (con
    `to`/`subject`/`html`/`text`), o None si esta notificación no manda correo.
    `background` es el `BackgroundTasks` de la request: sin él el correo se
    manda igual, pero de forma sincrónica, y el cliente espera al SMTP.
    """
    notificacion = Notification(
        user_id=user_id,
        type=tipo,
        title=titulo,
        body=cuerpo,
        link=enlace,
    )
    db.add(notificacion)
    db.flush()

    # Canal en vivo: la campana se actualiza sin recargar. El evento no lleva
    # datos -- solo el tipo -- por las mismas razones que los de pedidos: nada
    # sensible viaja por el canal y hay un solo camino de lectura.
    try:
        events.publicar([events.canal_usuario(user_id)], "notification.created")
    except Exception as exc:  # noqa: BLE001 -- deliberado, ver docstring
        logger.warning("No se pudo publicar la notificación %s: %s", notificacion.id, exc)

    if email:
        try:
            from app.core.email import send_email

            if background is not None:
                background.add_task(send_email, **email)
            else:
                send_email(**email)
        except Exception as exc:  # noqa: BLE001 -- deliberado, ver docstring
            logger.warning("No se pudo encolar el email de la notificación: %s", exc)

    return notificacion


def notificar_a_admins(
    db: Session,
    *,
    tipo: NotificationType,
    titulo: str,
    cuerpo: str | None = None,
    enlace: str | None = None,
) -> list[Notification]:
    """Igual que `notificar()`, pero para todos los admins activos.

    Cada uno recibe **su propia fila**, y por lo tanto su propio estado de
    lectura: que uno lo haya visto no marca el aviso como visto para el resto.
    Es lo correcto -- son dos personas distintas -- y es la razón por la que no
    existe una notificación "de rol" compartida.

    Sin email: los avisos al admin son operativos y de alta frecuencia; llenarle
    la casilla con cada pedido que entra sería contraproducente.
    """
    from sqlalchemy import select

    from app.models.user import User, UserRole

    admins = db.scalars(
        select(User).where(User.role == UserRole.ADMIN, User.is_active.is_(True))
    ).all()

    return [
        notificar(db, user_id=a.id, tipo=tipo, titulo=titulo, cuerpo=cuerpo, enlace=enlace)
        for a in admins
    ]
