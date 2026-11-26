import { Button, Container } from "@/shared/ui";
import { useSiteSettings, useWaLink } from "@/entities/settings/useSiteSettings";

const WA_MSG = "Hola Crow Repuestos, quiero consultar disponibilidad de un repuesto.";

/**
 * Cierre de la home: la misma decisión que el hero (WhatsApp o formulario),
 * ahora con los datos de contacto a la vista para quien prefiere llamar.
 *
 * Se sacaron el foco de luz que seguía al mouse, el degradé azul-verde sobre
 * "ahora.", la pastilla "¿Tenés el repuesto en mente?" con guion, los
 * botones que saltaban al hover y los íconos en círculos de tres colores
 * (azul, violeta, ámbar). El gris #EAEDF2 pasa a `surface`, el gris de la
 * paleta.
 */
export function CtaFinal({ onQuote }: { onQuote: () => void }) {
  const contact = useSiteSettings();
  const waLink = useWaLink();

  const items: { label: string; value: string; href?: string }[] = [
    { label: "Teléfono", value: contact.phone_display, href: `tel:+${contact.whatsapp_number}` },
    { label: "Email", value: contact.email, href: `mailto:${contact.email}` },
    { label: "Horario", value: contact.hours },
  ];

  return (
    <section className="border-t border-border bg-white py-20 md:py-28">
      <Container>
        <div className="grid grid-cols-1 gap-12 md:grid-cols-[1.4fr_1fr] md:gap-16">
          <div>
            <h2 className="mb-5 font-display text-display-md font-medium text-ink900 md:text-display-lg">
              ¿Preferís hablar con alguien?
            </h2>
            <p className="mb-9 max-w-[420px] font-body text-body text-textMuted">
              Llamanos o escribinos por WhatsApp en el horario de atención. Si ya tenés todos los
              datos del pedido, el formulario de cotización llega directo al mostrador.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button as="a" href={waLink(WA_MSG)} target="_blank" rel="noreferrer" variant="whatsapp" size="lg">
                Escribir por WhatsApp
              </Button>
              <Button onClick={onQuote} size="lg" variant="outline">
                Formulario de cotización
              </Button>
            </div>
          </div>

          <dl className="m-0 flex flex-col gap-5 self-end border-t border-borderStrong pt-8 md:border-l md:border-t-0 md:pl-10 md:pt-0">
            {items.map((item) => (
              <div key={item.label}>
                <dt className="mb-1 font-body text-caption text-textFaint">{item.label}</dt>
                <dd className="m-0 font-body text-body text-ink900">
                  {item.href ? (
                    <a href={item.href} className="underline decoration-borderStrong underline-offset-4 hover:text-primary hover:decoration-primary">
                      {item.value}
                    </a>
                  ) : (
                    item.value
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </Container>
    </section>
  );
}
