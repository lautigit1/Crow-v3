import { useState, type ReactNode } from "react";
import { usePageMeta } from "@/shared/lib/usePageMeta";
import { Container, Button, Icon, type IconName } from "@/shared/ui";
import { QuoteModal } from "@/features/quote/QuoteModal";
import { useSiteSettings, useWaLink } from "@/entities/settings/useSiteSettings";
import { useIsOpenNow } from "@/shared/lib/useIsOpenNow";

const FAQ = [
  { q: "¿Hacen envíos?", a: "Sí. Despachamos a todo el país; coordinamos por WhatsApp según tu ubicación." },
  { q: "¿Cómo sé si tienen mi repuesto?", a: "Escribinos por WhatsApp o solicitá una cotización con tu vehículo y la pieza; te confirmamos disponibilidad." },
  { q: "¿Trabajan con talleres y flotas?", a: "Sí, manejamos condiciones especiales para taller y flota con escalas por volumen." },
  { q: "¿Las piezas tienen garantía?", a: "Cada referencia está respaldada por garantía de planta del fabricante." },
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
        <span className="mt-[5px] block truncate font-body text-[15.5px] font-semibold leading-tight tracking-[-.01em] text-ink900">
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
  usePageMeta("Contacto", "Contactá a Crow Repuestos por WhatsApp o cotización online. Mendoza ciudad, respuesta en menos de 1 hora.");
  const [open, setOpen] = useState(false);
  const contact = useSiteSettings();
  const waLink = useWaLink();
  const isOpenNow = useIsOpenNow();

  return (
    <>
      {/* ── Hero ──
          El título ocupaba el borde izquierdo y dejaba dos tercios de una
          franja de 290px vacíos. Ahora el bloque de texto convive con una
          tarjeta de estado a la derecha: el vacío pasa a ser espacio entre
          dos cosas en vez de espacio sobrante. */}
      <section className="relative overflow-hidden bg-ink900">
        <div className="absolute inset-0 bg-[radial-gradient(760px_300px_at_88%_-25%,rgba(0,87,217,.16),transparent_62%)]" />
        <Container className="relative py-16">
          <div className="flex flex-wrap items-end justify-between gap-x-12 gap-y-8">
            <div className="max-w-[560px]">
              <span className="font-mono text-[11px] font-bold uppercase tracking-[.16em] text-[#6FA3E0]">
                Atención directa
              </span>
              <h1 className="mb-4 mt-3.5 font-display text-[46px] font-black leading-[1.02] tracking-[-.025em] text-white">
                Contacto
              </h1>
              <p className="m-0 font-body text-[16.5px] leading-[1.65] text-[#8AA3BC]">
                Escribinos con tu vehículo y la pieza que buscás. Te responde un asesor real,
                con disponibilidad y precio — no un bot.
              </p>
            </div>

            <div className="w-full max-w-[260px] rounded-lg border border-[rgba(255,255,255,.1)] bg-[rgba(255,255,255,.04)] p-5">
              <div className="flex items-center gap-2.5">
                <span className={`h-2 w-2 shrink-0 rounded-full ${isOpenNow ? "bg-[#4ADE80]" : "bg-[#F87171]"}`} />
                <span className="font-body text-[14px] font-semibold text-white">
                  {isOpenNow ? "Abierto ahora" : "Cerrado ahora"}
                </span>
              </div>
              <p className="m-0 mt-2.5 font-body text-[13.5px] leading-[1.55] text-[#8AA3BC]">
                {isOpenNow
                  ? "Respondemos en menos de una hora dentro del horario de atención."
                  : "Dejanos el mensaje igual: lo respondemos apenas abrimos."}
              </p>
            </div>
          </div>
        </Container>
      </section>

      {/* ── Cuerpo ──
          Antes `grid-cols-2` fijo: en el desktop partía el ancho en mitades
          iguales, dejando la tarjeta de contacto sobrada de espacio y las
          preguntas apretadas, y en un teléfono mantenía las dos columnas
          igual (sin breakpoint), aplastando las dos. Ahora la tarjeta es una
          columna lateral de ancho acotado y las preguntas se quedan con el
          resto, apilándose en una sola columna abajo de `lg`. */}
      <section className="bg-surface pb-[90px] pt-14">
        <Container className="grid items-start gap-8 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)] lg:gap-12">

          <div className="rounded-lg border border-border bg-white p-6 shadow-[0_1px_3px_rgba(13,23,40,.05)]">
            <h2 className="m-0 font-display text-[17px] font-extrabold tracking-[-.02em] text-ink900">
              Datos de contacto
            </h2>

            <div className="mt-2 divide-y divide-border">
              <ContactRow icon="phone" label="Teléfono" value={contact.phone_display} href={`tel:${contact.phone_display.replace(/\s/g, "")}`} />
              <ContactRow icon="mail" label="Correo" value={contact.email} href={`mailto:${contact.email}`} />
              <ContactRow
                icon="clock"
                label="Horario"
                value={contact.hours}
                trailing={
                  <span className={`shrink-0 rounded-pill px-2.5 py-1 font-body text-[11.5px] font-semibold ${isOpenNow ? "bg-successSoft text-success" : "bg-surface text-textFaint"}`}>
                    {isOpenNow ? "Abierto" : "Cerrado"}
                  </span>
                }
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
            <h2 className="m-0 mb-5 font-display text-[26px] font-black tracking-[-.025em] text-ink900">
              Preguntas frecuentes
            </h2>
            <div className="flex flex-col gap-3">
              {FAQ.map((f) => (
                <div
                  key={f.q}
                  className="rounded-lg border border-border bg-white p-6 transition-[border-color,box-shadow] duration-150 hover:border-borderStrong hover:shadow-[0_4px_16px_rgba(13,23,40,.06)]"
                >
                  <h3 className="m-0 mb-2 font-display text-[16px] font-bold leading-snug tracking-[-.015em] text-ink900">
                    {f.q}
                  </h3>
                  {/* 1.7 de interlineado y `textMuted` en vez de 1.55: una
                      respuesta de dos renglones se lee de un saque, no como
                      un bloque compacto que hay que descifrar. */}
                  <p className="m-0 font-body text-[14.5px] leading-[1.7] text-textMuted">{f.a}</p>
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
