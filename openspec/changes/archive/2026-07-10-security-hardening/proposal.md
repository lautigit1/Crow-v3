# Proposal: security-hardening

## What

Corregir las 6 debilidades de seguridad identificadas en la auditoría del 2026-07-10: bypass del rate limiter por rotación de email, refresh token no revocado en logout, sesiones que sobreviven al cambio de contraseña, ausencia de protección CSRF explícita, posible inyección de headers SMTP, y pedidos sin validación de stock ni topes.

## Why

- **Rate limit evadible (crítico):** el limiter de `POST /quotes` y `/register` usa la clave `ip:email`. Variar el email genera una clave nueva por request → spam ilimitado de cotizaciones (cada una envía un mail al admin) y creación ilimitada de cuentas por IP.
- **Logout incompleto:** solo se bloquea el jti del access token. Un refresh token robado sigue siendo válido hasta 60 minutos después del logout.
- **Sesiones inmortales tras reset:** cambiar o resetear la contraseña no invalida los tokens ya emitidos; en un escenario de cuenta comprometida el atacante conserva la sesión.
- **CSRF de una sola capa:** toda la defensa es `SameSite=lax`; no hay validación de `Origin` ni token CSRF en endpoints mutantes.
- **Inyección SMTP:** `customer_name` (input público) se interpola crudo en el `Subject` del mail al admin; un valor con `\r\n` puede inyectar headers.
- **Pedidos sin control:** `POST /orders` no valida ni descuenta stock, `quantity` no tiene tope, la lista de ítems es ilimitada, no hay rate limit ni auditoría.

## Non-goals

- No se agrega CAPTCHA (queda para una iteración futura si el spam persiste).
- No se implementa detección de reuso de refresh tokens con revocación de familia completa (la rotación one-time-use existente ya mitiga el replay).
- No se integra pasarela de pago; el descuento de stock es al crear el pedido, sin reserva temporal.
- No se toca la infraestructura (TRUSTED_PROXIES, compose de producción) — eso es otro change.

## Success criteria

- Un atacante que rota emails desde una misma IP queda bloqueado en `/quotes`, `/register` y `/forgot-password` al superar el tope por IP.
- Después de `POST /auth/logout`, el refresh token de esa sesión devuelve 401 en `/auth/refresh`.
- Después de cambiar o resetear la contraseña, todos los tokens emitidos antes del cambio devuelven 401; el usuario que cambió su propia contraseña conserva su sesión (se le reemiten cookies).
- Una request mutante con header `Origin` ajeno a los orígenes permitidos recibe 403 aunque lleve cookies válidas.
- Un `customer_name` con saltos de línea no puede inyectar headers en el email al admin.
- Un pedido con `quantity` mayor al stock disponible es rechazado con 409; crear un pedido descuenta stock y cancelarlo (estando Pendiente) lo devuelve. Cantidad máxima 999 por ítem, 50 ítems por pedido. Creación de pedidos rate-limiteada y auditada.
