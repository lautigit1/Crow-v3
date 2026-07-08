# Design: remove-inline-styles-tailwind

## Setup

**Archivos:** `frontend/tailwind.config.js` (nuevo), `frontend/postcss.config.js`
(nuevo), `frontend/src/app/styles/index.css`, `frontend/package.json`.

`tailwind.config.js` extiende el theme (no lo reemplaza) con los valores
exactos de `theme.ts`:

```js
colors: { primary: "#0057D9", ink900: "#07111F", ... },
fontFamily: { display: ["Unbounded", "sans-serif"], ... },
borderRadius: { sm: "4px", md: "8px", lg: "12px", pill: "999px" },
boxShadow: { sm: "...", md: "...", lg: "...", nav: "..." },
```

`corePlugins: { preflight: false }` — decisión explícita, ver `proposal.md`
§ Non-goals. Sin esto, Tailwind resetea heading sizes, botones, listas, etc.
y el diff visual ya no sería cero.

`postcss.config.js` estándar (`tailwindcss` + `autoprefixer`).
`index.css` gana `@tailwind base; @tailwind components; @tailwind utilities;`
al principio del archivo — todo el CSS manual existente (keyframes,
`.hoverable`, scrollbar, `:root` vars) se mantiene intacto debajo, sin tocar.

`package.json`: se agregan `tailwindcss@^3.4.13`, `postcss@^8.4.47`,
`autoprefixer@^10.4.20` (devDependencies) y `clsx@^2.1.1` (dependency, para
componer clases condicionales sin template strings ilegibles).

**Importante:** este agente no tiene acceso a la registry de npm en su
sandbox (mismo 403 que bloqueó el fix original de `npm ci`), así que
`package-lock.json` queda desincronizado por estos 4 paquetes nuevos hasta
que el usuario corra `npm install` una vez en su máquina. Ver § Verificación.

## Patrón para variantes (ej. `Button.tsx`)

Los componentes con "variants" (`Button`, `Badge`) usan hoy un objeto
`Record<Variant, CSSProperties>` y hacen spread en el `style` inline. La
traducción no es "borrar el objeto", es cambiar qué contiene: en vez de
`CSSProperties`, un mapa `Variant -> string` de clases Tailwind, combinado
con `clsx`:

```tsx
const variants: Record<Variant, string> = {
  primary: "bg-primary text-white border border-primary hover:bg-primaryDark hover:border-primaryDark",
  outline: "bg-white text-ink800 border border-borderStrong hover:border-primary hover:text-primary",
  // ...
};

<button className={clsx(
  "inline-flex items-center justify-center gap-[9px] rounded-sm font-body font-semibold tracking-[.01em] cursor-pointer whitespace-nowrap",
  sizes[size],
  variants[variant],
  fullWidth && "w-full",
  className,
)} {...rest}>
```

Esto reemplaza el patrón `.hoverable` + variables CSS custom (`--hover-bg`,
etc.) por `hover:` nativo de Tailwind — mismo objetivo (evitar
`onMouseEnter` disparando renders de React), mecanismo más simple. La clase
global `.hoverable` en `index.css` se puede retirar recién cuando el último
componente que la usa (`Button.tsx`, hoy el único) esté migrado.

## Patrón para los 12 casos de `currentTarget.style.*`

```tsx
// antes
onMouseEnter={(e) => e.currentTarget.style.background = color.surface}
onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}

// despues
className="hover:bg-surface"
```

Directo en la mayoría de los casos. Si el valor de hover depende de una prop
dinámica (ej. color según estado de un pedido/cotización), se resuelve con
`clsx` seleccionando entre clases estáticas predefinidas — nunca con un
valor Tailwind construido por interpolación de string (`` `hover:bg-${x}` ``
no funciona: Tailwind escanea el código fuente en build-time buscando
substrings literales de clases, no evalúa JS).

## Fases de migración

Orden elegido por apalancamiento (lo que más páginas heredan primero) y por
riesgo (interno/admin antes que público-crítico solo al final, para no
arriesgar checkout/catálogo hasta tener el patrón validado):

1. **Setup** (este documento, sin tocar componentes) — hecho en esta sesión.
2. **`shared/ui/`** (17 archivos: `Button`, `Badge`, `Card`, `Modal`,
   `Dropdown`, `DataTable`, `Drawer`, `Field`, `Pagination`, etc.) — todo lo
   demás se construye sobre esto.
3. **`entities/` + `features/`** (3 archivos).
4. **`widgets/`** (12 archivos).
5. **`pages/` — admin primero** (interno, tolera más iteración).
6. **`pages/` — público** (catálogo, producto, checkout, cuenta) — al
   final, con el patrón ya probado en las fases anteriores.

Cada fase se verifica con `npm run test:run` + `npm run build:ci` antes de
pasar a la siguiente, y se entrega para revisión visual del usuario antes de
seguir con la fase pública (5→6).

## Verificación

Limitaciones conocidas de este sandbox (mismas que en changes anteriores,
ej. `fix-ci-npm-ci`, `audit-pending-fixes`):

- **Sin acceso a la registry de npm** para paquetes nuevos → no se puede
  instalar `tailwindcss` ni correr `npm run build:ci` / `npm run test:run`
  contra el árbol de dependencias real en este sandbox. El usuario necesita
  correr `npm install` una vez (local o vía Docker, como ya hicimos con el
  fix del `Dockerfile`) antes de que el build funcione.
- **Sin renderer visual** — no hay forma de levantar el dev server y sacar
  screenshots para diff contra el original en este sandbox. La mitigación
  es de proceso, no de herramienta: traducir valores exactos (nunca
  redondear a la escala default de Tailwind), Preflight apagado, y pedir
  confirmación visual del usuario por fase en vez de al final de las 72.
- **Sync lag de OneDrive**: igual que en changes previos, el mount de bash
  a veces muestra una versión desactualizada de un archivo recién editado.
  Se verifica con la herramienta de lectura de archivos (no `bash cat`)
  antes de dar por buena la sintaxis de cada archivo, y se hace una
  verificación de sintaxis vía copia en un path no sincronizado
  (`/tmp` o el directorio de outputs) cuando hace falta certeza.
