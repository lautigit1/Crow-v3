# Proposal: catálogo premium

## Por qué

El catálogo es la pantalla donde alguien decide si este negocio le parece serio.
Hoy se ve básico, y no por una cosa: por seis chicas que se suman.

- **Dos botones en cada tarjeta.** "Cotizar" y "Consultar" repetidos 24 veces por
  pantalla. Ningún catálogo que quiera verse bien pone dos llamados a la acción
  en cada tile: la tarjeta es una superficie que se toca, y la acción vive donde
  la persona ya decidió que le interesa.
- **Ocho elementos peleando en 210px** — chip de categoría, SKU, nombre, marca,
  precio, badge de stock, favorito y los dos botones.
- **El precio grita.** Unbounded 900, 20px, azul de marca. Es el elemento más
  fuerte de la pantalla, repetido en cada tarjeta. Cuando todo grita, nada se
  escucha.
- **El fondo del tile sin foto es un color distinto por producto.**
  `ProductImage` deriva el tono del SKU, así que la grilla queda como un mosaico
  aleatorio. Se lee como relleno, no como decisión.
- **El lienzo es gris y las tarjetas blancas**, que es la combinación que hace
  que una grilla parezca una planilla.
- **Las imágenes miden 110px de alto** en tarjetas de 210px. En una pantalla que
  vende objetos físicos, la foto es lo más chico.

## Qué se hace

Rediseño de `ProductCard` y de la grilla, **en claro** (decisión de Lauti: el
claro es más llamativo y no rompe con el resto del sitio).

- Un solo destino por tarjeta: la ficha. Favorito y WhatsApp aparecen sobre la
  imagen al pasar el mouse.
- Precio en mono, en tinta, tamaño normal.
- Stock como punto de color + el número real, en vez de un pill de texto.
- Marca y categoría en una sola línea en mono.
- Un neutro frío único para el tile sin foto.
- Lienzo casi blanco, tarjetas blancas, separación por aire.
- Imagen de 110 → 168px; tarjetas de 210 → 260px.

## Qué NO se hace

- **No se toca el backend.** Es un change de presentación entero.
- **No se toca la ficha de producto** más allá de lo que herede de
  `ProductImage`. Es otra pantalla y otro change.
- **No se agregan fotos.** Sigue pendiente y es lo que más va a mover la aguja:
  este rediseño prepara el terreno para que las fotos se vean bien, no las
  reemplaza.

## Riesgo conocido

**El claro es menos indulgente que el oscuro.** El fondo oscuro disimula los
huecos; el claro los muestra. Mientras la mayoría de los productos no tenga
foto, la grilla puede verse vacía antes que premium. Se mitiga con un tile de
reemplazo deliberado —ícono muy tenue y la etiqueta "SIN IMAGEN" en mono— pero
no se resuelve del todo hasta que las fotos estén cargadas.
