import { useState } from "react";
import { usePageMeta } from "@/shared/lib/usePageMeta";
import { Container, Button, Card } from "@/shared/ui";
import { QuoteModal } from "@/features/quote/QuoteModal";
import { contact, waLink } from "@/shared/config/contact";

const FAQ = [
  { q: "¿Hacen envíos?", a: "Sí. Despachamos a todo el país; coordinamos por WhatsApp según tu ubicación." },
  { q: "¿Cómo sé si tienen mi repuesto?", a: "Escribinos por WhatsApp o solicitá una cotización con tu vehículo y la pieza; te confirmamos disponibilidad." },
  { q: "¿Trabajan con talleres y flotas?", a: "Sí, manejamos condiciones especiales para taller y flota con escalas por volumen." },
  { q: "¿Las piezas tienen garantía?", a: "Cada referencia está respaldada por garantía de planta del fabricante." },
];

export function ContactPage() {
  usePageMeta("Contacto", "Contactá a Crow Repuestos por WhatsApp o cotización online. Mendoza ciudad, respuesta en menos de 1 hora.");
  const [open, setOpen] = useState(false);

  return (
    <>
      <section className="bg-ink900 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(820px_320px_at_85%_-20%,rgba(0,87,217,.2),transparent_60%)]" />
        <Container className="relative py-14 px-10">
          <h1 className="font-display text-[42px] font-extrabold tracking-[-.02em] text-white mb-3">Contacto</h1>
          <p className="font-body text-base leading-[1.6] text-textOnDark max-w-[560px]">
            Atención personalizada. Escribinos y un asesor te responde con disponibilidad y precio.
          </p>
        </Container>
      </section>

      <section className="bg-surface pt-14 pb-[90px]">
        <Container className="grid grid-cols-2 gap-10 items-start">
          <div className="flex flex-col gap-4">
            <Card>
              <div className="font-mono text-[11px] tracking-[.14em] text-primary mb-[18px]">DATOS DE CONTACTO</div>
              {[
                ["Teléfono", contact.phoneDisplay],
                ["Correo", contact.email],
                ["Horario", contact.hours],
                ["Ubicación", contact.city],
              ].map(([label, value], i, arr) => (
                <div key={label}>
                  <div className="flex flex-col gap-1">
                    <span className="font-mono text-[11px] text-textFaint">{label.toUpperCase()}</span>
                    <span className="font-body text-base font-semibold text-ink900">{value}</span>
                  </div>
                  {i < arr.length - 1 && <div className="h-px bg-border my-3.5" />}
                </div>
              ))}
              <div className="flex gap-3 mt-5">
                <Button as="a" href={waLink()} target="_blank" rel="noreferrer" variant="whatsapp">WhatsApp</Button>
                <Button onClick={() => setOpen(true)} variant="outline">Solicitar cotización</Button>
              </div>
            </Card>
          </div>

          <div>
            <h2 className="font-display text-2xl font-extrabold text-ink900 mb-[18px]">Preguntas frecuentes</h2>
            <div className="flex flex-col gap-3">
              {FAQ.map((f) => (
                <Card key={f.q} pad={18}>
                  <div className="font-display text-[15.5px] font-bold text-ink900 mb-1.5">{f.q}</div>
                  <p className="font-body text-sm leading-[1.55] text-textMuted">{f.a}</p>
                </Card>
              ))}
            </div>
          </div>
        </Container>
      </section>

      <QuoteModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
