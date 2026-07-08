# Tasks: landing-visual-refresh

## Fase 0 — Setup

- [x] **T1** — `framer-motion` y `lenis` agregados a `package.json`
      (`dependencies`). No instalados en este sandbox: registry de npm
      bloqueada (`403 Forbidden`, confirmado con `npm install` y
      `curl -I https://registry.npmjs.org/framer-motion`). Usuario debe
      correr `npm install` en su máquina.
- [x] **T2** — `LenisProvider` creado en `app/providers/LenisProvider.tsx`,
      respeta `prefers-reduced-motion`.
- [x] **T3** — `LenisProvider` montado en `PublicLayout.tsx` únicamente
      (no en `AdminLayout`).
- [x] **T4** — `Reveal` creado en `shared/ui/Reveal.tsx`, exportado desde
      `shared/ui/index.ts`. Todavía sin consumidores — se adopta widget
      por widget en las fases siguientes.
- [ ] **T5** — Usuario corrió `npm install` y confirmó que la app levanta.

## Fase 1 — Hero

- [x] **T6** — CTAs con `whileHover`/`whileTap` de `framer-motion`
      reemplazando las transiciones CSS puras.
- [x] **T7** — Gradiente animado en "un solo lugar." del titular.
- [x] **T8** — Link "Ver catálogo" agregado, sin fondo/borde (no compite
      con los 2 CTAs de contacto), con color acento `#7FB0FF` + subrayado
      animado + flecha que se desliza al hover (ajustado tras feedback del
      usuario: la primera versión, en gris apagado y sin motion, se veía
      demasiado plana).
- [ ] **T9** — Confirmación visual del usuario.

## Fase 2 — Reordenar + recortar repetición

- [x] **T10** — `CategoryGrid` movido a segunda posición en `HomePage.tsx`
      (justo después del Hero).
- [x] **T10b** — Bug encontrado por el usuario tras T10: la línea de acento
      azul de `StatsSection` (pensada para venir después de una sección
      oscura) quedaba flotando sin sentido entre dos secciones claras
      (`CategoryGrid` → `Stats`, ambas nuevas vecinas tras el reorder).
      Se sacó esa línea; el `border-t`/`border-b` gris ya presente alcanza.
- [x] **T10c** — Usuario pidió "una linda lavada de cara" tras ver T10/T10b
      (las tarjetas de `CategoryGrid` — 3 grandes + 5 chicas casi iguales —
      y `Stats` se veían planas). Lavada de cara de ambas:
      - `CategoryGrid`: se detectó que `shared/config/categories.ts` ya
        trae un `icon: IconName` por categoría, nunca usado — mismo patrón
        que los widgets huérfanos. Ahora sí se usa. Las 3 primarias pasan
        a card con ícono en badge de color, índice mono `01—` en la
        esquina, y el link "Ver catálogo" reutiliza la misma
        micro-interacción (subrayado + flecha) del Hero. Las 5 secundarias
        dejan de ser mini-cards y pasan a chips horizontales (ícono +
        label + flecha, fondo se llena de azul al hover) — layout distinto
        a propósito, para que primaria/secundaria se lea de un vistazo y
        no solo por tamaño de fuente. Ambas usan `Reveal` (Fase 0) en vez
        de `useInView` manual.
      - `StatsSection`: se le suma el lenguaje de ícono + badge de color
        de `TrustBand` (el widget huérfano) — ver decisión adelantada en
        **T17**. Índice mono pasa de azul a gris (`textFaint`), mismo tono
        que el índice de `CategoryGrid`, para no competir con el color del
        ícono. También migrado a `Reveal`.
      - Bug propio encontrado y corregido antes de mostrarlo: `pr-4.5` en
        el chip secundario no es una clase válida (la escala de spacing de
        este proyecto no tiene `4.5`, salta de `4` a `5`) — se hubiera
        quedado sin padding derecho. Cambiado a `pr-[18px]`.
