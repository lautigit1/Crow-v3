import { Link } from "react-router-dom";
import { Container, ProductImage } from "@/shared/ui";
import { formatPrice } from "@/shared/lib/format";
import { useProductsQuery } from "@/entities/product/queries";
import { useWaLink } from "@/entities/settings/useSiteSettings";
import type { Product } from "@/entities/product";

const procedencia = (p: Product) => [p.brand?.name, p.category?.name].filter(Boolean).join(" · ");

function Precio({ value, grande }: { value: number | null; grande?: boolean }) {
  if (value == null) {
    return <span className="font-body text-body-sm text-textMuted">Precio a consultar</span>;
  }
  return (
    <span className={grande ? "font-display text-[24px] font-medium tracking-[-0.03em] text-ink900" : "font-body text-body-sm font-medium text-ink900"}>
      {formatPrice(value)}
    </span>
  );
}

/**
 * Productos destacados: los que el comercio marca como destacados desde el
 * panel (`is_featured`), con sus datos reales.
 *
 * No es una grilla de tarjetas iguales. El primero va grande, con foto,
 * descripción y acciones; los siguientes, como una lista compacta al costado
 * que se lee de un vistazo. Así la sección tiene un foco y el resto acompaña.
 *
 * No se muestra el stock: el comercio hoy atiende consultas y el número del
 * sistema puede no reflejar la disponibilidad del día. El precio se presenta
 * como lo que es según los términos: de referencia.
 *
 * Si no hay destacados o la API falla, la sección no aparece: en la home un
 * "no hay productos" no le sirve a nadie, y el catálogo sigue a un enlace.
 */
export function FeaturedProducts() {
  const { data, isPending, isError } = useProductsQuery({ featured: true, limit: 4 });
  const waLink = useWaLink();
  const items = data?.items ?? [];

  if (isError || (!isPending && items.length === 0)) return null;

  const [principal, ...resto] = items;

  return (
    <section className="border-t border-border bg-surface py-16 md:py-24" aria-busy={isPending}>
      <Container>
        <div className="mb-10 flex flex-wrap items-end justify-between gap-x-10 gap-y-3 md:mb-12">
          <div>
            <h2 className="m-0 font-display text-display-md font-medium text-ink900 md:text-display-lg">
              Destacados del catálogo
            </h2>
            <p className="m-0 mt-3 font-body text-body-sm text-textMuted">
              Precios de referencia. Te confirmamos el valor final al consultar.
            </p>
          </div>
          <Link
            to="/catalogo"
            className="font-body text-body-sm text-primary underline decoration-[rgba(0,87,217,.3)] underline-offset-4 hover:decoration-primary"
          >
            Ver todo el catálogo
          </Link>
        </div>

        {isPending || !principal ? (
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]" aria-hidden="true">
            <div className="aspect-[4/3] rounded-lg bg-white" />
            <div className="flex flex-col gap-4">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-24 rounded-md bg-white" />
              ))}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-16">
            <article className="grid grid-cols-1 gap-6 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] md:gap-8 lg:grid-cols-1 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
              <Link to={`/producto/${principal.id}`} className="block overflow-hidden rounded-lg bg-white" tabIndex={-1} aria-hidden="true">
                <ProductImage
                  name={principal.name}
                  sku={principal.sku}
                  category={principal.category?.name}
                  imageUrl={principal.image_url}
                  ratio={1}
                  radius={0}
                />
              </Link>
              <div className="flex flex-col">
                {procedencia(principal) && (
                  <p className="m-0 font-body text-caption text-textFaint">{procedencia(principal)}</p>
                )}
                <h3 className="m-0 mt-2 font-display text-[21px] font-medium leading-[1.2] tracking-[-0.02em] text-ink900">
                  <Link to={`/producto/${principal.id}`} className="text-inherit no-underline hover:text-primary">
                    {principal.name}
                  </Link>
                </h3>
                {principal.description && (
                  <p className="m-0 mt-3 line-clamp-4 font-body text-body-sm text-textMuted">{principal.description}</p>
                )}
                <div className="mt-6">
                  <Precio value={principal.price} grande />
                </div>
                <p className="m-0 mt-6 flex flex-wrap gap-x-6 gap-y-2 font-body text-body-sm">
                  <Link
                    to={`/producto/${principal.id}`}
                    className="text-ink900 underline decoration-borderStrong underline-offset-4 hover:decoration-ink900"
                  >
                    Ver la ficha
                  </Link>
                  <a
                    href={waLink(`Hola Crow! Quiero consultar por: ${principal.name} (SKU: ${principal.sku}).`)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-ink900 underline decoration-whatsapp underline-offset-4 hover:text-[#0C7C3F]"
                  >
                    Consultar por WhatsApp
                  </a>
                </p>
              </div>
            </article>

            {resto.length > 0 && (
              <ul className="m-0 list-none border-t border-ink900 p-0">
                {resto.map((p) => (
                  <li key={p.id} className="border-b border-border">
                    <Link
                      to={`/producto/${p.id}`}
                      className="group grid grid-cols-[88px_minmax(0,1fr)] items-center gap-5 py-4 no-underline"
                    >
                      <span className="block overflow-hidden rounded-md bg-white">
                        <ProductImage name={p.name} sku={p.sku} category={p.category?.name} imageUrl={p.image_url} ratio={1} radius={0} compact />
                      </span>
                      <span className="min-w-0">
                        {procedencia(p) && (
                          <span className="block truncate font-body text-caption text-textFaint">{procedencia(p)}</span>
                        )}
                        <span className="mt-0.5 block line-clamp-2 font-body text-body-sm font-medium text-ink900 transition-colors duration-150 group-hover:text-primary">
                          {p.name}
                        </span>
                        <span className="mt-1 block">
                          <Precio value={p.price} />
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </Container>
    </section>
  );
}
