# Tasks: navbar-redesign

- [x] **N1** — `shared/ui/Icon.tsx`: íconos `home` y `more` agregados
      (dock mobile).
- [x] **N2** — `features/auth/AccountMenu.tsx`: `TriggerButton`
      reestilizado sin borde/fondo propio, para encajar en la cápsula
      clara de la navbar sin efecto "caja dentro de caja". Único
      consumidor de `AccountMenu` en el repo (confirmado por grep) — sin
      riesgo de romper otro lugar.
- [x] **N3** — `shared/lib/useIsOpenNow.ts` (nuevo): hook de horario
      abierto/cerrado, hora local del navegador, sin librería de
      timezones (negocio de un solo local en Mendoza).
- [x] **N4** — `widgets/navbar/Navbar.tsx` reescrito completo:
      - Barra desktop oscura (`bg-ink900`), tres islas asimétricas
        (marca+estado / nav rail con subrayado deslizante / cápsula
        clara de acciones).
      - `SearchPalette`: overlay command-palette, atajo "/", navega a
        `/catalogo?q=`/`?cat=` (mismo patrón que `CategoryGrid`).
      - `ActionCapsule`: buscar / WhatsApp (`waLink()`) / carrito con
        badge / `AccountMenu`.
      - Mobile: barra superior mínima (logo + estado, sin botones) +
        `MobileDock` (Inicio/Catálogo/Buscar elevado/Carrito/Menú) +
        `MoreSheet` (Marcas, Contacto, cuenta).
      - Barra de progreso de scroll sutil en el borde inferior (sustituye
        la línea de acento fija que aparecía solo al pasar el umbral de
        scroll en la versión vieja).
      - `focus-visible` en todos los elementos interactivos nuevos.
- [x] **N5** — Verificación de archivos: releídos con la herramienta de
      lectura (no `bash`) `Icon.tsx`, `AccountMenu.tsx`, `useIsOpenNow.ts`
      y `Navbar.tsx` completo tras escribirlos. Encontrados y corregidos
      en la propia relectura: import sin usar (`ReactKeyboardEvent`),
      import sin usar (`contact`, solo se usa `waLink`), variable sin usar
      (`count` duplicado en `ActionCapsule`, el carrito vive en
      `CartButton`) y una variante `xs:` que no existe en
      `tailwind.config.js` (no hay breakpoint `xs` configurado) — todos
      hubieran roto `noUnusedLocals`/generado una clase inválida.
- [x] **N6** — Primera captura de escritorio del usuario: "me re gusta"
      (confirma la dirección general).
- [x] **N7** — Mismo mensaje, feedback puntual: "el marca, catalogo,
      contacto y hablanos estan como muy por todos lados, y la parte
      blanca de la derecha no me gusta". Diagnóstico: la barra tenía 3
      "islas" con su propio borde/fondo (logo+estado / nav rail / cápsula
      blanca de acciones) pegadas unas a otras con un hueco grande en el
      medio — se leía como piezas sueltas ensambladas, no como una sola
      superficie. Además el `AccountMenu` invitado (Iniciar sesión +
      Crear cuenta) quedaba anidado *dentro* de la cápsula blanca,
      estirándola hasta el borde derecho — de ahí el bloque blanco grande
      de la captura. Fix:
      - Se sacan los `border`/`bg` de `StatusChip` y `NavRail`: quedan
        flotando directo sobre `ink900`, sin caja propia.
      - La cápsula blanca (`ActionCapsule`) se reemplaza por `ActionRow`:
        buscar/WhatsApp/carrito/cuenta viven directo sobre la barra
        oscura, cada uno con su propio hover sutil
        (`hover:bg-[rgba(255,255,255,.08)]`), sin material claro de por
        medio.
      - `AccountMenu.tsx`: `TriggerButton` y el estado invitado
        recoloreados para vivir directo sobre oscuro (antes asumían la
        cápsula blanca detrás — texto oscuro que hubiera quedado
        invisible sobre `ink900`): texto claro en reposo, acento celeste
        `#7FB0FF` al abrir (mismo tono que ya usa el resto del sitio
        sobre fondo oscuro).
      - Badge del carrito: `border-white` → `border-ink900` (el aro
        blanco de "recorte" estaba pensado contra la cápsula blanca, no
        contra `ink900`).
