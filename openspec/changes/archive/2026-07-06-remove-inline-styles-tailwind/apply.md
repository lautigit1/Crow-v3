# Apply: remove-inline-styles-tailwind

## Resumen

Se reemplazó el styling inline (`style={{...}}`) por clases de Tailwind CSS
en los 72 archivos `.tsx` detectados en el `proposal.md` (`shared`: 17,
`entities`: 1, `features`: 2, `widgets`: 12, `pages`: 38, `app`: 2), más 2
componentes de `app/` que el proposal contaba en el total pero no tenían
tarea asignada (`PublicLayout.tsx`, `ErrorBoundary.tsx` — ver T28b en
`tasks.md`). El detalle fase por fase, con las decisiones y excepciones de
cada archivo, está en `tasks.md`; este documento resume el resultado final.

## Archivos modificados

- `frontend/tailwind.config.js` (nuevo) — theme extendido 1:1 desde
  `shared/config/theme.ts`, Preflight desactivado.
- `frontend/postcss.config.js` (nuevo).
- `frontend/package.json` — `tailwindcss`, `postcss`, `autoprefixer`
  (devDependencies) y `clsx` (dependency).
- `frontend/src/app/styles/index.css` — directivas `@tailwind`, keyframes
  movidos desde `<style>` inyectados por JS (`slideDown`, `slideUp`,
  `routeFadeIn`), retiro de `.hoverable`/`--hover-*` (ya sin consumidores),
  y el fix de Preflight de bordes (ver más abajo).
- Los 74 archivos `.tsx` listados en `tasks.md` fase por fase.

## Excepciones documentadas (quedan con `style={{...}}` a propósito)

28 archivos conservan `style` inline para valores genuinamente dinámicos en
runtime que Tailwind no puede resolver en build-time (tamaños/colores
calculados por prop, hue de avatares, `accent` de gráficos, overrides de
`Button`/`Card` que necesitan pasar valores puntuales). Lista completa con
el motivo de cada uno en `tasks.md` § T32. Un solo caso de
`e.currentTarget.style.*` se mantiene (`AdminBrandsPage.tsx`, ocultar una
imagen de marca rota en `onError` — no tiene equivalente en CSS puro).

## Bug encontrado durante la revisión visual del usuario (post-Fase 5)

El usuario reportó, con capturas, que a varias secciones (`AboutSection`,
`StatsSection`) les faltaban líneas/bordes divisorios aunque el resto
(color, tipografía, espaciado) estaba bien. Se comparó cada valor 1:1
contra el `style={{...}}` original vía `git diff` y coincidía exacto — el
bug no estaba en ningún archivo puntual sino en la configuración global:
`corePlugins.preflight: false` (desactivado a propósito, ver `design.md`)
también desactiva la única regla de Preflight que fija `border-style: solid`
por defecto en todo elemento. Sin ella, las utilidades `border`/`border-t`/
`border-b`/`border-r`/`border-l` de Tailwind solo fijan ancho y color; el
navegador sigue usando su default `border-style: none` y la línea nunca se
dibuja, así el ancho y el color estén bien puestos. Esto afectaba **todos**
los bordes agregados por esta migración en las ~70 páginas, no solo las dos
reportadas.

**Fix:** se agregó en `index.css` únicamente esa regla puntual de Preflight
(`*, ::before, ::after { border-width: 0; border-style: solid; border-color:
currentColor; }`), sin reactivar el resto de Preflight. `border-width: 0`
por defecto evita que aparezcan bordes nuevos no pedidos en elementos sin
una utilidad de ancho explícita.

## Verificación

- **`npx tsc --noEmit -p tsconfig.build.json`**: pasa limpio (0 errores)
  sobre todo `src/`.
- **`grep -rl "style={{" src --include="*.tsx"`**: 28 remanentes, los 28
  documentados (ver arriba).
- **`grep -rl "currentTarget.style" src --include="*.tsx"`**: 1 remanente
  documentado (ver arriba).
- **Revisión de valores 1:1** vía `git diff` contra el original en los
  archivos donde el usuario reportó una diferencia visual, confirmando que
  la causa era la config global de Preflight y no un valor mal traducido.
- **Confirmación visual del usuario**, fase por fase, incluyendo el
  hallazgo y fix del bug de bordes.

## Lo que NO se pudo verificar en este sandbox (y por qué)

Limitación conocida desde el arranque del change (ver `design.md` §
Verificación, mismo criterio que `fix-ci-npm-ci` y `audit-pending-fixes`):
este sandbox no tiene acceso a la registry de npm ni forma de levantar un
dev server para comparar renders. Al intentar correr `npm run test:run` /
`npm run build:ci` de todos modos, se encontró que varios archivos de
`node_modules/vite` (ajenos a este change, nunca tocados por la migración)
están truncados en el filesystem que este agente monta sobre la carpeta
sincronizada por OneDrive, y no hay red para reinstalar (`npm install`
devuelve 403 contra el registry). **T34** (`test:run`) y **T35**
(`build:ci`) quedan sin marcar por esto — es una limitación de entorno, no
una verificación salteada por descuido. El `tsc --noEmit` que corre como
primer paso de `build:ci` sí se verificó limpio de forma independiente.

De paso se encontraron y repararon 71 archivos de `src/` con corrupción de
sincronización de OneDrive (bytes nulos de relleno o contenido cortado a
mitad de archivo) en la copia que este sandbox veía por `bash` — confirmado
comparando contra el contenido real vía la herramienta de lectura de
archivos. No es contenido relacionado con este change; ver nota en
`tasks.md` § Verificación final.

**Acción recomendada para el usuario**, antes o después de esta
archivación:
```bash
cd frontend
npm run test:run
npm run build:ci
```
para confirmar en su máquina (donde `node_modules` no debería tener este
problema de sincronización) que no hay regresiones.

## Estado final

Las 6 fases de migración están completas y confirmadas visualmente por el
usuario, incluyendo la corrección del bug de bordes post-Fase 5. Se archiva
con T34/T35 pendientes de verificación local por la limitación de entorno
documentada arriba, mismo criterio ya usado en changes anteriores de este
mismo proyecto.
