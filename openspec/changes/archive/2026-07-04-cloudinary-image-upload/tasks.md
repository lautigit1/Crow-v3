# Tasks: cloudinary-image-upload

## Implementation tasks

- [x] **T1** — Agregar `CLOUDINARY_*` settings y `cloudinary_configured` a `backend/app/core/config.py`
- [x] **T2** — Crear `backend/app/core/cloudinary_sign.py` (firma SHA-1 sin dependencias nuevas)
- [x] **T3** — Crear `backend/app/api/routes/uploads.py` con `GET /cloudinary-signature` (admin only, 503 si no está configurado)
- [x] **T4** — Registrar router en `backend/app/api/__init__.py`
- [x] **T5** — Agregar variables a `backend/.env.example` (y `.env` local)
- [x] **T6** — Tests: `backend/tests/test_uploads.py` (auth, admin, 503, firma correcta)
- [x] **T7** — Crear `frontend/src/entities/upload/api.ts` (`uploadApi.uploadProductImage`)
- [x] **T8** — Actualizar `AdminProductsPage.tsx`: file picker + preview + fallback URL manual
- [x] **T9** — Verificar sintaxis/consistencia de todos los archivos tocados (ver nota en apply.md sobre limitaciones del sandbox para correr `pytest`/`tsc`)
