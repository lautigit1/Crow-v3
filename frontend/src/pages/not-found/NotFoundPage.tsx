import { Link } from "react-router-dom";
import { usePageMeta } from "@/shared/lib/usePageMeta";
import { Button } from "@/shared/ui";

// Sin el glow azul ni el "404" de 140px con degradé: el número es el dato
// menos útil de la página. Lo que importa es qué hacer ahora.
export function NotFoundPage() {
  usePageMeta("404 · Crow Repuestos", "Esta página no existe.");

  return (
    <section className="flex min-h-[70vh] items-center bg-ink900 px-6 py-20">
      <div className="mx-auto w-full max-w-[520px]">
        <p className="m-0 mb-4 font-body text-caption text-textOnDarkFaint">Error 404</p>
        <h1 className="m-0 mb-4 font-display text-display-md font-medium text-white md:text-display-lg">
          Esta página no existe
        </h1>
        <p className="m-0 mb-10 font-body text-body text-textOnDarkFaint">
          La dirección es incorrecta o la página se movió. Podés volver al inicio o buscar el
          repuesto en el catálogo.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button as={Link} to="/catalogo" size="lg">
            Ir al catálogo
          </Button>
          <Button as={Link} to="/" size="lg" variant="onDark">
            Volver al inicio
          </Button>
        </div>
      </div>
    </section>
  );
}