- [x] **T10d** — Usuario marcó que `CategoryGrid` (surface) y `Stats`
      (blanco) seguían leyéndose como un solo bloque pálido — causa raíz
      real, no solo la línea de acento de T10b. `StatsSection` pasa a
      fondo oscuro (`bg-ink900`, mismo que Hero/HowItWorks/CtaFinal); los
      badges de color de T10c ahora son translúcidos sobre navy en vez de
      pasteles sólidos (leen mejor sobre oscuro). Esto obligó a reordenar
      de nuevo para que la alternancia clara/oscura tenga sentido en toda
      la home — con 4 secciones oscuras (Hero, Stats, HowItWorks, CtaFinal)
      y solo 2 claras (CategoryGrid, About) la alternancia perfecta es
      matemáticamente imposible (sobra una sección oscura), así que se
      eligió la combinación con la adyacencia oscura menos notoria y mejor
      narrativa: **Hero → CategoryGrid → Stats → About → HowItWorks →
      CtaFinal**. `HowItWorks` y `CtaFinal` quedan oscuras adyacentes,
      pero encajan narrativamente ("así de fácil es el proceso" → "así que
      escribinos ahora") y tienen layouts internos lo bastante distintos
      (2 columnas con pasos vs. bloque centrado) para no leerse como un
      solo bloque repetido, a diferencia de CategoryGrid+Stats (que eran
      dos grids de tarjetas casi idénticos en tono y forma).
- [x] **T10e** — Usuario pidió explícitamente que `CtaFinal` pase a claro
      (reestructurado, no solo recoloreado) manteniendo el mensaje
      "Cotizá ahora." Esto **resuelve del todo** la adyacencia oscura que
      quedaba entre HowItWorks y CtaFinal en T10d — la home queda
      D-L-D-L-D-L perfecta: Hero / **CategoryGrid** / Stats / **About** /
      HowItWorks / **CtaFinal**. Rediseño (no solo cambio de fondo), para
      que no se lea igual que las otras 2 secciones claras:
      - Spotlight que sigue al cursor (`onMouseMove` + `motion` animando
        un `radial-gradient` posicionado en `%`), más 2 blobs de color
        fijos para que la sección tenga presencia también en mobile (sin
        hover). Adelanta **T22** de la Fase 5 — queda hecho acá, no se
        repite.
      - Botones: se sacó el `style` override que simulaba blanco-sobre-
        oscuro en el botón "Formulario de cotización" — con fondo claro,
        la variante `outline` del `Button` compartido ya funciona tal
        cual (texto oscuro, borde que pasa a azul en hover), sin overrides.
      - Contacto (teléfono/email/horario): los 3 íconos SVG hardcodeados
        (`PhoneIcon`/`MailIcon`/`ClockIcon`) se reemplazan por el
        componente `Icon` compartido (ya tenía `phone`/`mail`/`clock`) con
        badges de color pastel — mismo lenguaje que `StatsSection`, pero
        en su variante sólida-sobre-claro en vez de la translúcida-sobre-
        oscuro, cerrando el mismo hilo de diseño en los dos extremos de la
        home.
      - Migrado a `Reveal` (Fase 0).
- [x] **T10f** — Usuario marcó T10e como "muy default" (fondo claro +
      texto centrado es el patrón de CTA más genérico posible) y pidió
      fondo gris + otra forma. Rediseño: la sección vuelve a
      `bg-surface` (gris, mismo tono que `CategoryGrid` — no hay problema
      de adyacencia, no quedan pegadas) pero el contenido pasa a vivir
      dentro de una **tarjeta oscura flotante** con esquinas asimétricas
      (`rounded-tr-[64px]`, el resto en `2xl` — a propósito, no un
      `rounded-2xl` parejo) en vez de ocupar todo el ancho de la sección
      como un rectángulo full-bleed. La tarjeta recupera el fondo oscuro
      (texto blanco, botón "Formulario" con el `style` override otra vez
      — mismo motivo documentado en `remove-inline-styles-tailwind`: no
      depender del orden de generación de Tailwind para pisar la variante
      `outline`), más un watermark del ícono de WhatsApp muy tenue en la
      esquina. **Bug propio encontrado y corregido antes de mostrarlo:**
      el spotlight necesitaba el nodo DOM real de la tarjeta (`ref` +
      `getBoundingClientRect()`), pero se lo pasé a `<Reveal ref={...}>` —
      `Reveal` era una función simple, no reenvía `ref` (React lo
      descarta con un warning, `cardRef.current` queda `null` para
      siempre). Se corrigió `Reveal` con `forwardRef` en vez de evitar el
      wrapper — mejora general del componente compartido, no un parche
      puntual.
- [x] **T11** — `HowItWorks`: copy de los 3 steps recortado para no repetir
      "menos de una hora"/"mismo día"/"sin bots" (ya cubierto en Stats,
      que ahora queda un bloque arriba tras el reorder de T10).
- [x] **T12** — `AboutSection`: ficha técnica recortada a
      Rubro/Ciudad/Vehículos (se sacan Horario/Entrega/Garantía,
      duplicados de otras secciones).
- [ ] **T13** — Confirmación visual del usuario.

## Fase 3 — BrandStrip como marquee

- [x] **T14** — Sorpresa positiva: `BrandStrip.tsx` ya estaba mucho más
      completo de lo que asumía `design.md` — fetch real a `brandApi`,
      array triplicado (no solo duplicado) para loop sin cortes, fade en
      los bordes, hover por logo. Lo único que le faltaba: pausa al hover
      del track completo (estándar en marquees, para poder leer los
      logos) — agregado (`hover:[animation-play-state:paused]`).
- [x] **T15** — Montado en `HomePage.tsx` entre `CategoryGrid` y `Stats`.
      Comparte `bg-surface` con `CategoryGrid` (posible adyacencia clara
      de nuevo, mismo tipo de problema que motivó T10d) pero la forma es
      lo bastante distinta (tira angosta de logos en loop horizontal vs.
      grilla de tarjetas) que no debería repetirlo — a confirmar.
- [x] **T16** — Usuario pidió sacar `BrandStrip` de la home y pasar
      directo a la Fase 4 — no llegó a confirmar visualmente, decidió
      no incluirlo. Se revirtió el mount en `HomePage.tsx` (import +
      `<BrandStrip />` + comentario de numeración). El componente
      (`widgets/brand-strip/BrandStrip.tsx`, con la pausa-en-hover que se
      le agregó en T14) queda intacto sin usar, mismo estado que al
      arrancar este change — no se borra, por si se reconsidera más
      adelante.

**Fase 3 cerrada sin incorporar `BrandStrip`.**

## Fase 4 — Reactivar TrustBand, Testimonials, FeaturedProducts

- [x] **T17** — Decisión tomada (adelantada, durante T10c): `TrustBand` no
      se reactiva como sección aparte — su combo ícono+badge de color se
      trasladó a `StatsSection` en T10c. El archivo `TrustBand.tsx` queda
      sin usar (igual que hoy); se decide en la limpieza final si se
      borra o se deja por si se necesita en otra página.
- [x] **T18** — Intentado y revertido a pedido del usuario. Se conectó
      `FeaturedProducts` (dark theme: `bg-ink900`, glow, `SectionHeading
      dark`, wiring de `onQuote` en `HomePage.tsx` igual patrón que
      `CatalogPage`/`ProductDetailPage`) y `Testimonials` (sin cambios,
      ya estaba completo), reordenando la home a 8 secciones alternadas
      (Hero→CategoryGrid→Stats→About→FeaturedProducts→Testimonials→
      HowItWorks→CtaFinal). El usuario cortó antes de ver el resultado:
      "no pongas nada de la parte 5, como está la página en este momento
      me gusta". Se revirtió `HomePage.tsx` a su estado exacto de antes
      de la Fase 4 (mismo criterio que T16 con `BrandStrip`). El cambio
      de tema oscuro en `FeaturedProducts.tsx` queda aplicado pero sin
      usar — mismo criterio que `BrandStrip.tsx`, no se revierte porque
      no afecta nada mientras no esté montado.
      **Nota aparte, sin resolver:** al armar T19 se notó que el contenido
      de ejemplo de `Testimonials` menciona clientes de Córdoba, Rosario
      y Buenos Aires — contradice el resto de la home ("negocio
      mendocino", entrega "en Mendoza ciudad"). Si se retoma esta fase
      más adelante, reemplazar por testimonios reales de Mendoza antes de
      publicar.
- [x] **T19** — Ver T18 (revertido junto con `FeaturedProducts`).
- [x] **T20** — No aplica — el usuario confirmó que prefiere la página
      *sin* estos cambios, no hay nada que confirmar visualmente.

**Fase 4 cerrada sin incorporar `FeaturedProducts` ni `Testimonials`** —
mismo desenlace que la Fase 3 con `BrandStrip`.

## Fase 5 — CtaFinal + contadores animados

- [x] **T22** — `CtaFinal`: glow radial que sigue al cursor. Hecho antes de
      tiempo, dentro de **T10e** (Fase 2) — el usuario pidió el rediseño de
      `CtaFinal` ahí mismo, no tiene sentido repetirlo en esta fase.
      Sobrevivió intacto a T10f–T10i (últimos cambios fueron de layout/
      color, no del spotlight en sí) — confirmado en la revisión final.
- [x] **T21** — Descartado. El plan original asumía números tipo KPI en
      `StatsSection` para animar un contador (ej. "500+ clientes"). En los
      hechos, `ITEMS[].num` es solo el índice "01"/"02"/"03"/"04" — no hay
      ningún número genuino para contar, animar un contador ahí sería
      simular una estadística que no existe. No se reemplaza por otra
      micro-interacción sin que el usuario la pida — no estaba en el
      alcance original más que como "contador", y esa premisa no aplica.
- [x] **T10g** — Captura del usuario sobre T10f: no le gustó. Diagnóstico
      a partir de la imagen (sin adivinar a ciegas otra vez): la esquina
      asimétrica se leía como un error visual (una esquina distinta al
      lado de 3 normales, no como una decisión reconocible), el watermark
      de WhatsApp quedaba como una mancha sin forma clara al 5% de
      opacidad, y — la causa de fondo — el contenido seguía siendo el
      mismo bloque de texto centrado de las 3 versiones anteriores, ahora
      con bastante vacío arriba/abajo dentro de la tarjeta. Se cambió la
      composición, no la decoración: grid de 2 columnas dentro de la
      tarjeta (texto+CTAs alineados a la izquierda | panel de contacto a
      la derecha con fondo/borde propio, apilado abajo en mobile). Esquina
      uniforme (`rounded-[28px]` parejo) y watermark eliminados.
- [x] **T10h** — Usuario: la forma de T10g estaba bien, pero "solo
      cambiaste el orden de las cosas" — seguía pidiendo fondo gris,
      literal, no navy oscuro. La tarjeta pasa de `bg-ink900` a
      `bg-[#EAEDF2]` (gris, un tono más marcado que el `bg-surface` de la
      sección para que la tarjeta se siga distinguiendo de la página).
      Estructura de 2 columnas de T10g intacta; solo cambia la paleta:
      texto oscuro (`ink900`/`textMuted`/`textFaint`), badges de contacto
      en pastel sólido (mismo lenguaje que `CategoryGrid`), panel de
      contacto en blanco puro para diferenciarse de la tarjeta gris que
      lo contiene, botón "Formulario" vuelve a la variante `outline` de
      `Button` sin el `style` override (ya no hace falta con fondo claro).
- [x] **T10i** — Usuario: "no quiero que sea una caja encima del fondo".
      T10e→T10h iteraron color y forma pero todas compartían la misma
      premisa (un panel con borde/sombra/esquinas redondeadas flotando
      sobre el fondo de la sección) — el usuario rechazó la premisa en sí,
      no un detalle de ella. Se saca la caja: el gris (`#EAEDF2`) pasa a
      ser el fondo de la sección misma, full-bleed, sin `rounded`, sin
      `shadow`, sin panel separado — igual tratamiento que cualquier otra
      sección del sitio. El layout de 2 columnas de T10g se conserva, pero
      ahora es contenido normal dentro de la sección; la columna derecha
      pasa de panel con fondo blanco propio a una simple línea divisoria
      (mismo patrón `border-l`/`border-t` que ya usan las 4 columnas de
      `StatsSection`). El spotlight que sigue al mouse ahora se mide
      contra la sección completa (`sectionRef`), no contra una tarjeta.
- [x] **T23** — Confirmación visual del usuario: satisfecho con el estado
      actual de la home ("como está la página en este momento me gusta").
      Revisión final de código sobre `CtaFinal.tsx`/`StatsSection.tsx`:
      sin imports sin usar, sin referencias colgantes a la tarjeta
      removida en T10i, consistentes con el resto de widgets tocados.

**Fase 5 completa.**

## Verificación final

- [ ] **T24** — Intentado: `npx tsc --noEmit -p tsconfig.build.json`.
      Resultado no confiable — mismo problema de sync de OneDrive ya
      documentado en `remove-inline-styles-tailwind`: el mount que ve
      `bash` devolvió `shared/ui/index.ts` con fecha de modificación
      2026-06-29 (anterior a este change), sin el export de `Reveal`
      agregado en la Fase 0, mientras que la herramienta de lectura de
      archivos (la fuente de verdad) sí lo muestra. Reintentado tras
      esperar unos segundos, mismo resultado — no es un problema puntual
      de timing, el mount quedó desactualizado. No se puede confiar en
      ningún resultado de `tsc`/build corrido desde este sandbox para el
      código de este change. Recomendado correr en la máquina del usuario.
- [ ] **T25** — `npm run test:run` — bloqueado por el mismo motivo que T24,
      sumado a que `framer-motion`/`lenis` tampoco están instalados acá
      (ver T1). Correr en la máquina del usuario, después de `npm install`.
- [ ] **T26** — `npm run build:ci` — ídem T25.
- [x] **T27** — Confirmación del usuario sobre el estado actual ("me
      gusta"). `apply.md` escrito con el resumen de las 6 fases. **No se
      archiva todavía** — quedan T24/T25/T26 pendientes de verificación
      local (`npm install` + `tsc` + tests + build), igual criterio que
      `remove-inline-styles-tailwind`.

## Fase 6 — Íconos de CategoryGrid (post-confirmación)

- [x] **T28** — Usuario, tras ver `CategoryGrid` ya terminado: "no me gustan
      los íconos de esto, podés poner unos mejores y que dé de acuerdo a
      cada pestañita". El set de `shared/ui/Icon.tsx` no tenía nada
      vehículo-específico, así que `shared/config/categories.ts` reusaba
      íconos genéricos sin relación real con la categoría (Motos con
      `settings`/tuercas, Baterías con `trendingUp`/flecha de gráfico,
      Lubricantes con `box`, Filtros con `inventory`, Detailing con
      `star`). Se agregaron 6 íconos nuevos a `Icon.tsx` (mismo estilo
      Feather-stroke que el resto del set): `car`, `motorcycle`,
      `droplet`, `battery`, `filter`, `sparkles`. Reasignados en
      `categories.ts`: Autos `wrench`→`car`, Motos `settings`→`motorcycle`,
      Lubricantes `box`→`droplet`, Baterías `trendingUp`→`battery`,
      Filtros `inventory`→`filter`, Detailing `star`→`sparkles`. Camiones
      (`truck`) y Accesorios (`products`) no se tocan — ya representaban
      bien su categoría.
- [ ] **T29** — Confirmación visual del usuario.
