# Apply: landing-visual-refresh

## Resumen

Rediseño incremental de la landing pública, hecho fase por fase con
confirmación visual del usuario en cada paso (capturas de pantalla en
varios casos). De las 6 fases planeadas en `design.md`, quedaron
incorporadas a la home: Fase 0 (setup), Fase 1 (Hero) y Fase 2
(reordenar + recortar repetición + lavada de cara de Categorías/Stats/CTA
final). Las Fases 3 (`BrandStrip`) y 4 (`FeaturedProducts`+`Testimonials`)
se implementaron por completo pero el usuario decidió no incorporarlas —
se revirtieron a pedido explícito, dejando los widgets construidos pero
sin montar (mismo estado en el que estaban antes de este change). La
Fase 5 (detalle de `CtaFinal` + contador animado en Stats) quedó resuelta
parcialmente: el detalle de `CtaFinal` sí, el contador se descartó por no
haber ningún número real que animar.

## Estado final de la home

`HomePage.tsx` compone, en este orden: Hero → CategoryGrid → StatsSection
→ AboutSection → HowItWorks → CtaFinal. Alternancia de fondo
oscuro/claro perfecta en las 6 secciones (Hero/Stats/HowItWorks oscuras,
CategoryGrid/About/CtaFinal claras).

## Archivos modificados

**Nuevos:**
- `frontend/src/app/providers/LenisProvider.tsx` — scroll suave, montado
  solo en `PublicLayout` (no en `/admin`).
- `frontend/src/shared/ui/Reveal.tsx` — reemplaza el patrón repetido
  `useInView()` + `style` inline por un wrapper de `framer-motion`
  (`forwardRef`, necesario para el spotlight de `CtaFinal`).

**Modificados:**
- `frontend/package.json` — `framer-motion` y `lenis` agregados a
  `dependencies` (no instalados en este sandbox, ver § Verificación).
- `frontend/src/app/layouts/PublicLayout.tsx` — envuelve el sitio público
  en `LenisProvider`.
- `frontend/src/shared/ui/index.ts` — exporta `Reveal`.
- `frontend/src/widgets/hero/Hero.tsx` — CTAs con `whileHover`/`whileTap`;
  gradiente animado en "un solo lugar." (respeta `prefers-reduced-motion`
  vía `useReducedMotion`); tercer link "Ver catálogo" con subrayado
  animado + flecha, mismo patrón reutilizado después en `CategoryGrid`.
- `frontend/src/widgets/category-grid/CategoryGrid.tsx` — reescrito:
  usa los íconos por categoría que ya traía `shared/config/categories.ts`
  (nunca usados hasta ahora); 3 categorías primarias con card+ícono+índice
  mono, 5 secundarias como chips horizontales (antes eran mini-cards);
  migrado a `Reveal`.
- `frontend/src/widgets/stats/StatsSection.tsx` — fondo pasado a
  `bg-ink900` (antes blanco, quedaba pegado a `CategoryGrid`); ícono +
  badge de color por claim, tomados de `TrustBand` (ver § Decisiones);
  migrado a `Reveal`.
- `frontend/src/widgets/how-it-works/HowItWorks.tsx` — copy de los 3
  pasos recortado para no repetir "sin bots"/"menos de una hora"/"el
  mismo día" (ya cubierto por `StatsSection`, ahora un bloque antes).
- `frontend/src/widgets/about/AboutSection.tsx` — ficha técnica recortada
  de 6 filas a 3 (Rubro/Ciudad/Vehículos), se sacan Horario/Entrega/
  Garantía por duplicados.
- `frontend/src/widgets/cta/CtaFinal.tsx` — reescrito varias veces (ver
  `tasks.md` T10e–T10i para el detalle de cada iteración y por qué se
  descartó cada una): versión final es fondo gris full-bleed (sin caja,
  sin sombra, sin esquinas redondeadas — el usuario rechazó
  explícitamente el patrón de "tarjeta flotando sobre el fondo"), layout
  de 2 columnas (mensaje+CTAs a la izquierda, contacto a la derecha
  separado por línea), spotlight que sigue al cursor.
- `frontend/src/pages/home/HomePage.tsx` — orden de secciones actualizado,
  comentarios de numeración corregidos.
- `frontend/src/shared/ui/Icon.tsx` — 6 íconos nuevos (`car`, `motorcycle`,
  `droplet`, `battery`, `filter`, `sparkles`), agregados tras confirmación
  de las Fases 0–5: el set original no tenía nada vehículo-específico, así
  que `CategoryGrid` usaba íconos genéricos sin relación con la categoría
  (ver T28 en `tasks.md`).
- `frontend/src/shared/config/categories.ts` — reasignados los `icon:` de
  Autos/Motos/Lubricantes/Baterías/Filtros/Detailing a los íconos nuevos.
  Camiones y Accesorios sin cambios (ya eran correctos).

