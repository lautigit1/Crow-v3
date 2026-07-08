# Proposal: remove-inline-styles-tailwind

## What

Reemplazar el sistema de estilos inline (`style={{...}}`) del frontend por
Tailwind CSS, usando los design tokens ya existentes en
`src/shared/config/theme.ts` como fuente de verdad para el `tailwind.config.js`.

Alcance: 72 archivos `.tsx` con `style={{` detectados hoy
(`shared`: 17, `entities`: 1, `features`: 2, `widgets`: 12, `pages`: 38, `app`: 2).

## Why

Señalado en la auditoría técnica original (sección 7, "Frontend") y
confirmado en la re-auditoría del 06/07: el styling inline es el único
sistema de estilos de la app.

- `AdminProductsPage.tsx` y otras páginas admin superan las 300 líneas de
  objetos de estilo inline, dificultando lectura y mantenimiento.
- Imposibilita reutilización a nivel CSS y `critical path extraction`.
- El propio `theme.ts` ya es, en los hechos, un archivo de tokens de diseño
  sin consumidor más que imports manuales dispersos — Tailwind le da un
  consumidor real (`tailwind.config.js`) y IntelliSense/autocompletado real
  en vez de tener que recordar los nombres de `color.*`.
- De paso resuelve un antipatrón ya señalado (12 archivos con
  `e.currentTarget.style.background = ...` en `onMouseEnter`/`onMouseLeave`):
  pasa a `hover:` variants nativas de Tailwind.

## Non-goals

- **Cero cambio visual.** Esto es un refactor de sintaxis, no un rediseño.
  Ningún color, tamaño, espaciado ni tipografía cambia de valor — se
  traducen 1 a 1. Si en algún punto un valor no tiene una clase Tailwind
  exacta, se usa un *arbitrary value* (`bg-[#0057D9]`) en vez de redondear
  a la escala default de Tailwind.
- No se activa Tailwind Preflight (el reset de CSS de Tailwind) — la app ya
  tiene su propio reset manual en `app/styles/index.css` y activar Preflight
  encima cambiaría el render por defecto de headings/botones/forms/listas,
  exactamente el tipo de diff visual silencioso que este change busca evitar.
- No se migra a un componente de librería externa (Material UI, Chakra,
  etc.) — decisión tomada explícitamente con el usuario en conversación:
  la app ya tiene identidad de marca propia vía `theme.ts` (paleta navy
  industrial, Unbounded/DM Sans/Fira Mono) y una librería de componentes
  con opinión visual propia (MUI = Material Design de Google) obligaría a
  sobreescribir esa identidad en vez de preservarla.
- No se rediseña ningún componente ni se cambia su comportamiento.

## Success criteria

- `tailwindcss`, `postcss`, `autoprefixer` instalados; `tailwind.config.js`
  con cada token de `theme.ts` traducido exactamente (mismos hex, mismos px).
- Preflight deshabilitado (`corePlugins.preflight = false`).
- Cero coincidencias de `style={{` en `src/**/*.tsx` al finalizar (o el
  remanente documentado explícitamente si algún caso requiere estilo
  dinámico en runtime que Tailwind no puede resolver con clases estáticas,
  ej. un color calculado en JS a partir de datos de la API).
- Los 12 casos de `e.currentTarget.style.*` en `onMouseEnter`/`onMouseLeave`
  pasan a `hover:` de Tailwind.
- Suite de tests de frontend (`npm run test:run`) sin regresiones.
- Build de producción (`npm run build:ci`) sin errores nuevos de TypeScript.
- Revisión visual manual del usuario en cada tanda entregada (el sandbox de
  este agente no tiene acceso a la registry de npm para instalar
  `tailwindcss` ni forma de renderizar la app para comparar píxeles —
  ver `design.md` § Verificación).

## Alcance de esta iteración

Dado el volumen (72 archivos), este change se ejecuta en fases y puede
quedar parcialmente aplicado entre sesiones. `tasks.md` es la fuente de
verdad de qué fase está hecha. No se archiva hasta que las 6 fases estén
completas y el usuario confirme visualmente.
