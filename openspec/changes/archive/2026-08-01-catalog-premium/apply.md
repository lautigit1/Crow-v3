# Apply: catálogo premium

## Resumen

El catálogo se veía básico por seis cosas chicas que se sumaban: dos botones en
cada tarjeta, ocho elementos peleando en 210px, el precio gritando en azul, un
tile de reemplazo de color distinto por producto, lienzo gris con tarjetas
blancas, e imágenes de 110px en una pantalla que vende objetos.

Ahora la tarjeta es **una imagen a sangre con un panel apoyado encima**, en un
lienzo casi blanco, con las acciones revelándose al pasar el mouse. La ficha de
producto y el panel de filtros se alinearon al mismo lenguaje.

**Sin backend.** Es un change de presentación entero.

## Archivos

**Nuevos:** `src/__tests__/ProductCard.test.tsx` (12).

**Modificados:** `entities/product/ProductCard.tsx` (reescrito),
`shared/ui/ProductImage.tsx`, `shared/ui/Modal.tsx`,
`pages/catalog/CatalogPage.tsx`, `pages/product/ProductDetailPage.tsx`,
`pages/account/FavoritesPage.tsx`, `widgets/featured-products/FeaturedProducts.tsx`,
`pages/legal/LicenciasPage.tsx`, `app/styles/index.css`.

## Decisiones

- **Imagen a sangre con panel** (elegida por Lauti sobre una ficha horizontal y
  una versión sin caja). Es la más arriesgada de las tres: sin foto es un panel
  blanco sobre un rectángulo vacío. Se asume porque el catálogo va a estar
  fotografiado.
- **La tarjeta mide siempre lo mismo.** El panel va posicionado y el nombre se
  corta en dos líneas: un nombre largo crece hacia adentro de la imagen en vez
  de estirar la tarjeta. Sin eso, una grilla a sangre queda dentada.
- **Todo lo que va sobre la imagen es una pastilla opaca.** Texto plano sobre
  una foto es legible hasta que aparece la primera foto de fondo claro, y eso no
  se controla desde el código.
- **Las acciones se revelan con `@media (hover: hover)`**, no con un breakpoint
  por ancho: en una pantalla táctil no hay hover y quedan visibles siempre. Un
  `useBreakpoint()` erraría en una tablet con mouse y en un teléfono apaisado,
  además de re-renderizar 24 tarjetas al mover el mouse.
- **Se ocultan con `opacity`, nunca desmontándolas**, y se muestran también con
  `group-focus-within`: un botón invisible pero enfocable es peor que no tenerlo.
- **Sin enlace estirado.** El truco de estirar un pseudo-elemento del nombre
  sobre toda la tarjeta tapaba el favorito y las píldoras. La imagen lleva su
  propio enlace (`aria-hidden`, fuera del tab) y el nombre el suyo.
- **El precio en Unbounded bold con el `$` chico y gris**, no en mono 400 —que
  se veía fino— ni en azul, que es el color del botón de comprar.
- **Un solo neutro para el tile sin foto.** El tono por hash del SKU parecía
  variedad con cuatro productos y era un mosaico aleatorio con la grilla llena.
- **Panel de compra en la ficha**: los cinco controles sueltos que envolvían
  distinto en cada ancho entraron en una caja, con las acciones secundarias
  separadas por una línea. Preguntar y comprar son intenciones distintas.
- **Ficha técnica bajo la imagen**: equilibra las dos columnas y muestra
  `vehicle_type`, que existía en el modelo y no aparecía en ningún lado.
- **"Solo en stock" es un interruptor**, no un checkbox en una caja con borde:
  es una preferencia que se enciende, no un campo que se completa.
- **El chip de filtro activo va en tinta llena**, no en azul suave: el azul de
  marca ya es el botón principal del sitio.

## Lo que se descubrió en el camino

**La tipografía base del sitio estaba rota, y es la causa de la mitad de este
change.** `body` pedía `font-family: "Inter"` e **Inter no se carga en ningún
lado** — las fuentes autohospedadas son DM Sans, Unbounded y Fira Mono. Todo lo
que no llevara una clase `font-body` explícita caía al `system-ui` del sistema
operativo: Segoe UI en Windows. Sumado a `-webkit-font-smoothing: antialiased`,
que hace exactamente una cosa —renderizar más fino que el default—, era el
motivo real de que Lauti viera "letras finitas" pantalla tras pantalla mientras
yo parcheaba componentes de a uno. Peso base a 500.

Ya existía un comentario en `shared/ui/Card.tsx` señalando ese mismo error y
llamándolo "el único lugar del sitio que no usaba las fuentes de la marca". No
era el único: el `body` lo tenía igual y desde ahí se derramaba a todo. Un
comentario que dice "el único" merece que alguien lo verifique.

**La mono se estaba usando sobre palabras** — etiquetas del panel de filtros,
breadcrumbs, valores de la ficha técnica. Ayuda a leer un código carácter por
carácter y estorba en una palabra. Quedó reservada para SKU.

**"Ver ficha" no era un enlace.** Consecuencia directa de sacar el enlace
estirado: se veía como botón y no hacía nada. Arreglar un problema abrió otro.
Lo encontró Lauti, no los tests; ahora hay uno.

**"Consultar" aparecía dos veces en la misma tarjeta** con dos significados —el
precio ausente y el botón de WhatsApp—. Lo encontró un test que falló por
ambigüedad. El test tenía razón: se cambió la interfaz, no el test.

**`FeaturedProducts` tenía `grid-cols-4` fijo**, sin ningún punto de quiebre:
tarjetas de ~180px en tablet.

**Dos botones con el nombre accesible "Cerrar"** en `shared/ui/Modal.tsx` (la X
del encabezado y el del pie). Indistinguibles para un lector de pantalla. La X
pasó a "Cerrar ventana".

**La página de licencias atribuía Archivo, Inter e IBM Plex Mono**, ninguna de
las cuales el sitio usa ni distribuye.

## Verificación

- **Frontend:** `typecheck`, `eslint` y `steiger` limpios, **171** de vitest.
- **E2E:** 25 specs en verde contra el stack completo.

## Pendiente

- ⏳ **Mirarlo a 1440, 1024 y 390px.** Es un change visual y ningún test dice si
  quedó lindo. El mobile es donde menos ojos tuvo.
- ⚠ **Las fotos.** Esta anatomía descansa en ellas: hasta que estén cargadas, la
  grilla muestra paneles blancos sobre rectángulos vacíos y puede verse peor que
  la versión anterior. Sigue siendo lo que más va a mover la aguja.
- **Los dos `<select>` del panel de filtros** quedaron con el estilo compartido
  de `shared/ui/Field.tsx`. Rehacerlos como dropdowns propios toca medio panel
  de admin: es un change aparte.
- **La mono en la tarjeta.** Todavía aparece en la línea "BOSCH · FILTROS" del
  catálogo. Si el criterio es reservarla solo para SKU, falta esa pasada.
