"""
Email service for Crow Repuestos.

Uses Python's built-in smtplib (no extra dependencies for sending).
Templates are rendered with Jinja2 (app/templates/emails/*.jinja) instead of
being built as raw Python f-strings — see build_quote_notification() and
build_reset_email() below for why that matters, not just for maintainability.

All sends run in a ThreadPoolExecutor via FastAPI BackgroundTasks so they
never block request/response cycles.

Usage:
    from fastapi import BackgroundTasks
    from app.core.email import send_email, build_quote_notification, build_reset_email

    background_tasks.add_task(send_email, **build_quote_notification(quote))

If SMTP_USER or SMTP_PASSWORD are empty (local dev), the send is skipped
and the email body is logged instead — no crashes, no config required.
"""

import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path

from jinja2 import Environment, FileSystemLoader, select_autoescape

from app.core.config import settings
from app.core.logging_config import get_logger

logger = get_logger("crow.email")

_TEMPLATES_DIR = Path(__file__).resolve().parent.parent / "templates" / "emails"

# autoescape=True only for .html templates: customer-submitted fields (quote
# message, name, phone) get HTML-escaped automatically before being dropped
# into markup. The old f-string version interpolated that data unescaped —
# a quote message containing "<img src=x onerror=...>" would have executed
# in whatever mail client rendered the admin notification. The .txt sibling
# templates are rendered without escaping since they have no markup to
# protect and HTML-escaping would corrupt plain text (e.g. turn "'" into
# "&#39;").
_env = Environment(
    loader=FileSystemLoader(_TEMPLATES_DIR),
    # select_autoescape matches on the FULL suffix ("*.endswith(pattern)"), so
    # with our "name.html.jinja" / "name.txt.jinja" filenames the pattern has
    # to be "html.jinja", not just "html" — otherwise every template would
    # silently fall through to the (unescaped) default and the XSS-in-email
    # fix above would be a no-op.
    autoescape=select_autoescape(enabled_extensions=("html.jinja",), default_for_string=False),
    trim_blocks=True,
    lstrip_blocks=True,
)


def _render(template_name: str, **context) -> str:
    return _env.get_template(template_name).render(**context)


# ---------------------------------------------------------------------------
# Core sender
# ---------------------------------------------------------------------------

def _sanitize_subject(subject: str) -> str:
    """Collapse CR/LF — the subject may interpolate user input (e.g. the
    customer name in quote notifications) and a value with embedded newlines
    could otherwise inject arbitrary SMTP headers into the message."""
    return " ".join(subject.splitlines()).strip()


def send_email(*, to: str, subject: str, html: str, text: str = "") -> None:
    """
    Send an email synchronously (call from BackgroundTasks so it's off the
    main thread).  Silently skips if SMTP is not configured.
    """
    subject = _sanitize_subject(subject)

    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        logger.info(
            "SMTP not configured — skipping email send",
            extra={"to": to, "subject": subject},
        )
        logger.debug("Email body (text):\n%s", text or html)
        return

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = settings.SMTP_FROM
    msg["To"] = to

    if text:
        msg.attach(MIMEText(text, "plain", "utf-8"))
    msg.attach(MIMEText(html, "html", "utf-8"))

    try:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as smtp:
            smtp.ehlo()
            smtp.starttls()
            smtp.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            smtp.sendmail(settings.SMTP_FROM, to, msg.as_string())
        logger.info("Email sent", extra={"to": to, "subject": subject})
    except Exception as exc:
        # Log but don't raise — email failure should never crash the request
        logger.error("Failed to send email", extra={"to": to, "subject": subject, "error": str(exc)})


# ---------------------------------------------------------------------------
# Email builders
# ---------------------------------------------------------------------------

def build_quote_notification(
    *,
    quote_id: int,
    customer_name: str,
    customer_email: str | None,
    customer_phone: str | None,
    vehicle: str | None,
    message: str,
) -> dict:
    """Returns kwargs for send_email() — admin notification of a new quote."""
    subject = f"[Crow] Nueva cotización #{quote_id} — {customer_name}"

    ctx = {
        "quote_id": quote_id,
        "customer_name": customer_name,
        "customer_email": customer_email,
        "customer_phone": customer_phone,
        "vehicle": vehicle,
        "message": message,
        "frontend_url": settings.FRONTEND_URL,
    }
    html = _render("quote_notification.html.jinja", **ctx)
    text = _render("quote_notification.txt.jinja", **ctx)

    return {"to": settings.ADMIN_EMAIL, "subject": subject, "html": html, "text": text}


def build_order_update_email(
    *,
    to: str,
    name: str,
    order_id: int,
    titulo: str,
    resumen: str,
    estado_entrega: str | None = None,
    estado_cobro: str | None = None,
    detalle: str | None = None,
) -> dict:
    """Aviso al cliente de que su pedido se movió.

    `estado_entrega` y `estado_cobro` son opcionales por separado: se pasa solo
    el eje que cambió. Mostrar el otro como "sin cambios" agregaría ruido a un
    correo que tiene una sola cosa que decir.

    `resumen` es el preheader -- la línea que la bandeja muestra al lado del
    asunto. Va explícito y no derivado del título porque son dos textos con
    trabajos distintos: uno tiene que identificar, el otro tiene que dar la
    novedad completa en un renglón.
    """
    subject = f"Crow Repuestos — Pedido N.º {order_id:05d}: {titulo}"

    ctx = {
        "name": name,
        "order_id": order_id,
        "titulo": titulo,
        "resumen": resumen,
        "estado_entrega": estado_entrega,
        "estado_cobro": estado_cobro,
        "detalle": detalle,
        "orders_url": f"{settings.FRONTEND_URL}/cuenta/pedidos",
    }
    return {
        "to": to,
        "subject": subject,
        "html": _render("order_update.html.jinja", **ctx),
        "text": _render("order_update.txt.jinja", **ctx),
    }


def build_quote_answered_email(
    *, to: str, name: str, quote_id: int, vehicle: str | None = None
) -> dict:
    """Aviso al cliente de que su cotización fue respondida."""
    subject = f"Crow Repuestos — Respondimos tu consulta N.º {quote_id:05d}"

    ctx = {"name": name, "quote_id": quote_id, "vehicle": vehicle}
    return {
        "to": to,
        "subject": subject,
        "html": _render("quote_answered.html.jinja", **ctx),
        "text": _render("quote_answered.txt.jinja", **ctx),
    }


def build_reset_email(*, to: str, reset_url: str, name: str) -> dict:
    """Returns kwargs for send_email() — password reset link."""
    subject = "Crow Repuestos — Recuperación de contraseña"

    ctx = {"name": name, "reset_url": reset_url}
    html = _render("reset_password.html.jinja", **ctx)
    text = _render("reset_password.txt.jinja", **ctx)

    return {"to": to, "subject": subject, "html": html, "text": text}
