# Design: security-hardening

## Fix 1 — Rate limit por IP sola en endpoints públicos

**Archivos:** `backend/app/api/routes/quotes.py`, `backend/app/api/routes/auth.py`

**Problema:** `LoginRateLimiter._key()` combina `ip:email`. En endpoints públicos el atacante controla el email, así que cada email nuevo resetea el contador.

**Enfoque:** Mantener los limiters existentes (protegen el caso "muchos intentos contra un mismo email") y agregar un segundo limiter keyed por IP usando un email constante `"*"`:

```python
# quotes.py — además del limiter (ip, email) existente
_quote_ip_limiter = LoginRateLimiter(
    max_attempts=settings.QUOTE_RATE_LIMIT * 3,   # 15/h por IP por defecto
    window_seconds=settings.QUOTE_RATE_WINDOW,
    lockout_seconds=settings.QUOTE_RATE_WINDOW,
)
_quote_ip_limiter.check(ip, "*") / .register_failure(ip, "*")
```

- `/quotes`: tope por IP = `QUOTE_RATE_LIMIT * 3` por hora (15 con defaults).
- `/register`: tope de 10 registros (exitosos o no) por IP por hora. El limiter por IP registra el hit en **todo** intento válido de registro, no solo en conflictos.
- `/forgot-password`: tope de 15 solicitudes por IP por hora (limita apuntar a muchas casillas distintas).

No se cambia `LoginRateLimiter` — el sentinel `"*"` reutiliza la infraestructura Redis/memoria existente.

---

## Fix 2 — Logout revoca el refresh token

**Archivo:** `backend/app/api/routes/auth.py`

**Problema:** la cookie `refresh_token` tiene `path=/api/auth/refresh`, por lo que el browser no la envía a `/api/auth/logout` y el endpoint no puede revocarla.

**Enfoque:**
1. Ampliar el path de la cookie a `/api/auth` (se envía en `/refresh` y `/logout`; todos los endpoints bajo ese prefijo son de auth). Ajustar `delete_cookie` al mismo path.
2. En `logout`, leer la cookie `refresh_token`, decodificarla con `decode_refresh_token()` y bloquear su jti con TTL = vida restante del token. Errores de decodificación se ignoran (cookie vieja o corrupta: no hay nada que revocar).

Nota de migración: las cookies emitidas antes de este cambio tienen el path viejo; el browser puede quedar con una cookie huérfana en `/api/auth/refresh` hasta que expire (≤60 min). `_clear_auth_cookies` borra ambos paths durante la transición.

---

## Fix 3 — Invalidar sesiones al cambiar/resetear contraseña

**Archivos:** `backend/alembic/versions/012_user_token_version.py` (nueva), `backend/app/models/user.py`, `backend/app/core/security.py`, `backend/app/core/deps.py`, `backend/app/api/routes/auth.py`, `backend/app/api/routes/users.py`, `backend/app/core/cookies.py` (nuevo)

**Enfoque — versionado de tokens:**
- Nueva columna `users.token_version INT NOT NULL DEFAULT 0` (migración 012).
- `create_access_token` y `create_refresh_token` reciben `token_version` y lo incluyen como claim `ver`.
- `get_current_user` y `get_user_from_refresh_token` comparan `payload.get("ver", 0) != user.token_version` → 401. El default 0 mantiene válidos los tokens emitidos antes del deploy (usuarios con versión 0).
- `change_password` y `reset_password` incrementan `token_version` → todos los tokens previos quedan inválidos al instante.
- UX: en `change_password` (usuario logueado) se reemiten cookies con la versión nueva en la misma response, así el usuario no pierde su sesión. En `reset_password` no hay sesión que preservar.

**Refactor necesario:** `_set_auth_cookies` / `_clear_auth_cookies` se mueven de `auth.py` a un módulo compartido `app/core/cookies.py` para que `users.py` pueda reemitir cookies sin import circular.

Se preferió `token_version` (entero en JWT) sobre `tokens_valid_from` (timestamp) porque evita problemas de clock skew y comparaciones de tipos datetime/epoch.

---

## Fix 4 — Protección CSRF por validación de Origin

**Archivos:** `backend/app/core/middleware.py`, `backend/app/main.py`

**Enfoque:** nuevo `CSRFOriginMiddleware` como segunda capa sobre `SameSite=lax`. Para métodos `POST/PUT/PATCH/DELETE`:

- Sin header `Origin` → se permite (clientes no-browser: curl, scripts, tests; los browsers modernos siempre mandan Origin en requests mutantes).
- `Origin` presente → debe estar en `settings.cors_origins` **o** coincidir con el origin propio de la request (comparando el host de `Origin` con el header `Host`), lo que cubre el acceso same-origin vía nginx y Swagger en dev. Si no coincide → 403 con detail claro. El Origin `"null"` se valida como cualquier otro valor y termina rechazado (intencional).

Registrado entre CORS y SecurityHeaders en el stack de middlewares.

---

## Fix 5 — Sanitización de headers SMTP

**Archivo:** `backend/app/core/email.py`

**Enfoque:** sanitizar en el sink. En `send_email()`, colapsar CR/LF del `subject` antes de asignarlo al MIME (`_sanitize_subject`):

```python
subject = " ".join(subject.splitlines()).strip()
```

Con esto cualquier builder futuro queda cubierto, no solo `build_quote_notification`. El body ya está protegido por el autoescape de Jinja.

---

## Fix 6 — Hardening de pedidos

**Archivos:** `backend/app/schemas/order.py`, `backend/app/api/routes/orders.py`

### 6a. Topes de tamaño
- `OrderItemCreate.quantity`: `ge=1, le=999`.
- `OrderCreate.items`: máximo 50 ítems.

### 6b. Validación y descuento de stock
En `create_order`:
1. Consolidar cantidades por `product_id` (dos ítems del mismo producto suman).
2. Por cada producto: `SELECT ... FOR UPDATE` (`with_for_update()`) para serializar pedidos concurrentes, validar `product.stock >= cantidad` → si no alcanza, 409 con detalle del producto y stock disponible.
3. Descontar `product.stock -= cantidad` dentro de la misma transacción (UoW existente: commit único al final del request).

### 6c. Devolución de stock al cancelar
- `cancel_my_order` (usuario, solo Pendiente): devuelve el stock de cada ítem cuyo producto siga existiendo (`with_for_update`, `stock += quantity`).
- `admin_update_order`: al transicionar **a** `CANCELADO` desde otro estado, devuelve stock. Transicionar **desde** `CANCELADO` a otro estado queda bloqueado con 409 ("no se puede reactivar un pedido cancelado") para evitar re-descuentos inconsistentes; el admin crea un pedido nuevo si hace falta.

### 6d. Auditoría
`audit.record()` en: `order.create` (usuario), `order.cancel` (usuario), `order.admin_update` (admin, detail con transición de estado).

### 6e. Rate limit
`_order_limiter = LoginRateLimiter(max_attempts=10, window_seconds=3600, lockout_seconds=1800)` keyed por `(ip, email del usuario)` en `create_order` — 10 pedidos/hora por usuario.
