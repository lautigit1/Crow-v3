# Apply: cloudinary-image-upload

## Archivos modificados/creados

### Backend
- `backend/app/core/config.py` — settings `CLOUDINARY_CLOUD_NAME`,
  `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` (default `""`) y property
  `cloudinary_configured`.
- `backend/app/core/cloudinary_sign.py` (nuevo) — `build_signature()` y
  `new_signed_upload()`, firma SHA-1 pura stdlib (sin SDK de Cloudinary).
- `backend/app/api/routes/uploads.py` (nuevo) — `GET
  /api/uploads/cloudinary-signature`, admin only, 503 si no está configurado.
- `backend/app/api/__init__.py` — registrado el router de `uploads`.
- `backend/.env.example` y `backend/.env` — variables `CLOUDINARY_*` (vacías
  por default, feature opcional).
- `backend/tests/test_uploads.py` (nuevo) — 401/403, 503 sin configurar, y
  firma correcta con credenciales dummy (sin llamar a la API real de
  Cloudinary).

### Frontend
- `frontend/src/entities/upload/api.ts` (nuevo) — `uploadApi.uploadProductImage(file)`:
  pide la firma a nuestro backend, sube directo a la API REST de Cloudinary,
  devuelve `secure_url`.
- `frontend/src/pages/admin/AdminProductsPage.tsx` — Fila 5 del form
  reemplazada: preview (56x56 con `ProductImage`, componente ya existente) +
  input de URL manual (se mantiene como fallback) + botón "Subir imagen"
  (dispara un `<input type="file" hidden>`, valida 5MB client-side antes de
  llamar a Cloudinary).

## Verificación

- Se leyó el contenido completo de cada archivo modificado/creado para
  confirmar sintaxis y consistencia con los patrones existentes (estilo de
  routers admin-only, convención de `entities/*/api.ts`, variantes válidas
  de `Button`, etc.).
- **No se pudo correr `pytest` ni `tsc --noEmit`** en este sandbox: el
  entorno virtual de Python creado por el usuario es de Windows (`.venv/Scripts/*.exe`,
  no ejecutable en este Linux), y `frontend/node_modules` no está instalado
  en este mount. Se recomienda correr ambos localmente antes de mergear:
  - `cd backend && pytest tests/test_uploads.py -v`
  - `cd frontend && npm run typecheck`

## Cómo habilitar la feature

La subida de imágenes queda deshabilitada hasta que se configuren las
credenciales reales de Cloudinary. Pasos para el usuario:

1. Crear una cuenta gratis en https://cloudinary.com/users/register/free
2. Copiar `Cloud name`, `API Key` y `API Secret` del dashboard
   (console.cloudinary.com)
3. Completar en `backend/.env`:
   ```
   CLOUDINARY_CLOUD_NAME=tu-cloud-name
   CLOUDINARY_API_KEY=tu-api-key
   CLOUDINARY_API_SECRET=tu-api-secret
   ```
4. Reiniciar el backend. El botón "Subir imagen" en el panel de productos
   ya sube directo a Cloudinary.

Sin esas variables configuradas, el endpoint responde 503 y el admin puede
seguir usando el campo de URL manual como siempre.

## Desviaciones del plan

- Ninguna. Se implementó tal como estaba diseñado en `design.md`.
