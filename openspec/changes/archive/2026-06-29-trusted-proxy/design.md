# Design: trusted-proxy

## Settings (`backend/app/core/config.py`)

Agregar:

```python
# ── Security / Proxy ──────────────────────────────────────────────────────────
TRUSTED_PROXIES: str = ""
# Comma-separated IPs of trusted reverse proxies (e.g. nginx container).
# Example: "172.18.0.1,10.0.0.1"
# Leave empty in local dev — X-Forwarded-For is ignored when list is empty.

@property
def trusted_proxy_set(self) -> frozenset[str]:
    return frozenset(ip.strip() for ip in self.TRUSTED_PROXIES.split(",") if ip.strip())
```

## `client_ip()` (`backend/app/core/audit.py`)

```python
def client_ip(request: Request) -> str | None:
    """
    Returns the real client IP.

    Only trusts X-Forwarded-For when the direct peer (request.client.host)
    is in settings.TRUSTED_PROXIES — prevents IP spoofing via forged headers.
    """
    peer = request.client.host if request.client else None
    if peer and peer in settings.trusted_proxy_set:
        fwd = request.headers.get("x-forwarded-for")
        if fwd:
            return fwd.split(",")[0].strip()
    return peer
```

## `.env.example`

Agregar:

```
TRUSTED_PROXIES=          # IPs de los proxies reversos (nginx). Vacío en dev local.
```

## `docker-compose.yml` (root)

Documentar la variable en la sección de environment del servicio backend (comentario).
No se asigna un valor por defecto — debe configurarse en producción según la IP
del container nginx en la red Docker.

## Cómo obtener la IP del container nginx en Docker

```bash
docker inspect crow-nginx | grep -i ipaddress
# → "IPAddress": "172.18.0.3"
# → TRUSTED_PROXIES=172.18.0.3
```

## No hay cambios de schema ni de API.
