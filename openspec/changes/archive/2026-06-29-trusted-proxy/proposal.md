# Proposal: trusted-proxy

## What

Arreglar `client_ip()` en `backend/app/core/audit.py` para que el header
`X-Forwarded-For` solo se confíe cuando el request llega desde un proxy conocido
(nginx, load balancer). Agregar `TRUSTED_PROXIES` a settings.

## Why

El bug actual:

```python
# audit.py — vulnerable
def client_ip(request: Request) -> str | None:
    fwd = request.headers.get("x-forwarded-for")
    if fwd:
        return fwd.split(",")[0].strip()   # ← confía en cualquier header
    return request.client.host if request.client else None
```

Cualquier atacante puede enviar:
```
GET /api/quotes HTTP/1.1
X-Forwarded-For: 1.2.3.4
```

Y el rate limiter lo verá como IP `1.2.3.4`. Si manda 5 requests con IPs diferentes,
bypasea el límite de cotizaciones. Lo mismo aplica para login, registro y password reset.

## Success criteria

- `client_ip()` solo usa `X-Forwarded-For` cuando `request.client.host` está en
  la lista `TRUSTED_PROXIES`.
- Si no hay proxies configurados (dev local), usa directamente `request.client.host`.
- La setting `TRUSTED_PROXIES` acepta una lista separada por comas.
- El `.env.example` documenta la variable.
- Sin cambios a la API pública ni al schema de la DB.
