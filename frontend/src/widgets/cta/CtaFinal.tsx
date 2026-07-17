import { useRef, useState, type MouseEvent } from "react";
import { motion } from "framer-motion";
import { Button, Container, Icon, Reveal, type IconName } from "@/shared/ui";
import { useSiteSettings, useWaLink } from "@/entities/settings/useSiteSettings";

const WA_MSG = "Hola Crow Repuestos, quiero consultar disponibilidad de un repuesto.";

// T10e/T10f/T10g/T10h fueron iterando color y composición pero todas
// compartían la misma premisa: un panel separado (con borde, sombra y/o
// esquinas redondeadas) flotando sobre el fondo de la sección. El usuario
// rechazó esa premisa en sí — no quiere "una caja encima del fondo".
// T10i saca la caja: el gris pasa a ser el fondo de la sección misma,
// full-bleed, igual que cualquier otra sección del sitio (Hero,
// CategoryGrid, Stats) — sin border-radius, sin shadow, sin panel
// separado. El layout de 2 columnas de T10g se mantiene, pero ahora es
// contenido dentro de la sección, no una tarjeta sobre ella; la columna
// derecha pasa de "panel blanco con fondo propio" a una simple división
// por línea (mismo patrón de `border-l`/`border-t` que ya usa
// `StatsSection` entre sus 4 columnas).
export function CtaFinal({ onQuote }: { onQuote: () => void }) {
  const sectionRef = useRef<HTMLElement>(null);
  const [spot, setSpot] = useState({ x: 30, y: 30 });
  const contact = useSiteSettings();
  const waLink = useWaLink();

  const CONTACT_ITEMS: { icon: IconName; label: string; href?: string; iconBg: string; iconText: string }[] = [
    { icon: "phone", label: contact.phone_display, href: `tel:+${contact.whatsapp_number}`, iconBg: "bg-[#EEF4FF]", iconText: "text-primary" },
    { icon: "mail",  label: contact.email,          href: `mailto:${contact.email}`,          iconBg: "bg-[#F5F3FF]", iconText: "text-[#7C3AED]" },
    { icon: "clock", label: contact.hours,                                                     iconBg: "bg-[#FFFBEB]", iconText: "text-[#D97706]" },
  ];

  const handleMouseMove = (e: MouseEvent<HTMLElement>) => {
    const rect = sectionRef.current?.getBoundingClientRect();
    if (!rect) return;
    setSpot({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    });
  };

  return (
    <section
      ref={sectionRef}
      onMouseMove={handleMouseMove}
      className="relative overflow-hidden border-t border-b border-border bg-[#EAEDF2] py-16 md:py-24"
    >
      {/* Spotlight que sigue al mouse, acotado a la sección */}
      <motion.div
        className="pointer-events-none absolute inset-0 hidden md:block"
        animate={{ background: `radial-gradient(520px 360px at ${spot.x}% ${spot.y}%, rgba(0,87,217,.08), transparent 65%)` }}
        transition={{ duration: 0.35, ease: "easeOut" }}
      />

      <Container className="relative">
        <Reveal className="grid grid-cols-1 md:grid-cols-[1.3fr_1fr] md:gap-12">
          {/* Columna izquierda — mensaje + CTAs, alineado a la izquierda
              (no centrado — es lo que rompe el look "bloque genérico") */}
          <div>
            <div className="mb-6 inline-flex items-center gap-2">
              <div className="h-px w-5 bg-border" />
              <span className="font-mono text-[10.5px] font-bold uppercase tracking-[0.18em] text-textFaint">
                ¿Tenés el repuesto en mente?
              </span>
            </div>

            <h2 className="mb-6 font-display text-[32px] font-extrabold leading-[1.05] tracking-[-0.03em] text-ink900 md:text-[44px]">
              Cotizá
              <br />
              <span className="inline-block bg-[linear-gradient(95deg,#0057D9_0%,#25D366_100%)] bg-clip-text pb-[0.1em] text-transparent [-webkit-text-fill-color:transparent]">
                ahora.
              </span>
            </h2>

            <p className="mb-9 max-w-[380px] font-body text-[15px] leading-[1.65] text-textMuted">
              Escribinos con tu vehículo y la pieza que buscás. Un asesor
              real te responde con precio y disponibilidad.
            </p>

            <div className="flex flex-wrap gap-3">
              <motion.span whileHover={{ y: -3 }} whileTap={{ scale: 0.96 }} className="inline-block">
                <Button as="a" href={waLink(WA_MSG)} target="_blank" rel="noreferrer" variant="whatsapp" size="lg">
                  Escribir por WhatsApp
                </Button>
              </motion.span>
              <motion.span whileHover={{ y: -3 }} whileTap={{ scale: 0.96 }} className="inline-block">
                <Button onClick={onQuote} size="lg" variant="outline">
                  Formulario de cotización
                </Button>
              </motion.span>
            </div>
          </div>

          {/* Columna derecha — datos de contacto, separados por una línea
              (mismo patrón que las columnas de StatsSection), no por un
              panel con fondo propio */}
          <div className="mt-10 flex flex-col justify-center gap-5 border-t border-border pt-8 md:mt-0 md:border-l md:border-t-0 md:pl-10 md:pt-0">
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-textFaint">
              Contacto directo
            </span>
            {CONTACT_ITEMS.map((item) => (
              <ContactItem key={item.label} {...item} />
            ))}
          </div>
        </Reveal>
      </Container>
    </section>
  );
}

function ContactItem({ icon, label, href, iconBg, iconText }: { icon: IconName; label: string; href?: string; iconBg: string; iconText: string }) {
  const content = (
    <>
      <span className={`flex h-8 w-8 items-center justify-center rounded-full ${iconBg} ${iconText}`}>
        <Icon name={icon} size={14} />
      </span>
      <span className="font-body text-[13px] font-medium text-ink800">{label}</span>
    </>
  );

  if (href) {
    return (
      <a href={href} className="inline-flex items-center gap-2.5 no-underline transition-opacity duration-150 hover:opacity-70">
        {content}
      </a>
    );
  }
  return <span className="inline-flex items-center gap-2.5">{content}</span>;
}
