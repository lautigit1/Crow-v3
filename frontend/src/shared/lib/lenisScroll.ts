import type Lenis from "lenis";

/**
 * El puente entre Lenis y quien necesite mover el scroll a mano.
 *
 * Vive en su propio archivo y no dentro de `LenisProvider` por una razón
 * concreta: un módulo que exporta un componente **y** funciones sueltas rompe
 * el refresco en caliente de Vite (lo avisa `react-refresh/only-export-components`),
 * y editar el provider dejaría de actualizar la pantalla sin recargar.
 *
 * Es una variable de módulo y no un Context: hay UNA sola instancia de Lenis en
 * toda la app -- se monta solo en `PublicLayout` -- y quien la consume vive
 * fuera de ese layout, porque el scroll también hay que resetearlo en `/cuenta`
 * y `/admin`, donde Lenis no existe. Un Context obligaría a envolver la app
 * entera en un provider cuyo valor es null en la mayoría de las rutas.
 */
let instancia: Lenis | null = null;

export function registrarLenis(lenis: Lenis | null) {
  instancia = lenis;
}

/**
 * Manda el scroll al inicio.
 *
 * **`window.scrollTo` a secas no alcanza cuando Lenis está activo**: Lenis corre
 * un `requestAnimationFrame` que restaura su posición interna, así que el salto
 * se deshace en el cuadro siguiente. Hay que pedírselo a él.
 *
 * Cuando Lenis no está montado -- panel, área de cuenta, o alguien con
 * "reducir movimiento" activado en el sistema -- se cae al scroll nativo.
 */
export function scrollAlInicio() {
  if (instancia) {
    instancia.scrollTo(0, { immediate: true });
    return;
  }
  window.scrollTo({ top: 0, behavior: "instant" });
}

/**
 * Lleva el elemento con ese `id` al borde superior. Mismo motivo que arriba
 * para pasar por Lenis. El espacio para la barra fija lo pone el propio
 * elemento con `scroll-margin-top`, que respetan tanto Lenis como
 * `scrollIntoView`; sumar un offset acá lo duplicaría.
 */
export function scrollAId(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  if (instancia) {
    instancia.scrollTo(el);
    return;
  }
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
}
