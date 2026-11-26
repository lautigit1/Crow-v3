import { Link } from "react-router-dom";
import { Container } from "@/shared/ui";
import { CATEGORIES } from "@/shared/config";
import { useCategoriesQuery } from "@/entities/category/queries";

// Los tres tipos de vehículo son un filtro real del catálogo (`vehicle_type`
// del producto), así que enlazan con `?tipo=`. Antes enlazaban con `?cat=`,
// como si fueran categorías, y en la base no existe ninguna categoría con
// esos nombres: el filtro no se aplicaba.
const VEHICULOS = CATEGORIES.slice(0, 3); // Autos, Camiones, Motos

/**
 * El catálogo como índice: primero el tipo de vehículo, después el rubro.
 *
 * Los rubros salen de las categorías reales cargadas en el sistema (no de una
 * lista fija), así la home nunca ofrece un rubro que el catálogo no tiene.
 * Mientras cargan se muestra el esqueleto de la lista; si no hay ninguna o la
 * API falla, la columna no se muestra y quedan los accesos por vehículo.
 */
export function CategoryGrid() {
  const { data: categorias = [], isPending } = useCategoriesQuery();

  return (
    <section className="bg-white py-16 md:py-24">
      <Container>
        <div className="mb-10 flex flex-wrap items-end justify-between gap-x-10 gap-y-4 md:mb-12">
          <h2 className="m-0 font-display text-display-md font-medium text-ink900 md:text-display-lg">
            Buscá por vehículo o por rubro
          </h2>
          <Link
            to="/catalogo"
            className="font-body text-body-sm text-primary underline decoration-[rgba(0,87,217,.3)] underline-offset-4 hover:decoration-primary"
          >
            Ver todo el catálogo
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-20">
          <nav aria-label="Catálogo por tipo de vehículo">
            <ul className="m-0 list-none border-t border-ink900 p-0">
              {VEHICULOS.map((c) => (
                <li key={c.label} className="border-b border-border">
                  <Link
                    to={`/catalogo?tipo=${encodeURIComponent(c.label)}`}
                    className="group grid grid-cols-1 gap-1 py-5 no-underline sm:grid-cols-[200px_1fr] sm:items-baseline sm:gap-8 md:py-6"
                  >
                    <span className="font-display text-[24px] font-medium leading-tight tracking-[-0.025em] text-ink900 transition-colors duration-150 group-hover:text-primary md:text-[28px]">
                      {c.label}
                    </span>
                    <span className="font-body text-body text-textMuted">{c.desc}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {(isPending || categorias.length > 0) && (
            <nav aria-label="Catálogo por rubro" aria-busy={isPending}>
              <p className="m-0 mb-3 font-body text-body-sm text-textMuted">Rubros</p>
              <ul className="m-0 list-none border-t border-border p-0">
                {isPending
                  ? [0, 1, 2, 3].map((i) => (
                      <li key={i} className="border-b border-border py-4">
                        <span className="block h-4 w-32 rounded-sm bg-surface" />
                      </li>
                    ))
                  : categorias.map((c) => (
                      <li key={c.id} className="border-b border-border">
                        <Link
                          to={`/catalogo?cat=${encodeURIComponent(c.name)}`}
                          className="group flex items-baseline justify-between gap-4 py-3.5 no-underline"
                        >
                          <span className="font-body text-body font-medium text-ink900 transition-colors duration-150 group-hover:text-primary">
                            {c.name}
                          </span>
                          {c.description && (
                            <span className="hidden truncate text-right font-body text-caption text-textFaint sm:inline lg:hidden">
                              {c.description}
                            </span>
                          )}
                        </Link>
                      </li>
                    ))}
              </ul>
            </nav>
          )}
        </div>
      </Container>
    </section>
  );
}
