# Proposal: cloudinary-image-upload

## What

Reemplazar el campo "URL de imagen" (texto libre pegado a mano) del panel de
productos por una subida real de imágenes usando Cloudinary, del ítem de
roadmap "Upload de imágenes (actualmente solo URL string)" señalado en la
auditoría técnica.

## Why

Hoy `products.image_url` es un string que el admin llena pegando una URL
externa. Esto es fragil (links rotos, imágenes de dominios de terceros,
tamaños/formatos inconsistentes) y no es lo que un catálogo real necesita.
Cloudinary da CDN, transformación de imágenes y almacenamiento sin que
tengamos que administrar storage propio (S3, discos del contenedor, etc.),
lo cual es consistente con la escala actual del proyecto (MVP/Beta, sin
infraestructura de storage propia).

## Non-goals

- No se migra `image_url` a un tipo de dato distinto (sigue siendo un string
  con la URL resultante) — no rompe el schema ni las migraciones existentes.
- No se agrega upload de imágenes para `brands` (logo) en este change —
  queda para un change futuro si se necesita.
- No se usa el SDK oficial de `cloudinary` (paquete Python) — se firma el
  upload con `hashlib` de la stdlib para no agregar una dependencia nueva.

## Approach

Upload directo firmado (browser → Cloudinary), no proxy por nuestro backend:

1. El admin selecciona un archivo en el panel de productos.
2. El frontend pide una firma de subida de corta duración a
   `GET /api/uploads/cloudinary-signature` (admin only).
3. El frontend sube el archivo directo a la API REST de Cloudinary con esa
   firma.
4. Cloudinary devuelve `secure_url`, que se guarda como `image_url` del
   producto (como ya funciona hoy).

Ventajas de este enfoque sobre subir el archivo a nuestro backend y de ahí a
Cloudinary: los bytes de la imagen nunca pasan por nuestro servidor (menos
carga, no hay que tocar `client_max_body_size` de nginx), y el secreto de
Cloudinary (`CLOUDINARY_API_SECRET`) nunca se expone al navegador — solo se
expone una firma de un solo uso con expiración corta.

## Success criteria

- El admin puede subir un archivo de imagen desde el form de productos y ver
  el preview antes de guardar.
- El campo de URL manual se mantiene como fallback (por si quieren pegar una
  URL externa igual).
- `GET /api/uploads/cloudinary-signature` requiere rol ADMIN.
- Si `CLOUDINARY_*` no está configurado, el endpoint responde 503 con un
  mensaje claro (no rompe el arranque de la app — es una feature opcional).
- Ningún archivo binario pasa por el backend de FastAPI.
- No se agregan dependencias nuevas a `requirements.txt`.
