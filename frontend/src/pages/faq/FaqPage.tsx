import { useState } from "react";
import clsx from "clsx";
import { usePageMeta } from "@/shared/lib/usePageMeta";
import { Container } from "@/shared/ui";
import { useWaLink } from "@/entities/settings/useSiteSettings";

const FAQS = [
  {
    category: "Pedidos y stock",
    items: [
      {
        q: "¿Cómo sé si tienen el repuesto que necesito?",
        a: "Escribinos por WhatsApp con la marca, modelo y año de tu vehículo y el repuesto que buscás. Te confirmamos disponibilidad y precio en menos de una hora.",
      },
      {
        q: "¿Trabajan con número de parte?",
        a: "Sí. Si tenés el número de parte del fabricante, mandáselo directamente — es la forma más rápida de confirmar compatibilidad.",
      },
      {
        q: "¿Qué pasa si no encuentro el repuesto en el catálogo?",
        a: "El catálogo online no refleja el 100% del stock. Consultanos igual — tenemos acceso a referencias que no están publicadas.",
      },
    ],
  },
  {
    category: "Envíos y entrega",
    items: [
      {
        q: "¿Hacen entregas a domicilio?",
        a: "Sí. Entregamos en Mendoza ciudad el mismo día. Coordinamos horario por WhatsApp.",
      },
      {
        q: "¿Envían a otras provincias?",
        a: "Sí, despachamos a todo el país. El plazo y costo dependen de la distancia. Consultanos antes de hacer el pedido.",
      },
      {
        q: "¿Puedo retirar en el local?",
        a: "Claro. Estamos en Mendoza ciudad, de lunes a sábado de 8 a 18 hs. Avisanos antes para tener el pedido listo.",
      },
    ],
  },
  {
    category: "Garantía y devoluciones",
    items: [
      {
        q: "¿Los repuestos tienen garantía?",
        a: "Todos los productos tienen garantía de fábrica del fabricante. Sin letra chica.",
      },
      {
        q: "¿Qué hago si el repuesto no es el correcto?",
        a: "Contactanos dentro de las 48 horas. Si el error fue de nuestra parte, hacemos el cambio sin costo.",
      },
    ],
  },
  {
    category: "Clientes especiales",
    items: [
      {
        q: "¿Trabajan con talleres mecánicos?",
        a: "Sí. Tenemos condiciones especiales para talleres con compras frecuentes. Escribinos para coordinar.",
      },
      {
        q: "¿Manejan precios por volumen para flotas?",
        a: "Sí. Para flotas de empresas ofrecemos precios escalonados según volumen mensual. Consultanos.",
      },
    ],
  },
];

function AccordionItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-border">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-4 py-5 bg-transparent border-none cursor-pointer text-left"
      >
        <span className="font-display text-[15px] font-bold tracking-[-.01em] text-ink900 leading-[1.4]">
          {q}
        </span>
        <span
          className={clsx(
            "shrink-0 w-6 h-6 rounded-full border-[1.5px] flex items-center justify-center transition-all duration-150",
            open ? "border-primary bg-primarySoft text-primary" : "border-border bg-transparent text-textFaint"
          )}
        >
          <svg
            width={12} height={12} viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"
            className={clsx("transition-transform duration-150", open && "rotate-45")}
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </span>
      </button>

      {open && (
        <p className="font-body text-[14.5px] leading-[1.7] text-textMuted mt-0 mb-5 mx-0 pr-10">
          {a}
        </p>
      )}
    </div>
  );
}

export function FaqPage() {
  usePageMeta(
    "Preguntas frecuentes",
    "Respondemos las dudas más comunes sobre pedidos, envíos, garantías y atención en Crow Repuestos.",
  );
  const waLink = useWaLink();

  return (
    <>
      {/* Header */}
      <section className="bg-ink900 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(820px_320px_at_85%_-20%,rgba(0,87,217,.2),transparent_60%)]" />
        <Container className="relative py-14 px-10">
          <div className="font-mono text-[10.5px] font-medium tracking-[.16em] text-[rgba(127,176,255,.7)] uppercase mb-4">
            — FAQ
          </div>
          <h1 className="font-display text-[38px] font-extrabold tracking-[-.025em] text-white mb-3">
            Preguntas frecuentes
          </h1>
          <p className="font-body text-base leading-[1.6] text-[rgba(255,255,255,.45)] max-w-[480px] m-0">
            Si no encontrás lo que buscás, escribinos por WhatsApp.
          </p>
        </Container>
      </section>

      {/* Content */}
      <section className="bg-surface py-16 pb-24">
        <Container>
          <div className="grid grid-cols-1 max-w-[720px] mx-auto gap-12">
            {FAQS.map((group) => (
              <div key={group.category}>
                <div className="font-mono text-[10.5px] font-bold tracking-[.14em] text-primary uppercase mb-1">
                  {group.category}
                </div>
                <div className="border-t-2 border-ink900">
                  {group.items.map((item) => (
                    <AccordionItem key={item.q} q={item.q} a={item.a} />
                  ))}
                </div>
              </div>
            ))}

            {/* CTA */}
            <div className="border-t border-border pt-10 flex flex-col items-start gap-4">
              <p className="font-body text-[15px] text-textMuted m-0 leading-[1.6]">
                ¿Tenés una duda que no está acá?
              </p>
              <a
                href={waLink("Hola Crow! Tengo una consulta.")}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 bg-primary text-white font-body text-sm font-semibold py-[11px] px-5 rounded-md no-underline"
              >
                Escribinos por WhatsApp
              </a>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
