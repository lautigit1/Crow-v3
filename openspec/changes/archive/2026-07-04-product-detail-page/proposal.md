# Proposal: product-detail-page

## What

Agregar una página pública dedicada a cada producto (`/producto/:id`),
minimalista y moderna, además de las tarjetas del catálogo. Se completa con
un producto de prueba sembrado automáticamente (seed idempotente) para poder
ver la funcionalidad de punta a punta sin cargar datos a mano.

## Why

Hoy el catálogo (`/catalogo`) solo muestra tarjetas en grilla — no existe
ninguna URL individual por producto. Esto limita:
- Compartir un producto puntual (link directo, WhatsApp, redes).
- SEO por producto (cada producto podría indexarse individualmente).
- Mostrar más información (descripción completa, tipo de vehículo, stock
  detallado) sin saturar la tarjeta del catálogo.

## Non-goals

- No se agrega un slug amigable (`/producto/filtro-de-aceite-bosch`) — se
  usa el `id` numérico, como ya hace `productApi.get(id)`. Un slug queda
  para un change futuro si se necesita mejor SEO.
- No se agregan productos relacionados/recomendados en esta página (podría
  ser un change futuro).
- No se toca el backend — `GET /api/products/{id}` ya es público y ya trae
  category/brand/supplier con eager loading.

## Success criteria

- Cada producto tiene una URL propia: `/producto/:id`.
- Se puede llegar a esa URL haciendo click en la imagen o el nombre de
  cualquier tarjeta del catálogo (los botones de "Cotizar"/"Consultar"/favorito
  siguen funcionando igual, sin navegar).
- La página muestra: imagen grande, categoría, SKU, nombre, marca, precio,
  badge de stock, tipo de vehículo, descripción completa, y las mismas
  acciones de Cotizar/WhatsApp/Favorito que la tarjeta.
- Si el `id` no existe (o fue borrado), se muestra un estado vacío claro con
  link de vuelta al catálogo (no un crash ni pantalla en blanco).
- Diseño minimalista: mucho espacio en blanco, tipografía grande para el
  nombre, sin elementos decorativos de más — reutiliza los tokens de diseño
  ya existentes (`color`, `font`, `radius`, `shadow`).
- Hay al menos un producto de prueba visible apenas se levanta el proyecto
  (seed idempotente — no pisa datos si ya hay productos cargados).
