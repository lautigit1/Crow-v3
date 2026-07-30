"""
Qué se le dice al cliente cuando su pedido se mueve, y cuándo sale un correo.

Vive aparte de la ruta a propósito: la ruta se ocupa de cambiar el estado y de
la regla de stock; acá está la redacción y el criterio de qué merece un correo.
Mezclarlos haría que agregar un estado nuevo implique tocar el endpoint.

Ver openspec/changes/notifications-center/design.md §4.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy.orm import Session

from app.core.email import build_order_update_email
from app.core.notify import notificar
from app.models.notification import NotificationType
from app.models.order import Order, OrderStatus, PaymentStatus

if TYPE_CHECKING:
    from fastapi import BackgroundTasks

# ---------------------------------------------------------------------------
# El interruptor del email
# ---------------------------------------------------------------------------
# La campana registra TODO. El correo sale solo en las transiciones que cambian
# algo del lado del cliente.
#
# "En proceso" y "Link enviado" son estados de la operación interna: el cliente
# no hace nada distinto al enterarse, así que quedan solo en la campana.
#
# CANCELADO no manda correo a propósito. Un pedido se cancela por algo -- falta
# de stock, el cliente cambió de idea -- y eso siempre viene con una
# conversación por WhatsApp. Un correo automático diciendo "tu pedido fue
# cancelado", sin motivo ni contexto, llega peor que no llegar.
ENTREGA_CON_EMAIL = {
    OrderStatus.CONFIRMADO,
    OrderStatus.ENVIADO,
    OrderStatus.ENTREGADO,
}
COBRO_CON_EMAIL = {PaymentStatus.PAGADO}

# Redacción por estado. En segunda persona y sin jerga: "Confirmado" es lenguaje
# del panel; del otro lado se lee mejor como una frase que dice qué pasó.
TITULO_ENTREGA = {
    OrderStatus.CONFIRMADO: "Tu pedido está confirmado",
    OrderStatus.EN_PROCESO: "Estamos preparando tu pedido",
    OrderStatus.ENVIADO: "Tu pedido está en camino",
    OrderStatus.ENTREGADO: "Tu pedido fue entregado",
    OrderStatus.CANCELADO: "Tu pedido fue cancelado",
    OrderStatus.PENDIENTE: "Recibimos tu pedido",
}
DETALLE_ENTREGA = {
    OrderStatus.CONFIRMADO: "Verificamos stock y precio. Ya lo estamos preparando.",
    OrderStatus.EN_PROCESO: "Lo estamos armando. Te avisamos cuando salga.",
    OrderStatus.ENVIADO: "Coordinamos la entrega por WhatsApp.",
    OrderStatus.ENTREGADO: "Gracias por comprar en Crow Repuestos.",
    OrderStatus.CANCELADO: None,
    OrderStatus.PENDIENTE: None,
}
TITULO_COBRO = {
    PaymentStatus.PAGADO: "Registramos tu pago",
    PaymentStatus.LINK_ENVIADO: "Te enviamos el link de pago",
    PaymentStatus.SIN_COBRAR: "El pago quedó pendiente",
}


def notificar_cambio_de_pedido(
    db: Session,
    order: Order,
    *,
    entrega_anterior: OrderStatus,
    cobro_anterior: PaymentStatus,
    background: BackgroundTasks | None = None,
) -> None:
    """Avisa al dueño del pedido de los ejes que efectivamente cambiaron.

    **Una notificación por eje**: son hechos distintos y cada uno tiene su tipo,
    así que la campana puede mostrarlos por separado.

    **Un solo correo como máximo.** Si los dos ejes cambian y los dos califican
    -- por ejemplo Confirmado y Pagado a la vez, que es un caso real cuando el
    admin resuelve todo de una -- se manda uno que menciona los dos, no dos
    correos sobre el mismo pedido en el mismo segundo.
    """
    cambio_entrega = order.status != entrega_anterior
    cambio_cobro = order.payment_status != cobro_anterior
    if not cambio_entrega and not cambio_cobro:
        return

    usuario = order.user
    nombre = (usuario.full_name.split()[0] if usuario and usuario.full_name else "") or "Hola"

    # ── El correo, decidido antes de crear las notificaciones ──────────────
    entrega_para_email = (
        order.status if cambio_entrega and order.status in ENTREGA_CON_EMAIL else None
    )
    cobro_para_email = (
        order.payment_status
        if cambio_cobro and order.payment_status in COBRO_CON_EMAIL
        else None
    )

    email = None
    if (entrega_para_email or cobro_para_email) and usuario and usuario.email:
        # El título lo manda el eje de entrega cuando hay uno: es el que la
        # persona está esperando. Si solo cambió el cobro, titula el cobro.
        titulo = (
            TITULO_ENTREGA[entrega_para_email]
            if entrega_para_email
            else TITULO_COBRO[cobro_para_email]
        )
        email = build_order_update_email(
            to=usuario.email,
            name=nombre,
            order_id=order.id,
            titulo=titulo,
            resumen=f"{titulo}. Pedido N.º {order.id:05d}.",
            estado_entrega=entrega_para_email.value if entrega_para_email else None,
            estado_cobro=cobro_para_email.value if cobro_para_email else None,
            detalle=DETALLE_ENTREGA.get(entrega_para_email) if entrega_para_email else None,
        )

    # ── Las notificaciones, una por eje ───────────────────────────────────
    if cambio_entrega:
        notificar(
            db,
            user_id=order.user_id,
            tipo=NotificationType.ORDER_STATUS,
            titulo=TITULO_ENTREGA.get(order.status, "Tu pedido cambió de estado"),
            cuerpo=DETALLE_ENTREGA.get(order.status),
            enlace="/cuenta/pedidos",
            email=email,          # va en la primera; la segunda no lo repite
            background=background,
        )
        email = None

    if cambio_cobro:
        notificar(
            db,
            user_id=order.user_id,
            tipo=NotificationType.ORDER_PAYMENT,
            titulo=TITULO_COBRO.get(order.payment_status, "El pago cambió de estado"),
            enlace="/cuenta/pedidos",
            email=email,
            background=background,
        )
