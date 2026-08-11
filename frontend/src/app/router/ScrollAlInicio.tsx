import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { scrollAlInicio } from "@/app/providers/lenisScroll";

/**
 * Manda el scroll al inicio cada vez que cambia la ruta.
 *
 * **React Router no lo hace solo.** En una navegación de verdad el navegador
 * resetea el scroll; en una SPA no hay navegación, solo un cambio de
 * componentes, así que la posición queda donde estaba. Si mirabas la mitad de
 * la portada, ibas al catálogo y volvías, aparecías en la mitad otra vez.
 *
 * Se nota mucho más en un teléfono, donde las páginas son largas y volver
 * atrás es un gesto constante.
 *
 * DOS DECISIONES:
 *
 * `pathname` y no `location` entera. Si dependiera del objeto completo, cambiar
 * un parámetro de búsqueda -- filtrar el catálogo, pasar de página -- también
 * dispararía el salto. Filtrar no es cambiar de página: la persona está
 * mirando la misma lista y quiere quedarse donde está.
 *
 * Salto instantáneo, no suave. La pantalla nueva se pinta enseguida, así que un
 * desplazamiento animado se ve como el contenido nuevo pasando de largo. Es la
 * misma razón por la que el paginador del catálogo usa `behavior: "auto"`.
 */
export function ScrollAlInicio() {
  const { pathname } = useLocation();

  useEffect(() => {
    scrollAlInicio();
  }, [pathname]);

  return null;
}