- [x] **N8** — El usuario corrigió el diagnóstico de N7: "me gustaban las
      capsulas, pero te dije otra cosa tambien" / "nono, solo las
      capsulas, la parte blanca no, dejala como esta". El punto en N7 no
      era que las cápsulas en sí molestaran (le gustaban, sacarlas fue
      sobre-corregir), sino específicamente el bloque blanco de la
      derecha (cuenta invitada estirando la cápsula de acciones). Fix
      acotado:
      - `NavRail` recupera su cápsula (`border`/`bg`/`rounded-full`) —
        vuelve a como estaba antes de N7.
      - `ActionRow`/`AccountMenu` **no** vuelven a la cápsula blanca —
        quedan como en N7 (accesos sueltos sobre `ink900`), que es la
        parte que el usuario pidió explícitamente dejar así.
- [x] **N9** — Confirmación visual + dos hallazgos sobre esa versión:
      1. "el boton de busqueda quedo blanco" — bug real: Preflight está
         apagado (`tailwind.config.js`), así que un `<button>` sin fondo
         explícito muestra el fondo por defecto del navegador en vez de
         quedar transparente. El botón de buscar de `ActionRow` y el
         botón "Menú" de `MobileDock` no tenían `bg-transparent`
         explícito (la navbar vieja sí lo hacía en sus botones a mano —
         se pasó por alto al escribir los nuevos). Corregido en ambos.
      2. "las partes inicio, marcas, catalogo y contacto, y el mismo
         hablanos estan por todos lados, pense en simplificar un poco" —
         reafirma el punto de N7 que había quedado a medio resolver:
         "Hablanos" seguía viviendo lejos de los 4 links de navegación
         (en el grupo de acciones de la derecha), separados por todo el
         ancho de la barra. Fix: `NavRail` pasa a `NavCluster` — une los
         4 links + "Hablanos" en una sola cápsula (con un separador
         vertical fino adentro), ya que "Hablanos" es la acción de
         contacto más usada y conceptualmente pertenece junto a
         navegación, no junto a carrito/cuenta. `ActionRow` queda con
         solo buscar/carrito/cuenta.
- [x] **N10** — Vista completa (navbar + Hero) del usuario: "no pensas que
      el hablanos y el escribir por wpp, estan redundantes, el boton
      catalogo en la navbar, el ver catalogo en el hero, marcas y contacto
      lo dejaria". Dos pares redundantes reales, mismo tipo de problema
      detectado y documentado en `2026-07-07-landing-visual-refresh` para
      el resto de la home (repetición de mensajes entre secciones
      vecinas):
      1. Navbar "Hablanos" vs. Hero "Escribir por WhatsApp" — misma acción,
         visible dos veces a centímetros. `Hablanos` se saca de
         `NavCluster` (vuelve a ser solo los 4 links; ver N9 antes de
         revertir). El Hero, visible únicamente en Home, ya cubre el CTA
         de WhatsApp con más peso visual; en el resto del sitio,
         `MoreSheet` (mobile) y los flujos de contacto/cotización siguen
         ofreciendo WhatsApp donde corresponde.
      2. Navbar "Catálogo" vs. Hero "Ver catálogo" — el usuario agrupó
         estos dos pero pidió dejar "Marcas" y "Contacto" tal cual. Como
         la navbar es sitewide (aparece en todas las páginas) y el Hero
         es exclusivo de Home, se resuelve sacando el link redundante del
         Hero (`MotionLink to="/catalogo"` + su ícono de flecha), no el
         de la navbar -- sacar "Catálogo" de la navbar rompería la
         navegación principal en el resto del sitio. `frontend/src/widgets/hero/Hero.tsx`:
         se saca el bloque completo de "Ver catálogo" (subrayado + flecha
         animados) debajo de los 2 CTAs; quedan solo "Escribir por
         WhatsApp" y "Pedir cotización". Import `Link` de
         `react-router-dom` y el `MotionLink = motion(Link)` locales
         quedaban sin uso tras sacar el bloque — eliminados.
- [ ] **N11** — Confirmación visual del usuario sobre esta versión (sin
      redundancia Hablanos/WhatsApp ni Catálogo/Ver catálogo).
