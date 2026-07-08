# Design: landing-visual-refresh

## Fase 0 — Setup

**Archivos:** `frontend/package.json`, `frontend/src/app/providers/LenisProvider.tsx`
(nuevo), `frontend/src/shared/ui/Reveal.tsx` (nuevo),
`frontend/src/shared/ui/index.ts`, `frontend/src/app/layouts/PublicLayout.tsx`.

- `framer-motion` (`^11.11.17`) y `lenis` (`^1.1.13`) agregados como
  `dependencies` en `package.json`.
- `LenisProvider`: envuelve `children` en un `useEffect` que crea el
  `Lenis` instance y corre su loop vía `requestAnimationFrame`. Respeta
  `prefers-reduced-motion` (no se activa si el usuario lo tiene seteado).
  Se monta **solo** en `PublicLayout`, nunca en `AdminLayout` — el panel
  admin tiene tablas con su propio scroll interno y no gana nada con
  inercia en el scroll de página.
- `Reveal`: wrapper de `motion.div` con `whileInView`/`viewport={{once:true}}`,
  variants `hidden`/`visible` (opacity 0→1, translateY 28px→0) y un prop
  `index` que controla el delay del stagger (`index * 0.09s`, mismo
  timing que ya usaban los widgets a mano). Reemplaza el patrón repetido:

  ```tsx
  // antes (copiado en Hero, StatsSection, HowItWorks, CategoryGrid, AboutSection)
  const [ref, inView] = useInView();
  <div ref={ref} style={{ opacity: inView ? 1 : 0, animation: inView ? `reveal .5s ${i*0.09}s ease both` : "none" }}>

  // después
  <Reveal index={i}>
  ```

  `shared/lib/useInView.ts` se mantiene sin tocar por ahora — lo siguen
  usando otros widgets no incluidos en el alcance de este change; se
  retira recién si al final de la Fase 4 queda sin consumidores.

## Fase 1 — Hero

- Micro-interacciones vía `motion` en los dos CTAs (`whileHover`,
  `whileTap`) en vez de las transiciones CSS puras actuales.
- Titular: la palabra final ("un solo lugar.") pasa de gradiente estático
  (`bg-clip-text` fijo) a gradiente animado (`background-position` en loop
  vía `motion`), igual técnica que un "Magic UI AnimatedGradientText" pero
  hecho a mano con Tailwind arbitrary values + `framer-motion`, sin
  dependencia nueva.
- Se agrega un tercer link, más discreto que los dos CTAs de contacto:
  "Ver catálogo" → `/catalogo`, para visitantes que prefieren explorar
  antes de escribir.

## Fase 2 — Reordenar + recortar repetición

Orden actual: Hero → Stats → HowItWorks → CategoryGrid → AboutSection → CtaFinal.
Orden nuevo: Hero → **CategoryGrid** → Stats → HowItWorks → AboutSection → CtaFinal.

Contenido repetido a recortar (garantía / entrega mismo día / respuesta en
1h / horario aparece hoy en Hero, Stats, HowItWorks, AboutSection y
CtaFinal — 5 veces):

- Hero (chips) y CtaFinal (contacto) se mantienen — son el primer y último
  contacto visual, tiene sentido reforzar ahí.
- `StatsSection` se mantiene como está (es el bloque "oficial" de
  claims) — la Fase 5 lo transforma en algo más que texto repetido,
  sumando contadores animados.
- `HowItWorks` deja de repetir "menos de una hora"/"mismo día" en el copy
  de los steps (ya lo dice Stats un bloque antes) y se enfoca en el
  *proceso* (qué hace el usuario en cada paso), no en las promesas.
- `AboutSection`: la "ficha técnica" (horario/entrega/garantía) se
  recorta a los datos que no están en ningún otro lado (rubro, ciudad,
  vehículos) — se saca `Horario`, `Entrega`, `Garantía`, ya cubiertos
  arriba. El espacio liberado queda preparado para sumar contenido nuevo
  más adelante (fuera de alcance de este change: foto real del local).

## Fase 3 — BrandStrip como marquee

`app/styles/index.css` ya tiene un `@keyframes marquee` definido y sin
uso (`translateX(0)` → `translateX(-50%)`) — confirma que esto ya estaba
planeado. Se reactiva `BrandStrip.tsx`:

- Lista de marcas duplicada una vez (`[...BRANDS, ...BRANDS]`) para que el
  loop sea continuo, animada con el keyframe `marquee` existente vía clase
  Tailwind (`animate-[marquee_28s_linear_infinite]`), pausa en hover
  (`hover:[animation-play-state:paused]`).
- Se monta en `HomePage.tsx` entre `CategoryGrid` y `Stats` — funciona
  como transición visual liviana entre "elegí tu categoría" y "por qué
  confiar en nosotros", sin agregar otro bloque de texto pesado.

## Fase 4 — Reactivar TrustBand, Testimonials, FeaturedProducts

- `TrustBand`: no se reactiva como sección aparte (redundante con
  StatsSection, mismo tipo de claim). Se descarta explícitamente — ver
  `tasks.md` para la decisión documentada en el momento de ejecutar esta
  fase.
- `FeaturedProducts`: se conecta después de `BrandStrip`, mostrando stock
  real (usa el mismo cliente de API que `CatalogPage`) — es el primer
  punto de la home donde se ve un producto real con precio, algo que hoy
  no existe en toda la landing.
- `Testimonials`: contenido de ejemplo actual queda marcado con un
  comentario `// TODO: reemplazar por testimonios reales` — no se inventa
  contenido nuevo, ver `proposal.md` § Non-goals. Se ubica justo antes de
  `CtaFinal`, como último empujón de confianza antes del cierre.

## Fase 5 — CtaFinal + contadores animados

- `StatsSection`: los 4 números pasan de texto estático a contador
  animado al entrar en viewport, vía `motion`'s `useMotionValue` +
  `useTransform` (o `animate()` imperativo) — sin librería nueva, es
  built-in de Framer Motion.
- `CtaFinal`: glow radial sutil que sigue al cursor dentro de la sección
  (`motion.div` con `onMouseMove` actualizando un `background: radial-gradient`
  centrado en la posición del mouse) — el tipo de detalle "Magic UI
  Spotlight" hecho a mano, sin dependencia nueva.

## Verificación

Mismas limitaciones ya documentadas en `remove-inline-styles-tailwind`:

- **Sin acceso a la registry de npm** en este sandbox (`403` contra
  `registry.npmjs.org`, confirmado en Fase 0) — el usuario necesita correr
  `npm install` una vez en su máquina antes de que `framer-motion`/`lenis`
  resuelvan y el build funcione.
- **Sin renderer visual** en este sandbox — no hay forma de levantar el
  dev server ni sacar screenshots para comparar contra el original acá.
  Mitigación: confirmación visual del usuario por fase, no al final.
- **Sync de OneDrive**: el change anterior (`remove-inline-styles-tailwind`)
  encontró archivos truncados/con bytes nulos al leerlos vía `bash` que
  estaban íntegros vía la herramienta de lectura de archivos. Todas las
  escrituras de este change se hacen con las herramientas de archivo
  (`Read`/`Write`/`Edit`), nunca con `bash cat >`, y se relee con esas
  mismas herramientas después de escribir, no con `bash`, para evitar dar
  por buena una copia potencialmente corrupta.
