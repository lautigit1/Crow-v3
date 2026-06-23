# Crow Repuestos — React + TypeScript

Versión en React/TSX del sitio de Crow Repuestos (landing + catálogo con filtros),
portada 1:1 desde el diseño HTML original. Stack: **Vite + React 18 + TypeScript +
React Router**, con estilos inline fieles al diseño.

## Requisitos

- Node.js 18 o superior

## Puesta en marcha

```bash
npm install
npm run dev        # servidor de desarrollo (http://localhost:5173)
```

Otros comandos:

```bash
npm run build      # typecheck + build de producción en dist/
npm run preview    # sirve el build de producción
npm run typecheck  # solo chequeo de tipos
```

## Estructura

```
src/
  main.tsx                  Punto de entrada + BrowserRouter
  App.tsx                   Rutas: "/" (Home) y "/catalogo" (Catálogo)
  index.css                 Reset, tipografías y keyframe fadeUp
  types.ts                  Tipos de producto y catálogo
  lib/
    Hoverable.tsx           Wrapper que aplica hover/focus a estilos inline
    useScrolled.ts          Hook para la sombra del header al hacer scroll
    whatsapp.ts             Datos de contacto + helper de enlaces wa.me
  data/
    featured.ts             Productos destacados de la landing
    catalog.ts              Catálogo completo + categorías
  components/
    UtilityBar, SiteHeader, Logo, Footer, QuoteModal, Placeholder
  pages/
    Home.tsx + home/*       Secciones de la landing
    Catalog.tsx + catalog/  Catálogo y lógica de filtrado
```

## Notas

- Los bloques `[ FOTO ]` y `[ LOGO MARCA ]` son placeholders del diseño original;
  reemplazá `Placeholder`/`Photo` por imágenes reales cuando las tengas.
- El número de WhatsApp y los datos de contacto están centralizados en
  `src/lib/whatsapp.ts` para editarlos en un solo lugar.
- El modal de cotización abre WhatsApp con el mensaje pre-armado (mismo
  comportamiento que el diseño original).
