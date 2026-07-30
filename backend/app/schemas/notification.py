from datetime import datetime

from pydantic import BaseModel

from app.models.notification import NotificationType


class NotificationRead(BaseModel):
    id: int
    type: NotificationType
    title: str
    body: str | None
    link: str | None
    read_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}

    # `user_id` no se expone a propósito: el endpoint solo devuelve las de la
    # persona autenticada, así que el campo no aporta nada y sería un dato de
    # más viajando en cada respuesta.


class NotificationList(BaseModel):
    items: list[NotificationRead]
    total: int
    unread: int


class UnreadCount(BaseModel):
    """Respuesta del endpoint que alimenta el badge del navbar.

    Va sola y no como parte de la lista porque es la consulta más frecuente de
    la app -- corre en cada carga de página -- y traer la lista completa para
    mostrar un número sería mover datos de más justo donde más se pide.
    """

    unread: int
