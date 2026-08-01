import { memo } from "react";
import { Link } from "react-router-dom";
import clsx from "clsx";
import { Icon, ProductImage } from "@/shared/ui";
import { formatPrice } from "@/shared/lib/format";
import { useFavorites } from "@/shared/lib/useFavorites";
import { useWaLink } from "@/entities/settings/useSiteSettings";
import type { Product } from ".";

function WaIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.125.558 4.119 1.532 5.845L.057 23.428a.5.5 0 0 0 .609.61l5.652-1.48A11.945 11.945 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.795 9.795 0 0 1-5.003-1.373l-.36-.213-3.716.972.992-3.629-.235-.374A9.793 9.793 0 0 1 2.182 12C2.182 6.57 6.57 2.182 12 2.182c5.43 0 9.818 4.388 9.818 9.818 0 5.43-4.388 9.818-9.818 9.818z" />
    </svg>
  );
}

/**
 * Tarjeta de producto: **imagen a sangre con panel flotante**.
 *
 * La foto ocupa la tarjeta entera y los datos viven en un panel apoyado sobre
 * ella. No es la estructura más segura de las que se evaluaron -- depende de
 * que las fotos existan y sean decentes -- pero es la decisión de Lauti, y el
 * catálogo va a estar fotografiado.
 *
 * Tres cosas que la hacen funcionar mientras tanto:
 *
 *  * **La tarjeta mide siempre lo mismo.** El panel va posicionado, así que un
 *    nombre de tres líneas crece hacia adentro de la imagen en vez de estirar
 *    la tarjeta. Sin eso, una grilla de tarjetas a sangre queda dentada.
 *  * **El nombre se corta en dos líneas.** Misma razón, y además un nombre de
 *    cuatro líneas se comería la foto.
 *  * **Todo lo que va sobre la imagen es una pastilla opaca**, no texto suelto.
 *    Texto plano sobre una foto es legible hasta que aparece la primera foto
 *    con fondo claro, y eso no se puede controlar desde acá.
 */

const REVELADO =
  "opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 " +
  "group-focus-within:opacity-100";

const PILDORA =
  "inline-flex items-center gap-1.5 rounded-pill py-[5px] px-[11px] font-body text-[12px] font-semibold " +
  "cursor-pointer border shadow-[0_2px_8px_rgba(7,17,31,.12)] " +
  "transition-[opacity,background-color,color,border-color] duration-150 " +
  REVELADO;