**Tocados y luego revertidos (quedan sin usar, mismo estado que antes del
change):**
- `frontend/src/widgets/brand-strip/BrandStrip.tsx` — se le agregó pausa
  en hover del marquee (`hover:[animation-play-state:paused]`); se montó
  y se desmontó de `HomePage.tsx` a pedido del usuario.
- `frontend/src/widgets/featured-products/FeaturedProducts.tsx` — se le
  cambió el tema a oscuro (`bg-ink900`, `SectionHeading dark`, glow) para
  una fase que terminó revertida; el cambio de tema queda aplicado en el
  archivo (no afecta nada mientras no esté montado), no se deshizo.
- `frontend/src/widgets/testimonials/Testimonials.tsx` — sin cambios de
  código; se montó y desmontó junto con `FeaturedProducts`.

## Decisiones documentadas

- **`TrustBand` no se reactiva como sección aparte.** Estaba construido
  (ícono + badge de color por claim) pero nunca conectado, con contenido
  casi idéntico al de `StatsSection`. En vez de sumar una sexta repetición
  de los mismos mensajes, su lenguaje visual (ícono + badge) se trasladó
  a `StatsSection` directamente. `TrustBand.tsx` queda sin usar.
- **`BrandStrip` y `FeaturedProducts`+`Testimonials` no se incorporan.**
  Ambos se implementaron por completo (incluyendo, en el caso de
  `FeaturedProducts`, el wiring de cotización por producto en
  `HomePage.tsx`) pero el usuario prefirió la home sin ellos en ambos
  casos. Quedan como código muerto disponible para retomar más adelante.
- **Contador animado en `StatsSection` (T21) descartado.** El plan
  original asumía cifras tipo KPI; en los hechos `ITEMS[].num` es solo un
  índice "01"–"04", no hay ningún número real que animar.

## Hallazgo sin resolver (fuera de alcance de este change)

Al armar la Fase 4 se notó que el contenido de ejemplo de
`Testimonials.tsx` menciona clientes de Córdoba, Rosario y Buenos Aires —
contradice el resto de la home, que se presenta como "un negocio
mendocino" con entrega solo en Mendoza ciudad. Como el widget no llegó a
montarse, no tiene impacto hoy, pero si se retoma esa fase hay que
reemplazar esos testimonios por unos reales de Mendoza antes de publicar.

También sigue sin corregir el bug de SEO señalado en la conversación
previa a este change (teléfono placeholder `+54-261-XXX-XXXX` en el
JSON-LD de `HomePage.tsx`, desincronizado del real en
`shared/config/contact.ts`) — explícitamente fuera de alcance, ver
`proposal.md` § Non-goals.

## Verificación

- **Integridad de archivos:** cada escritura de este change se hizo con
  las herramientas de archivo (`Read`/`Write`/`Edit`) y se releyó con esa
  misma herramienta después de escribir, nunca con `bash`, siguiendo el
  criterio ya establecido en `remove-inline-styles-tailwind` tras el
  hallazgo de corrupción de sync de OneDrive en ese change.
- **`npx tsc --noEmit -p tsconfig.build.json`:** intentado, resultado no
  confiable. El mount que ve `bash` devolvió `shared/ui/index.ts` con
  fecha de modificación de antes de este change (sin el export de
  `Reveal` agregado en la Fase 0), mientras que la herramienta de lectura
  de archivos sí lo muestra correcto — mismo problema de sync de OneDrive
  ya documentado, reproducido de nuevo. Reintentado tras esperar, mismo
  resultado. No hay forma de correr `tsc` de forma confiable sobre este
  código desde este sandbox.
- **`npm run test:run` / `npm run build:ci`:** no ejecutados. Bloqueados
  tanto por el problema de sync de arriba como por la falta de acceso a
  la registry de npm para instalar `framer-motion`/`lenis` (`403
  Forbidden` contra `registry.npmjs.org`, confirmado en Fase 0).

## Lo que el usuario necesita hacer

```bash
cd frontend
npm install                        # trae framer-motion, lenis (y sincroniza package-lock.json)
npx tsc --noEmit -p tsconfig.build.json
npm run test:run
npm run build:ci
```

Y una revisión visual final de conjunto (ya hubo confirmación parcial por
sección/captura a lo largo de las fases, pero no un recorrido completo de
la home terminada de punta a punta).

## Estado final

Fases 0, 1 y 2 incorporadas y confirmadas visualmente por el usuario.
Fases 3 y 4 completas pero revertidas a pedido explícito. Fase 5
completa (con T21 descartado por no aplicar). **No se archiva todavía**
— quedan las verificaciones locales (`npm install`, `tsc`, tests, build)
pendientes, mismo criterio que `remove-inline-styles-tailwind`.
