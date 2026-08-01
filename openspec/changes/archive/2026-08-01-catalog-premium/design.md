# Design: catálogo premium

## 0. La anatomía: imagen a sangre con panel

Se evaluaron tres estructuras y Lauti eligió la más arriesgada: **la foto ocupa
la tarjeta entera y los datos van en un panel apoyado encima**, en vez de una
tarjeta partida en imagen arriba y texto abajo.

**El riesgo está anotado y es real**: sin foto, es un panel blanco sobre un
rectángulo vacío. Se asume porque el catálogo va a estar fotografiado, pero hoy
no lo está. Tres decisiones lo hacen tolerable mientras tanto:

- **La tarjeta mide siempre lo mismo.** El panel va posicionado, así que un
  nombre de tres líneas crece hacia adentro de la imagen en vez de estirar la
  tarjeta. Sin eso una grilla a sangre queda dentada.
- **El nombre se corta en dos líneas** (`line-clamp-2`). Misma razón, y además
  un nombre de cuatro líneas se come la foto.
- **Todo lo que va sobre la imagen es una pastilla opaca**, no texto suelto.
  Texto plano sobre una foto es legible hasta que aparece la primera foto de
  fondo claro, y eso no se controla desde el código.

**Y no se usa el truco del enlace estirado.** La versión anterior de la tarjeta
estiraba un pseudo-elemento del nombre sobre toda la superficie para poder
clickear en cualquier punto; acá eso taparía el favorito y las dos píldoras, y
obligaría a una escalera de `z-index` para desarmarlo. La imagen va envuelta en
su propio enlace (`aria-hidden`, fuera del orden de tabulación, para no
duplicar el destino en el lector de pantalla) y el nombre conserva el suyo.

## 0.b El precio

`Fira Mono 400` a 19px era un peso de texto corrido, no de cifra protagonista:
se veía fino. Ahora el símbolo y la cifra van separados —`$` más chico y gris,
número en Unbounded bold— para que el ojo caiga en el número.

**Unbounded vuelve, pero solo acá.** Se lo había sacado de la tarjeta por
cansar repetido; un precio es UN número por tarjeta, no una tipografía aplicada
a cada línea de texto. La alineación de la columna se pierde —era el argumento
de la mono— y es un precio aceptable a cambio del peso.

## 1. Las acciones se esconden, pero no de cualquier forma

Favorito y WhatsApp pasan a ser dos píldoras sobre la imagen, visibles al hacer
hover sobre la tarjeta. El problema obvio: **en un teléfono no hay hover.**

La salida no es un `useBreakpoint()` en JS —eso obliga a re-renderizar y a
elegir un ancho arbitrario— sino la media query que pregunta exactamente lo que
importa:

```
opacity-100                                  → por defecto visibles
[@media(hover:hover)]:opacity-0              → en dispositivos CON hover, ocultas
[@media(hover:hover)]:group-hover:opacity-100
group-focus-within:opacity-100               → y al tabular
```

`hover: hover` es verdadero en un mouse y falso en una pantalla táctil, sin
importar el ancho. Una tablet con teclado y mouse queda del lado correcto; un
teléfono en horizontal también.

**`group-focus-within` no es un extra.** Sin él, los dos botones existen en el
orden de tabulación pero son invisibles: alguien que navega con teclado enfoca
un control que no puede ver. Es peor que no tenerlos.

**Y las píldoras siguen en el DOM siempre**, con `opacity`, no con `hidden` ni
desmontadas. Un botón desmontado no se puede enfocar ni encontrar, y hay un E2E
—`favorites.spec.ts`— que quita un favorito desde la tarjeta de
`/cuenta/favoritos`.

## 2. Lo que NO puede cambiar (radio de explosión)

Tres tests dependen de detalles de la tarjeta actual:

