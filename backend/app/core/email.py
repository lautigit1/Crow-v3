"""
Email service for Crow Repuestos.

Uses Python's built-in smtplib (no extra dependencies).
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
import textwrap
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.core.config import settings
from app.core.logging_config import get_logger

logger = get_logger("crow.email")


# ---------------------------------------------------------------------------
# Core sender
# ---------------------------------------------------------------------------

def send_email(*, to: str, subject: str, html: str, text: str = "") -> None:
    """
    Send an email synchronously (call from BackgroundTasks so it's off the
    main thread).  Silently skips if SMTP is not configured.
    """
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

    html = f"""\
    <html><body style="font-family:sans-serif;color:#1a1a1a;max-width:600px;margin:0 auto">
      <div style="border-top:3px solid #0057D9;padding:32px 0 0">
        <h2 style="color:#0057D9;margin:0 0 24px">Nueva cotización #{quote_id}</h2>
        <table style="border-collapse:collapse;width:100%">
          <tr><td style="padding:8px 0;color:#666;width:140px">Cliente</td>
              <td style="padding:8px 0;font-weight:600">{customer_name}</td></tr>
          <tr><td style="padding:8px 0;color:#666">Email</td>
              <td style="padding:8px 0">{customer_email or "—"}</td></tr>
          <tr><td style="padding:8px 0;color:#666">Teléfono</td>
              <td style="padding:8px 0">{customer_phone or "—"}</td></tr>
          <tr><td style="padding:8px 0;color:#666">Vehículo</td>
              <td style="padding:8px 0">{vehicle or "—"}</td></tr>
        </table>
        <div style="margin:24px 0 0;padding:16px;background:#f4f7ff;border-radius:8px">
          <div style="color:#666;font-size:12px;margin-bottom:8px">MENSAJE</div>
          <p style="margin:0;line-height:1.6">{message}</p>
        </div>
        <div style="margin:24px 0 0">
          <a href="{settings.FRONTEND_URL}/admin/cotizaciones"
             style="background:#0057D9;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">
            Ver en el panel
          </a>
        </div>
      </div>
    </body></html>
    """

    text = textwrap.dedent(f"""\
        Nueva cotización #{quote_id}
        ─────────────────────────────
        Cliente:  {customer_name}
        Email:    {customer_email or "—"}
        Teléfono: {customer_phone or "—"}
        Vehículo: {vehicle or "—"}

        {message}

        Panel: {settings.FRONTEND_URL}/admin/cotizaciones
    """)

    return dict(to=settings.ADMIN_EMAIL, subject=subject, html=html, text=text)


def build_reset_email(*, to: str, reset_url: str, name: str) -> dict:
    """Returns kwargs for send_email() — password reset link."""
    subject = "Crow Repuestos — Recuperación de contraseña"

    html = f"""\
    <html><body style="font-family:sans-serif;color:#1a1a1a;max-width:600px;margin:0 auto">
      <div style="border-top:3px solid #0057D9;padding:32px 0 0">
        <h2 style="color:#0057D9;margin:0 0 16px">Recuperar contraseña</h2>
        <p>Hola {name},</p>
        <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta.
           El enlace es válido por <strong>60 minutos</strong>.</p>
        <div style="margin:32px 0">
          <a href="{reset_url}"
             style="background:#0057D9;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600">
            Restablecer contraseña
          </a>
        </div>
        <p style="color:#666;font-size:13px">
          Si no solicitaste este cambio, ignorá este email. Tu contraseña no va a cambiar.
        </p>
        <hr style="border:none;border-top:1px solid #eee;margin:32px 0">
        <p style="color:#999;font-size:12px">Crow Repuestos · Mendoza, Argentina</p>
      </div>
    </body></html>
    """

    text = textwrap.dedent(f"""\
        Hola {name},

        Recibimos una solicitud para restablecer tu contraseña.
        El enlace es válido por 60 minutos.

        {reset_url}

        Si no solicitaste este cambio, ignorá este email.

        — Crow Repuestos
    """)

    return dict(to=to, subject=subject, html=html, text=text)
