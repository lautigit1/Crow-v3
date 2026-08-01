# Tasks: catálogo premium

Cuatro fases. La 1 es la que se ve; la 3 es la que rompe cosas si no se mira.

---

## Fase 1 — La tarjeta

- [x] **1.1** `ProductCard` rehecha como **imagen a sangre con panel** (§0), no
      como la tarjeta partida del plan original.
- [x] **1.2** Conservados el `<h3>` clickeable y las etiquetas de favorito.
- [x] **1.3** `ProductImage`: un solo neutro en vez del tono por hash del SKU.
      El SKU salió del tile — la card lo dibuja para los dos estados.
- [x] **1.4** `compact` (carrito, checkout, admin) verificado: pasa a mostrar el
      ícono sobre el neutro, sin la etiqueta "SIN IMAGEN".

## Fase 2 — La grilla

- [x] **2.1** Lienzo `#FCFDFE` y `gap` de 20px.
- [x] **2.2** Columnas de 258px mínimo en vez de 210.
- [x] **2.3** `SkeletonCard` reescrito dos veces: espeja la anatomía final
      (imagen 0.95 + panel flotante), no la del plan.

## Fase 3 — Las otras pantallas

- [x] **3.1** `FavoritesPage` alineada al mismo mínimo y gap.
- [x] **3.2** `FeaturedProducts`: **tenía `grid-cols-4` fijo**, que dejaba
      tarjetas de ~180px en tablet sin ningún punto de quiebre. Pasó a
      `auto-fill` con el mismo mínimo que el catálogo.
- [x] **3.3** Barridos los consumidores de `ProductImage`.

## Fase 4 — Verificación

- [x] **4.1** Tests de `ProductCard`: **12**. Incluyen que "Ver ficha" sea un
      enlace de verdad y que "Consultar" no aparezca dos veces.
- [x] **4.2** `npm run e2e` completo en verde.
- [x] **4.3** `typecheck`, `eslint`, `steiger`, vitest **171**.
- [ ] **4.4** ⏳ Mirarlo a 1440, 1024 y 390px. Ningún test dice si quedó lindo,
      y el mobile es donde menos ojos tuvo.

## Lo que apareció después del plan

**La tipografía base del sitio estaba rota.** `body` pedía `font-family: "Inter"`
y **Inter no se carga en ningún lado**: las fuentes autohospedadas son DM Sans,
Unbounded y Fira Mono. Todo lo que no llevara una clase `font-body` explícita
caía al `system-ui` del sistema operativo. Sumado a
`-webkit-font-smoothing: antialiased` —que hace exactamente una cosa, renderizar
más fino— era la causa de que Lauti viera "letras finitas" pantalla tras
pantalla mientras yo parcheaba componentes de a uno. Corregido en el `body`, con
el peso base en 500.

Ya había un comentario en `shared/ui/Card.tsx` diciendo que ese componente era
"el único lugar del sitio que no usaba las fuentes de la marca". No era el
único: el `body` tenía el mismo error y desde ahí se derramaba a todo.

**La mono se estaba usando sobre palabras.** Etiquetas de sección del panel de
filtros, breadcrumbs, valores de la ficha técnica. Una monoespaciada ayuda a
leer un código carácter por carácter y estorba en una palabra. Quedó reservada
para SKU.

**"Ver ficha" no era un enlace.** Al sacar el truco del enlace estirado —que
hacía clickeable toda la tarjeta y tapaba el favorito— ese texto quedó como un
`<span>`: se veía como botón y no llevaba a ningún lado. Lo encontró Lauti, no
los tests. Ahora hay uno.

**"Consultar" aparecía dos veces en la misma tarjeta**, como precio ausente y
como botón de WhatsApp. Lo encontró un test que fallaba por ambigüedad; el
precio pasó a "A consultar".

**La página de licencias atribuía tres fuentes equivocadas** (Archivo, Inter,
IBM Plex Mono), ninguna de las cuales el sitio usa ni distribuye.

---

## Decisiones tomadas

| # | Decisión | Dónde |
|---|---|---|
| D1 | Claro, no oscuro | Lauti |
| D2 | Un solo destino por tarjeta: la ficha | proposal |
| D3 | Acciones al hover vía `@media (hover: hover)`, no `useBreakpoint` | design §1 |
| D4 | Las píldoras siguen en el DOM, ocultas con `opacity` | design §1 |
| D5 | Precio en mono para que la columna alinee | design §3 |
| D6 | Unbounded sale de la tarjeta | design §3 |
| D7 | Un neutro único, también detrás de las fotos reales | design §4 |
| D8 | Separación por aire, no por bordes | design §5 |

## Abierto

- **¿La ficha de producto acompaña?** Queda con el estilo viejo. No es urgente
  —es una pantalla, no una grilla— pero el contraste se va a notar.
- **¿Cuántas columnas en 1440px?** Con 260px de mínimo entran 4 en el ancho útil
  del catálogo. Si se quiere 3 más grandes, es cambiar un número.
