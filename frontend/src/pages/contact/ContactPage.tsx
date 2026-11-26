import { useState, type ReactNode } from "react";
import { usePageMeta } from "@/shared/lib/usePageMeta";
import { Container, Button, Icon, PageHeader, type IconName } from "@/shared/ui";
import { QuoteModal } from "@/features/quote/QuoteModal";
import { useSiteSettings, useWaLink } from "@/entities/settings/useSiteSettings";

const FAQ = [
  { q: "¿Hacen envíos?", a: "El envío o el retiro se coordinan en cada consulta, según tu ubicación." },
  { q: "¿Cómo sé si tienen mi repuesto?", a: "Escribinos por WhatsApp o solicitá una cotización con tu vehículo y la pieza; te confirmamos disponibilidad." },
  { q: "¿Trabajan con talleres y flotas?", a: "Sí, manejamos condiciones especiales para taller y flota con escalas por volumen." },
  { q: "¿Las piezas tienen garantía?", a: "Sí: tienen la garantía legal y, cuando corresponde, la del fabricante. Las condiciones se informan al confirmar la compra." },
];

/**
 * Fila de dato de contacto.
 *
 * Antes cada dato era etiqueta en Fira Mono 11px mayúscula sobre el valor,
 * separados por una línea: cuatro bloques idénticos que había que leer en
 * orden para saber cuál era cuál. Con un ícono al costado, el teléfono se
 * distingue del mail antes de leer una sola palabra -- y la etiqueta puede
 * bajar de jerarquía en vez de competir con el dato.
 *
 * `href` opcional: teléfono y mail se vuelven accionables (marcar, escribir);
 * horario y dirección son texto y se renderizan como <div>, sin el afford
 * visual de un enlace que no lleva a ninguna parte.
 */
function ContactRow({
  icon, label, value, href, trailing,
}: {
  icon: IconName;
  label: string;
  value: string;
  href?: string;
  trailing?: ReactNode;
}) {
  const inner = (
    <>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primarySoft text-primary transition-colors duration-150 group-hover:bg-primary group-hover:text-white">
        <Icon name={icon} size={17} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-body text-[12px] font-medium leading-none text-textFaint">{label}</span>
        <span className="mt-[5px] block truncate font-body text-[15px] font-medium leading-tight text-ink900">
          {value}
        </span>
      </span>
      {trailing}
    </>
  );

  const className = "group flex items-center gap-3.5 py-4 no-underline";

  return href ? (
    <a href={href} className={className} title={value}>{inner}</a>
  ) : (
    <div className={className}>{inner}</div>
  );
}

export function ContactPage() {
  usePageMeta("Contacto", "Contactá a Crow Repuestos por WhatsApp o cotización online. Teléfono, email y horario de atención en Mendoza.");
  const [open, setOpen] = useState(false);
  const contact = useSiteSettings();
  const waLink = useWaLink();

  return (
    <>
      {/* La tarjeta "Abierto ahora / Respondemos en menos de una hora" que iba
          a la derecha se sacó: el comercio hoy atiende consultas y no garantiza
          plazos. Queda el horario de atención, que es un dato. */}
      <PageHeader
        title="Contacto"
        lead="Escribinos con tu vehículo y la pieza que buscás. Te responde un asesor real, con disponibilidad y precio, no un bot."
      >
        <p className="m-0 max-w-[260px] font-body text-body-sm text-textOnDarkFaint">
          Atención: <span className="text-white">{contact.hours}</span>
        </p>
      </PageHeader>

      {/* ── Cuerpo ──
          Antes `grid-cols-2` fijo: en el desktop partía el ancho en mitades
          iguales, dejando la tarjeta de contacto sobrada de espacio y las
          preguntas apretadas, y en un teléfono mantenía las dos columnas
          igual (sin breakpoint), aplastando las dos. Ahora la tarjeta es una
          columna lateral de ancho acotado y las preguntas se quedan con el
          resto, apilándose en una sola columna abajo de `lg`. */}
      <section className="bg-surface pb-24 pt-14 md:pt-20">
        <Container className="grid items-start gap-8 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)] lg:gap-12">

          <div className="rounded-lg border border-border bg-white p-6">
            <h2 className="m-0 font-display text-title font-medium text-ink900">
              Datos de contacto
            </h2>

            <div className="mt-2 divide-y divide-border">
              <ContactRow icon="phone" label="Teléfono" value={contact.phone_display} href={`tel:${contact.phone_display.replace(/\s/g, "")}`} />
              <ContactRow icon="mail" label="Correo" value={contact.email} href={`mailto:${contact.email}`} />
              <ContactRow
                icon="clock"
                label="Horario"
                value={contact.hours}
              />
              <ContactRow icon="mapPin" label="Ubicación" value={contact.address} />
            </div>

            {/* Apilados y a ancho completo en vez de lado a lado: uno al lado
                del otro quedaban dos botones angostos de distinto tamaño (el
                texto de cada uno define su ancho), que es justo lo que hace
                que un par de acciones se lea desprolijo. */}
            <div className="mt-6 flex flex-col gap-2.5">
              <Button as="a" href={waLink()} target="_blank" rel="noreferrer" variant="whatsapp" size="lg" fullWidth>
                Escribir por WhatsApp
              </Button>
              <Button onClick={() => setOpen(true)} variant="outline" size="lg" fullWidth>
                Solicitar cotización
              </Button>
            </div>
          </div>

          <div>
            <h2 className="m-0 mb-6 font-display text-display-sm font-medium text-ink900 md:text-display-md">
              Preguntas frecuentes
            </h2>
            {/* Lista con filetes y no cuatro tarjetas: no son elementos
                clickeables, y la sombra al hover sugería que sí. */}
            <div className="flex flex-col border-t border-ink900">
              {FAQ.map((f) => (
                <div key={f.q} className="border-b border-border py-6">
                  <h3 className="m-0 mb-2 font-body text-body font-medium text-ink900">
                    {f.q}
                  </h3>
                  {/* 1.7 de interlineado y `textMuted` en vez de 1.55: una
                      respuesta de dos renglones se lee de un saque, no como
                      un bloque compacto que hay que descifrar. */}
                  <p className="m-0 font-body text-body-sm text-textMuted">{f.a}</p>
                </div>
              ))}
            </div>
          </div>
        </Container>
      </section>

      <QuoteModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
