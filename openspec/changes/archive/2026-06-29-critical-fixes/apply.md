# Apply: critical-fixes

## Archivos modificados

### Backend
- `app/core/security.py` — JWT con `iss`/`aud` (`crow-repuestos` / `crow-api`);
  tokens de refresh y reset también incluyen claims; decode pasa `audience=_AUD`
- `app/core/deps.py` — `jwt.decode` pasa `audience="crow-api"`
- `app/core/passwords.py` — validación de contraseña: mín 10 chars, upper,
  lower, digit, special character
- `app/core/config.py` — settings centralizados con pydantic-settings
- `app/api/routes/auth.py` — `import time` movido al nivel de módulo (estaba
  dentro de `reset_password()`); `_time.time()` → `time.time()`

### Frontend
- `frontend/src/app/styles/index.css` — keyframes `slideInRight` y `stockPulse`
- `frontend/src/shared/ui/Drawer.tsx` — animación `slideInRight`
- `frontend/src/entities/product/ProductCard.tsx` — badge de stock dinámico
  (Bajo pedido / Últimas N con punto pulsante / En stock)
- `frontend/src/shared/ui/DataTable.tsx` — zebra striping en filas
- `frontend/src/shared/ui/Avatar.tsx` — iniciales coloridas por nombre (`nameToColor`)
- `frontend/src/main.tsx` — imports `@fontsource/*`
- `frontend/index.html` — eliminados links a Google Fonts
- `frontend/package.json` — dependencias `@fontsource/dm-sans`, `@fontsource/fira-mono`,
  `@fontsource/unbounded`

## Desviaciones del plan

- Agregar `aud`/`iss` a JWT invalida tokens existentes — usuarios deben
  re-loguearse. Aceptable en dev/MVP.