export const ProductCard = memo(function ProductCard({
  product,
  onQuote,
}: {
  product: Product;
  onQuote: (p: Product) => void;
}) {
  const inStock = product.stock > 0;
  const escaso = inStock && product.stock <= 2;
  const { isFavorite, toggle } = useFavorites();
  const fav = isFavorite(product.id);
  const waLink = useWaLink();

  const waMsg = `Hola Crow! Me interesa este producto: ${product.name} (SKU: ${product.sku}). ¿Tienen disponibilidad?`;
  const detailUrl = `/producto/${product.id}`;
  const procedencia = [product.brand?.name, product.category?.name].filter(Boolean).join(" · ");

  return (
    <div className="group relative rounded-xl overflow-hidden border border-[#E7EDF4] hover:border-primary shadow-[0_1px_2px_rgba(13,23,40,.04)] hover:shadow-[0_10px_28px_rgba(0,87,217,.12)] transition-[border-color,box-shadow] duration-200">
      {/* La imagen ES la tarjeta: define el alto y no comparte espacio con
          nada. Casi cuadrada y apenas vertical, que es la proporción en la que
          entra un repuesto sin recortarlo raro. */}
      <Link to={detailUrl} className="block" tabIndex={-1} aria-hidden="true">
        <ProductImage
          name={product.name}
          sku={product.sku}
          category={product.category?.name}
          imageUrl={product.image_url}
          ratio={0.95}
        />
      </Link>

      {/* Stock: pastilla blanca y no texto sobre la foto. */}
      <span
        className={clsx(
          "absolute top-2.5 right-2.5 inline-flex items-center gap-[5px] rounded-pill py-1 px-2.5",
          "bg-[rgba(255,255,255,.94)] shadow-[0_1px_4px_rgba(7,17,31,.10)] font-mono text-[11px]",
          !inStock ? "text-textFaint" : escaso ? "text-warning" : "text-success",
        )}
        aria-label={inStock ? `${product.stock} en stock` : "Sin stock"}
      >
        <span
          className={clsx(
            "w-[5px] h-[5px] rounded-full shrink-0",
            !inStock ? "bg-borderStrong" : escaso ? "bg-warning" : "bg-success",
            escaso && "animate-[stockPulse_1.4s_ease-in-out_infinite]",
          )}
          aria-hidden="true"
        />
        {inStock ? product.stock : "0"}
      </span>

      {/* Favorito. `z-20`: el nombre estira un pseudo-elemento sobre toda la
          tarjeta para que se pueda clickear en cualquier punto, y ese overlay
          taparía este botón -- dejándolo muerto también en /cuenta/favoritos. */}
      <button
        type="button"
        aria-label={fav ? "Quitar de favoritos" : "Agregar a favoritos"}
        onClick={(e) => {
          e.preventDefault();
          toggle(product.id);
        }}
        className={clsx(
          "absolute z-20 top-2.5 left-2.5 w-[30px] h-[30px] rounded-full flex items-center justify-center border cursor-pointer",
          "shadow-[0_1px_4px_rgba(7,17,31,.10)] transition-[opacity,background-color,color,border-color] duration-150",
          fav
            ? "border-primary bg-primary text-white opacity-100"
            : "border-white bg-[rgba(255,255,255,.94)] text-textFaint hover:text-ink800 " + REVELADO,
        )}
      >
        <Icon name="star" size={14} />
      </button>

      {/* Acciones y panel comparten un contenedor anclado abajo: así las
          píldoras quedan siempre a la misma distancia del panel sin tener que
          adivinar cuánto mide -- y el panel mide distinto según el nombre. */}
      <div className="absolute left-2.5 right-2.5 bottom-2.5">
      <div className="absolute z-20 -top-11 left-0 right-0 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            onQuote(product);
          }}
          className={clsx(PILDORA, "bg-[rgba(255,255,255,.96)] border-white text-ink800 hover:text-primary")}
        >
          <Icon name="message" size={14} />
          Cotizar
        </button>

        <a
          href={waLink(waMsg)}
          target="_blank"
          rel="noreferrer"
          className={clsx(PILDORA, "no-underline bg-whatsapp border-whatsapp text-[#06371A] hover:bg-[#1fbb59]")}
        >
          <WaIcon />
          Consultar
        </a>
      </div>

      {/* El panel. Apoyado sobre la imagen, no debajo. */}
      <div className="relative rounded-[10px] bg-[rgba(255,255,255,.94)] backdrop-blur-[6px] border border-white shadow-[0_4px_16px_rgba(7,17,31,.10)] py-3 px-3.5">
        <div className="flex items-baseline justify-between gap-2 font-mono text-[10.5px] tracking-[.09em] uppercase text-textFaint mb-1.5">
          <span className="truncate">{procedencia}</span>
          <span className="shrink-0 normal-case tracking-normal text-[#B6C3D3]">{product.sku}</span>
        </div>

        {/* Dos líneas como máximo: un nombre largo se comería la foto, y una
            grilla donde cada panel mide distinto se ve dentada. */}
        <h3 className="font-body text-[14.5px] font-semibold leading-[1.32] text-ink900 mb-2.5 line-clamp-2">
          <Link to={detailUrl} className="no-underline text-inherit">
            {product.name}
          </Link>
        </h3>

        <div className="flex items-baseline justify-between gap-2">
          {product.price == null ? (
            // "A consultar" y no "Consultar": la píldora de WhatsApp de arriba
            // ya dice "Consultar", y la misma palabra en la misma tarjeta
            // significando dos cosas distintas -- un precio que no está y un
            // botón que abre un chat -- se lee mal. Además empareja con la
            // ficha de producto, que usa el mismo texto.
            <span className="font-body text-[15px] font-semibold text-textMuted">A consultar</span>
          ) : (
            <span className="whitespace-nowrap">
              {/* El símbolo más chico y gris hace que el ojo caiga en la cifra
                  y no en el peso. Unbounded acá sí: es UN número por tarjeta,
                  no una tipografía repetida en cada línea de texto. */}
              <span className="font-body text-[13.5px] font-semibold text-textFaint align-[2px]">$</span>
              <span className="font-display text-[20px] font-bold tracking-[-.04em] text-ink900">
                {formatPrice(product.price).replace(/^\$\s?/, "")}
              </span>
            </span>
          )}
          {/* Era un <span>. Al sacar el truco del enlace estirado -- que hacía
              clickeable toda la tarjeta -- este texto quedó pareciendo un
              botón sin serlo. `tabIndex={-1}`: el nombre de arriba ya lleva al
              mismo lado, y dos paradas de tabulación al mismo destino en cada
              una de las 48 tarjetas es ruido para quien navega con teclado. */}
          <Link
            to={detailUrl}
            tabIndex={-1}
            className="font-body text-[12.5px] font-semibold text-primary shrink-0 no-underline hover:text-primaryDark"
          >
            Ver ficha
            <span className="inline-block ml-1 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true">
              →
            </span>
          </Link>
        </div>
      </div>
      </div>
    </div>
  );
});
