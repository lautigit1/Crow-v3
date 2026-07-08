import { useEffect, useState } from "react";
import { usePageMeta } from "@/shared/lib/usePageMeta";
import { Link } from "react-router-dom";
import { Container, Button, CenteredSpinner, EmptyState } from "@/shared/ui";
import { brandApi, type Brand } from "@/entities/brand";

export function BrandsPage() {
  usePageMeta("Marcas", "Todas las marcas de repuestos disponibles en Crow Repuestos — Mendoza.");
  const [brands, setBrands] = useState<Brand[] | null>(null);

  useEffect(() => {
    brandApi.list().then(setBrands).catch(() => setBrands([]));
  }, []);

  return (
    <>
      <section className="bg-ink900 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(820px_320px_at_85%_-20%,rgba(0,87,217,.2),transparent_60%)]" />
        <Container className="relative py-14 px-10">
          <h1 className="font-display text-[42px] font-extrabold tracking-[-.02em] text-white mb-3">
            Marcas aliadas
          </h1>
          <p className="font-body text-base leading-[1.6] text-textOnDark max-w-[560px]">
            Trabajamos con fabricantes reconocidos. Cada referencia que distribuimos está respaldada por garantía de planta.
          </p>
        </Container>
      </section>

      <section className="bg-surface pt-[60px] pb-[90px] min-h-[50vh]">
        <Container>
          {brands === null ? (
            <CenteredSpinner label="Cargando marcas…" />
          ) : brands.length === 0 ? (
            <EmptyState title="Aún no hay marcas cargadas" message="Agregá marcas desde el panel de administración." />
          ) : (
            <div className="grid grid-cols-4 gap-4">
              {brands.map((b) => (
                <Link
                  key={b.id}
                  to={`/catalogo?marca=${b.id}`}
                  className="h-[130px] bg-white border border-border rounded-[10px] flex flex-col items-center justify-center gap-1.5 no-underline [transition:border-color_.18s,transform_.18s] hover:border-primary hover:-translate-y-[3px]"
                >
                  {b.logo_url ? (
                    <img src={b.logo_url} alt={b.name} className="max-h-12 max-w-[70%] object-contain" />
                  ) : (
                    <span className="font-display font-extrabold text-xl text-ink800">{b.name}</span>
                  )}
                </Link>
              ))}
            </div>
          )}
          <div className="mt-11 text-center">
            <Button as={Link} to="/catalogo">Ver catálogo completo →</Button>
          </div>
        </Container>
      </section>
    </>
  );
}