| Qué | Dónde | Consecuencia |
|---|---|---|
| El nombre es un `<h3>` clickeable | `shopping-flow.spec.ts` ×3, `favorites.spec.ts` | `getByRole("heading", { name })` es como se entra a la ficha en 4 specs |
| El botón dice "Quitar de favoritos" / "Agregar a favoritos" | `favorites.spec.ts` | Se usa por nombre accesible en la card |
| `onQuote` llega con referencia estable | `CatalogPage`, `FavoritesPage` | `ProductCard` está en `React.memo`; sin `useCallback` el memo no sirve de nada |

El `<h3>` y las etiquetas de favorito **se conservan tal cual**. No por los
tests: son las decisiones correctas de todos modos, y los tests son la señal.

## 3. Jerarquía tipográfica

El problema actual es que hay tres cosas compitiendo por ser lo primero que se
lee: el chip azul de categoría, el nombre en Unbounded bold, y el precio en
Unbounded black azul.

Orden nuevo, de más fuerte a más débil:

| Elemento | Antes | Ahora |
|---|---|---|
| Nombre | Unbounded 700, 15px | DM Sans 500, 15px |
| Precio | Unbounded 900, 20px, azul | Fira Mono 400, 19px, `ink900` |
| Marca · categoría | Chip azul + línea aparte | Una línea, Fira Mono 11px, `textFaint` |
| SKU | Junto al chip | Sobre la imagen, arriba a la izquierda |
| Stock | Pill de texto con color | Punto + número real |

**El precio en mono no es decorativo.** Una grilla de precios en tipografía
proporcional no alinea las cifras; en monoespaciada, `$45.000` y `$8.500` tienen
los dígitos en la misma grilla vertical y la columna se lee de un vistazo. Es
para lo que sirve una mono.

**Unbounded sale de la tarjeta.** Es una display de peso alto: funciona en un
título por pantalla y cansa repetida 24 veces. Queda en el encabezado.

**El stock dice el número.** "En stock" y "Últimas 2" son dos etiquetas para el
mismo dato; un `12` verde y un `2` naranja dicen lo mismo con más precisión y
menos tinta.

## 4. El neutro único del tile sin foto

`ProductImage` calcula un tono por hash del SKU. Con pocos productos parece
variedad; con una grilla llena es un mosaico aleatorio, y lo aleatorio se lee
como accidental.

Pasa a un solo neutro frío (`#F4F7FB`) con el ícono de categoría muy tenue.

**Corrección sobre lo que dije al proponerlo.** Argumenté que el mismo neutro
iba a ser "el fondo de estudio" de las fotos reales, y eso pedía `object-contain`
para que el neutro se viera alrededor de la foto. Es peor: las fotos de repuestos
suelen venir con fondo blanco, y sobre un tile celeste se ve un rectángulo blanco
mal recortado — exactamente el problema por el que descarté el catálogo oscuro.

Las fotos reales siguen con `object-cover`, llenando el tile: no se ve fondo, así
que no hay desajuste posible. **La uniformidad tiene que venir de cómo se sacan
las fotos, no de un truco de CSS.** El neutro queda solo para el tile de
reemplazo, que es donde de verdad hacía falta.

## 5. Lienzo casi blanco, tarjetas blancas

Hoy: lienzo `surface` (#F8FAFC) + tarjetas blancas con borde. La diferencia
entre los dos grises es tan chica que lo único que separa una tarjeta de otra es
el borde — y una grilla definida por bordes se lee como una planilla.

Ahora: lienzo #FCFDFE, tarjetas blancas, borde hairline #E7EDF4 y **20px de
gap** en vez de 14. La separación la hace el aire.

## 6. Qué se descarta

- **Hover con `useState`.** Ya se sacó de esta card una vez por re-renderizar 24
  componentes al mover el mouse. Todo por CSS.
- **Ocultar las píldoras con `hidden`/desmontaje.** Ver §1.
- **Quitar el favorito de la tarjeta.** Es la forma de sacarlo desde
  `/cuenta/favoritos`; sin él esa pantalla pierde su única acción.
- **Cambiar el orden o el contenido de los datos.** Se muestra exactamente lo
  mismo que hoy, con otro peso. Un rediseño que además esconde datos mezcla dos
  discusiones.
