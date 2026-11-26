import { useState } from "react";
import clsx from "clsx";
import { usePageMeta } from "@/shared/lib/usePageMeta";
import { Button, Container, PageHeader } from "@/shared/ui";
import { useWaLink } from "@/entities/settings/useSiteSettings";

const FAQS = [
  {
    category: "Pedidos y stock",
    items: [
      {
        q: "¿Cómo sé si tienen el repuesto que necesito?",
        a: "Escribinos por WhatsApp con la marca, modelo y año de tu vehículo y el repuesto que buscás. Te confirmamos disponibilidad y precio.",
      },
      {
        q: "¿Trabajan con número de parte?",
        a: "Sí. Si tenés el número de parte del fabricante, mandáselo directamente: es la forma más rápida de confirmar compatibilidad.",
      },
      {
        q: "¿Qué pasa si no encuentro el repuesto en el catálogo?",
        a: "El catálogo online no refleja el 100% del stock. Consultanos igual, tenemos acceso a referencias que no están publicadas.",
      },
    ],
  },
  {
    category: "Envíos y entrega",
    items: [
      {
        q: "¿Hacen entregas a domicilio?",
        a: "El envío o el retiro se coordinan en cada consulta, según tu ubicación. Escribinos por WhatsApp para acordarlo.",
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
        a: "Sí. Todos tienen la garantía legal y, cuando corresponde, la del fabricante. Las condiciones de cada producto se informan al confirmar la compra.",
      },
      {
        q: "¿Qué hago si el repuesto no es el correcto?",
        a: "Contactanos con el número de pedido o de cotización. Si el error fue nuestro, hacemos el cambio sin costo. En las compras a distancia, además, tenés el derecho de revocación que explican los términos y condiciones.",
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
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-4 py-5 bg-transparent border-none cursor-pointer text-left"
      >
        <span className="font-body text-body font-medium text-ink900">
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
        <p className="font-body text-body-sm text-textMuted mt-0 mb-5 mx-0 pr-10">
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
      <PageHeader title="Preguntas frecuentes" lead="Si no encontrás lo que buscás, escribinos por WhatsApp." />

      {/* Content */}
      <section className="bg-surface py-16 pb-24">
        <Container>
          <div className="grid grid-cols-1 max-w-[720px] mx-auto gap-12">
            {FAQS.map((group) => (
              <div key={group.category}>
                <h2 className="m-0 mb-4 font-display text-display-sm font-medium text-ink900">
                  {group.category}
                </h2>
                <div className="border-t border-ink900">
                  {group.items.map((item) => (
                    <AccordionItem key={item.q} q={item.q} a={item.a} />
                  ))}
                </div>
              </div>
            ))}

            {/* CTA */}
            <div className="border-t border-border pt-10 flex flex-col items-start gap-4">
              <p className="font-body text-body text-textMuted m-0">
                ¿Tenés una duda que no está acá?
              </p>
              <Button as="a" href={waLink("Hola Crow! Tengo una consulta.")} target="_blank" rel="noreferrer" variant="whatsapp">
                Escribinos por WhatsApp
              </Button>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
