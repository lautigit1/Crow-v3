# Apply: trusted-proxy

## Archivos creados

- `app/core/middleware.py` — `TrustedProxyMiddleware`

## Archivos modificados

- `app/core/config.py` — `TRUSTED_PROXIES: str = ""` + `trusted_proxy_set` property
- `app/main.py` — `app.add_middleware(TrustedProxyMiddleware)`
- `backend/.env` — `TRUSTED_PROXIES=` (vacío en dev)
- `backend/.env.example` — documentado con ejemplo

## Comportamiento implementado

Si `TRUSTED_PROXIES` está vacío, el middleware es no-op — `X-Forwarded-For`
se ignora y `request.client.host` se usa directamente.

Si hay IPs configuradas, el middleware solo sobreescribe el IP del cliente si
el request viene de una de esas IPs (reverse proxy confiable).

## Desviaciones del plan

Ninguna.
