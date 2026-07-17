import { defineConfig } from "steiger";
import fsd from "@feature-sliced/steiger-plugin";

// Reglas de arquitectura FSD -- hallazgo "Alta" #11 de la auditoría técnica
// del 2026-07-13. Se activa el set recomendado de @feature-sliced/steiger-plugin
// (que incluye `forbidden-imports`, la regla que realmente importa: impide que
// una capa importe "hacia arriba", ej. que `pages` dependa de `app`) y se
// documentan acá las excepciones puntuales que sí se evaluaron y se decidió
// no forzar, en vez de dejarlas simplemente apagadas sin explicación.
export default defineConfig([
  ...fsd.configs.recommended,

  {
    // Este repo no nació siguiendo FSD al pie de la letra: cada slice
    // (`entities/product`, `pages/home`, `widgets/navbar`, etc.) es
    // consistentemente un puñado de archivos planos (`api.ts`, `model.ts`,
    // un componente) en vez de estar subdividido en segmentos `ui/model/api/lib`.
    // Es una convención deliberada y uniforme en las ~35 slices del proyecto,
    // no descuido caso por caso -- partirlas todas en segmentos es una
    // reestructuración grande y de alto riesgo (cientos de imports a
    // actualizar) que excede el alcance de este hallazgo puntual de la
    // auditoría. Se deja registrado como deuda técnica conocida para una
    // migración incremental futura, no se fuerza como error bloqueante hoy.
    files: ["./src/**"],
    rules: {
      "fsd/no-segmentless-slices": "off",
      "fsd/segments-by-purpose": "off",
    },
  },
  {
    // `pages/admin/*` se importa exclusivamente vía `lazy(() => import("@/pages/admin/XPage"))`
    // en `app/App.tsx`, una ruta por chunk (code-splitting real: cada
    // sección del panel de admin es su propio bundle, cargado solo cuando
    // se visita). Si se forzara a pasar por un `index.ts` barrel de
    // `pages/admin`, ese barrel importaría (estáticamente) todas las
    // páginas del admin, y CUALQUIER `lazy()` individual arrastraría el
    // panel de admin completo a un solo chunk -- exactamente la regresión
    // de performance que el code-splitting evita. Evaluado explícitamente,
    // no es un descuido: la regla no tiene forma de expresar "excepto para
    // imports dinámicos con code-splitting intencional".
    files: ["./src/app/**", "./src/pages/admin/**"],
    rules: {
      "fsd/public-api": "off",
      "fsd/no-public-api-sidestep": "off",
    },
  },
  {
    // `entities/upload` hoy solo lo usa `pages/admin/AdminProductsPage` (subida
    // de imagen de producto). Fusionarlo dentro de `entities/product` acoplaría
    // dos responsabilidades separadas (subida de archivos genérica vs. modelo
    // de producto) por una ganancia mínima -- se mantiene separado a propósito.
    files: ["./src/entities/upload/**"],
    rules: {
      "fsd/insignificant-slice": "off",
    },
  },
]);
