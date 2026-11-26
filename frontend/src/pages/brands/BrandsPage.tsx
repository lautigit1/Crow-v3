import { usePageMeta } from "@/shared/lib/usePageMeta";
import { Link } from "react-router-dom";
import { Container, CenteredSpinner, EmptyState, PageHeader } from "@/shared/ui";
import { useBrandsQuery } from "@/entities/brand/queries";

export function BrandsPage() {
  usePageMeta("Marcas", "Todas las marcas de repuestos disponibles en Crow Repuestos, Mendoza.");
  const { data: brands, isPending } = useBrandsQuery();

  return (
    <>
      <PageHeader
        title="Marcas aliadas"
        lead="Trabajamos con fabricantes reconocidos. Cada referencia que distribuimos está respaldada por garantía de planta."
      />

      <section className="min-h-[50vh] bg-surface pb-24 pt-14">
        <Container>
          {isPending ? (
            <CenteredSpinner label="Cargando marcas…" />
          ) : !brands || brands.length === 0 ? (
            <EmptyState title="Aún no hay marcas cargadas" message="Agregá marcas desde el panel de administración." />
          ) : (
            // Antes era `grid-cols-4` en todos los anchos: en un teléfono
            // quedaban cuatro casillas de ~80px con el nombre cortado.
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 md:gap-4">
              {brands.map((b) => (
                <Link
                  key={b.id}
                  to={`/catalogo?marca=${b.id}`}
                  className="flex h-[120px] flex-col items-center justify-center gap-1.5 rounded-lg border border-border bg-white px-4 no-underline transition-colors duration-150 hover:border-primary"
                >
                  {b.logo_url ? (
                    <img src={b.logo_url} alt={b.name} className="max-h-12 max-w-[70%] object-contain" />
                  ) : (
                    <span className="text-center font-display text-title font-medium text-ink800">{b.name}</span>
                  )}
                </Link>
              ))}
            </div>
          )}
          <div className="mt-12">
            <Link
              to="/catalogo"
              className="font-body text-body text-primary underline decoration-[rgba(0,87,217,.3)] underline-offset-4 hover:decoration-primary"
            >
              Ver el catálogo completo
            </Link>
          </div>
        </Container>
      </section>
    </>
  );
}
