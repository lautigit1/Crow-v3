import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { Container } from "@/shared/ui";

// Sin plazos: el comercio hoy atiende consultas y no garantiza tiempos de
// respuesta ni de entrega. La última línea de cada paso dice por dónde pasa
// (los canales y las formas de pago reales del sistema), no cuánto tarda.
const PASOS = [
  {
    quien: "Vos",
    titulo: "Buscás o nos consultás",
    detalle: "Encontrá el producto en el catálogo, o mandanos marca, modelo, año y la pieza que necesitás.",
    plazo: "Catálogo, WhatsApp o formulario de cotización",
  },
  {
    quien: "Nosotros",
    titulo: "Confirmamos precio y disponibilidad",
    detalle: "Te decimos qué hay para tu vehículo y, si existe, una alternativa más económica.",
    plazo: "Por WhatsApp o por email",
  },
  {
    quien: "Juntos",
    titulo: "Acordamos el pago y la entrega",
    detalle: "Elegís cómo pagar y si lo retirás por el local o coordinamos el envío.",
    plazo: "Transferencia, Mercado Pago, tarjeta o efectivo en el local",
  },
];

/**
 * El recorrido de un pedido, dibujado como recorrido.
 *
 * Una línea que une los tres momentos y, debajo de cada uno, quién actúa,
 * qué pasa y por qué canal.
 *
 * Es el único movimiento no disparado por el usuario en la página: la línea
 * se traza una vez al entrar en pantalla, para leer el orden. Con "reducir
 * movimiento" aparece ya dibujada.
 */
export function HowItWorks() {
  const ref = useRef<HTMLOListElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.35 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <section className="bg-ink900 py-20 md:py-28">
      <Container>
        <div className="mb-14 grid grid-cols-1 gap-4 md:mb-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] lg:items-end lg:gap-20">
          <h2 className="m-0 font-display text-display-md font-medium text-white md:text-display-lg">
            Cómo comprar
          </h2>
          <p className="m-0 font-body text-body text-textOnDarkFaint">
            Sin formularios largos ni catálogos que no cargan. Te atiende una persona que sabe de
            repuestos, de principio a fin.
          </p>
        </div>

        <ol ref={ref} className="relative m-0 grid list-none grid-cols-1 gap-12 p-0 md:grid-cols-3 md:gap-10">
          {/* La línea del recorrido: horizontal desde md, vertical en mobile. */}
          <span
            aria-hidden="true"
            className={clsx(
              "pointer-events-none absolute bg-[rgba(127,176,255,.45)] motion-safe:transition-transform motion-safe:duration-[1100ms] motion-safe:ease-out",
              "left-[5px] top-2 h-[calc(100%-1rem)] w-px origin-top md:left-0 md:right-0 md:top-[5px] md:h-px md:w-auto md:origin-left",
              visible ? "scale-100" : "max-md:scale-y-0 md:scale-x-0"
            )}
          />
          {PASOS.map((p, i) => (
            <li key={p.quien} className="relative pl-8 md:pl-0 md:pt-10">
              <span
                aria-hidden="true"
                className={clsx(
                  "absolute left-0 top-1.5 h-[11px] w-[11px] rounded-full border-2 border-[#7FB0FF] md:top-0",
                  i === PASOS.length - 1 ? "bg-[#7FB0FF]" : "bg-ink900"
                )}
              />
              <p className="m-0 font-body text-body-sm text-[#7FB0FF]">{p.quien}</p>
              <h3 className="m-0 mt-2 font-display text-display-sm font-medium text-white">{p.titulo}</h3>
              <p className="m-0 mt-3 max-w-[340px] font-body text-body-sm text-textOnDarkFaint">{p.detalle}</p>
              <p className="m-0 mt-5 border-t border-[rgba(255,255,255,.12)] pt-3 font-body text-body-sm font-medium text-white">
                {p.plazo}
              </p>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}
