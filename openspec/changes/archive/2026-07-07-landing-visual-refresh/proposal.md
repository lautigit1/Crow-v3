# Proposal: landing-visual-refresh

## What

Rediseño incremental de la landing pública (`HomePage` y sus widgets) para
que se sienta más distintiva y cuidada sin perder el tono minimalista
actual: scroll suave, micro-interacciones más pulidas vía Framer Motion,
reactivación de 4 widgets ya construidos pero nunca conectados
(`TrustBand`, `Testimonials`, `BrandStrip`, `FeaturedProducts`),
reordenamiento de secciones para reducir la redundancia de mensajes, y un
par de detalles visuales puntuales (marquee de marcas, texto con gradiente
animado, contador animado en stats).

Alcance: `frontend/src/widgets/*` (hero, trust-band, stats, how-it-works,
category-grid, brand-strip, featured-products, testimonials, about, cta),
`frontend/src/pages/home/HomePage.tsx`, `frontend/src/app/providers/`,
`frontend/src/app/layouts/PublicLayout.tsx`, `frontend/src/shared/ui/`.

## Why

Auditoría conversacional previa a este change (revisión manual de código,
sin herramienta automatizada) encontró:

- 4 widgets completos en `widgets/` (`TrustBand`, `Testimonials`,
  `BrandStrip`, `FeaturedProducts`) que `HomePage.tsx` nunca importa —
  código construido y nunca conectado. Confirmado con
  `grep -r "FeaturedProducts|BrandStrip|Testimonials|TrustBand" src`: solo
  aparecen en su propio archivo de definición (más una mención en un
  comentario de `DashboardPage.tsx`, no un uso real).
- Los mismos 4-5 mensajes (garantía de fábrica, entrega el mismo día,
  respuesta en 1 hora, horario Lun-Sáb 8-18) se repiten en 5 secciones
  distintas (Hero, StatsSection, HowItWorks, AboutSection, CtaFinal) sin
  ninguna evidencia externa (fotos, reseñas, cifras reales) que respalde
  la afirmación.
- `CategoryGrid` — la única sección realmente navegable/accionable de la
  home — queda 4ta en el scroll, detrás de tres secciones de puro texto
  persuasivo (Hero, Stats, HowItWorks).
- El usuario pidió explícitamente sumar librerías nuevas, minimalistas,
  para una sensación más distintiva y "llamativa" sin perder el tono
  actual. Decisión ya tomada en conversación (`AskUserQuestion`): Framer
  Motion + Lenis como base, más 2-3 piezas puntuales hechas a mano en vez
  de traer un kit de componentes completo (Magic UI/Aceternity requieren
  su propio CLI/setup tipo shadcn, que este proyecto no usa).

## Non-goals

- No rediseño de marca (paleta, tipografía, tono de copy) — se mantiene la
  identidad navy / Unbounded / DM Sans / Fira Mono ya establecida en
  `theme.ts` / `tailwind.config.js`.
- No se toca el panel de `/admin` ni ninguna página fuera de la landing
  pública y sus widgets compartidos. `LenisProvider` se monta solo en
  `PublicLayout`, nunca en `AdminLayout`.
- No se trae ningún kit de componentes (Magic UI, Aceternity, shadcn) como
  dependencia nueva — los elementos puntuales (marquee, gradiente animado,
  glow del CTA final) se implementan a mano con Tailwind + Framer Motion.
- No se corrige en este change el bug de SEO ya señalado en conversación
  (teléfono placeholder `+54-261-XXX-XXXX` en el JSON-LD de
  `HomePage.tsx`, desincronizado del teléfono real en
  `shared/config/contact.ts`) — queda anotado para un change aparte si el
  usuario lo pide.
- No se agregan datos ni copy inventados (testimonios falsos, marcas que
  no trabajan con el negocio, cifras sin base) — `Testimonials` y
  `BrandStrip` se reactivan con el contenido de ejemplo que ya traían al
  crearse, marcado explícitamente como placeholder hasta que el usuario
  confirme datos reales.

## Success criteria

- `framer-motion` y `lenis` agregados a `package.json`; usuario corre
  `npm install` en su máquina y confirma que la app levanta sin errores.
- Scroll suave (Lenis) activo en el sitio público, ausente en `/admin`.
- `Reveal` (wrapper de `framer-motion`) reemplaza el patrón repetido
  `useInView()` + `style={{opacity, animation}}` en los widgets de la home.
- `TrustBand`, `Testimonials`, `BrandStrip` y `FeaturedProducts`
  conectados a `HomePage.tsx`, ubicados donde más aportan prueba social.
- `CategoryGrid` reubicado inmediatamente después del Hero.
- Contenido repetido de garantía/horario/entrega reducido a 2 apariciones
  como máximo en toda la home (hoy: 5).
- Confirmación visual del usuario en cada fase entregada — mismo criterio
  que el change `remove-inline-styles-tailwind`: este sandbox no tiene
  renderer ni acceso a la registry de npm (ver `design.md` § Verificación).

## Alcance de esta iteración

Change en fases, igual criterio que `remove-inline-styles-tailwind`:
`tasks.md` es la fuente de verdad de qué fase está hecha y puede quedar
parcialmente aplicado entre sesiones. No se archiva hasta que las fases
estén completas y el usuario confirme visualmente cada una.
