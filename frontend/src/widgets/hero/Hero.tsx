import { motion, useReducedMotion } from "framer-motion";
import { waLink } from "@/shared/config/contact";
import { Container, Icon, type IconName } from "@/shared/ui";

// Spring compartido por los dos CTAs — mismo "peso" de rebote en ambos.
const CTA_SPRING = { type: "spring", stiffness: 400, damping: 24 } as const;

const CHIPS: { icon: IconName; label: string }[] = [
  { icon: "shieldCheck", label: "Garantía incluida" },
  { icon: "clock", label: "Respuesta en < 1 hora" },
  { icon: "wrench", label: "Asesoría técnica" },
];

const WA_MSG = "Hola Crow Repuestos! Necesito consultar un repuesto.";

// Per-dot animation delay for the typing indicator -- STEPS is a fixed
// 3-item literal ([0, 1, 2]), so each delay is precomputed as its own
// static Tailwind class instead of an interpolated arbitrary value.
const DOT_ANIM = [
  "animate-[pulse-glow_1.2s_0s_ease_infinite]",
  "animate-[pulse-glow_1.2s_0.2s_ease_infinite]",
  "animate-[pulse-glow_1.2s_0.4s_ease_infinite]",
];

export function Hero({ onQuote }: { onQuote: () => void }) {
  const reduceMotion = useReducedMotion();

  return (
    <section className="bg-ink900 relative overflow-hidden">
      {/* Background layers */}
      <div className="absolute inset-0 bg-[radial-gradient(900px_500px_at_75%_-5%,rgba(0,87,217,.28),transparent_60%),radial-gradient(600px_400px_at_10%_110%,rgba(0,47,130,.2),transparent_60%),linear-gradient(180deg,rgba(7,17,31,0)_50%,rgba(7,17,31,.75))]" />

      <Container className="relative">
        <div className="grid grid-cols-1 md:grid-cols-[1.1fr_.9fr] gap-0 md:gap-16 items-center pt-[60px] pb-[52px] md:pt-24 md:pb-[88px] md:min-h-[560px]">
          {/* ── Copy ─────────────────────────────── */}
          <div className="animate-[fadeUp_.6s_ease_both]">
            {/* Eyebrow */}
            <div className="inline-flex items-center gap-2 bg-[rgba(0,87,217,.18)] border border-[rgba(0,87,217,.35)] rounded-full py-[5px] pl-2.5 pr-3.5 mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-[pulse-glow_2s_ease_infinite]" />
              <span className="font-mono text-[11px] font-semibold tracking-[.1em] text-[#7FB0FF]">
                REPUESTOS · LUBRICANTES · MENDOZA
              </span>
            </div>

            <h1 className="font-display text-[30px] md:text-[48px] font-extrabold leading-[1.1] tracking-[-.03em] text-white mb-[22px]">
              Todo para tu
              <br />
              vehículo en
              <br />
              <motion.span
                className="bg-[length:200%_auto] bg-[linear-gradient(95deg,#7FB0FF_0%,#0057D9_35%,#7FB0FF_70%,#0057D9_100%)] bg-clip-text text-transparent [-webkit-text-fill-color:transparent] inline-block pb-[0.12em]"
                animate={reduceMotion ? undefined : { backgroundPosition: ["0% 50%", "200% 50%"] }}
                transition={{ duration: 7, repeat: Infinity, ease: "linear" }}
              >
                un solo lugar.
              </motion.span>
            </h1>

            <p className="font-body text-[17.5px] leading-[1.65] text-textOnDark max-w-[490px] mb-[38px]">
              Repuestos, lubricantes, baterías y detailing para autos, motos y
              camiones. Atención personalizada en Mendoza ciudad.
            </p>

            <div className="flex gap-3.5 items-center flex-wrap">
              {/* WhatsApp CTA — primary */}
              <motion.a
                href={waLink(WA_MSG)}
                target="_blank"
                rel="noreferrer"
                whileHover={{ y: -3, boxShadow: "0 10px 32px rgba(37,211,102,.45)" }}
                whileTap={{ scale: 0.96 }}
                transition={CTA_SPRING}
                className="inline-flex items-center gap-2.5 bg-[#25D366] text-white font-display text-[15px] font-bold rounded-full py-[13px] px-[26px] no-underline shadow-[0_6px_24px_rgba(37,211,102,.35)]"
              >
                {/* WhatsApp SVG icon */}
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                Escribir por WhatsApp
              </motion.a>

              <motion.button
                onClick={onQuote}
                whileHover={{ y: -3, backgroundColor: "rgba(255,255,255,.12)" }}
                whileTap={{ scale: 0.96 }}
                transition={CTA_SPRING}
                className="inline-flex items-center gap-2 bg-[rgba(255,255,255,.06)] text-white border border-[rgba(255,255,255,.22)] font-display text-[15px] font-bold rounded-full py-[13px] px-[26px] cursor-pointer [backdrop-filter:blur(4px)]"
              >
                Pedir cotización
              </motion.button>
            </div>

            <div className="flex gap-6 flex-wrap mt-9">
              {CHIPS.map((c) => (
                <span key={c.label} className="inline-flex items-center gap-2 font-body text-[13px] text-textOnDarkFaint">
                  <span className="text-primary">
                    <Icon name={c.icon} size={15} />
                  </span>
                  {c.label}
                </span>
              ))}
            </div>
          </div>

          {/* ── WhatsApp mockup — hidden on mobile ── */}
          <div className="hidden md:block relative animate-[fadeUp_.75s_.15s_ease_both]">
            {/* Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] h-[340px] rounded-full bg-[radial-gradient(circle,rgba(37,211,102,.25)_0%,transparent_70%)] blur-[48px] pointer-events-none" />

            {/* Chat window */}
            <div className="relative rounded-[20px] overflow-hidden shadow-[0_32px_80px_rgba(0,0,0,.5)] border border-[rgba(255,255,255,.08)]">
              {/* Header */}
              <div className="bg-[#075E54] py-3.5 px-[18px] flex items-center gap-3">
                <div className="w-[42px] h-[42px] rounded-full bg-[#128C7E] flex items-center justify-center flex-none overflow-hidden">
                  <img
                    src="/crow-logo.png"
                    alt="Crow"
                    className="w-7 h-7 object-contain"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = "none";
                    }}
                  />
                </div>
                <div>
                  <div className="font-display text-[14.5px] font-bold text-white leading-[1.2]">
                    Crow Repuestos
                  </div>
                  <div className="font-body text-[11.5px] text-[rgba(255,255,255,.7)]">
                    En línea · Responde en minutos
                  </div>
                </div>
                <div className="ml-auto">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="rgba(255,255,255,.6)">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                </div>
              </div>

              {/* Chat body */}
              {/* The WhatsApp-paper background is a data: URI (quotes, %,
                  and commas throughout) -- too fragile to express safely as
                  a Tailwind arbitrary-value class, so it stays inline. */}
              <div
                className="bg-[#ECE5DD] pt-5 px-4 flex flex-col gap-3 min-h-[240px]"
                style={{
                  backgroundImage:
                    "url(\"data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h60v60H0z' fill='%23d4cfc7' fill-opacity='.07'/%3E%3C/svg%3E\")",
                }}
              >
                {/* User message */}
                <div className="flex justify-end opacity-0 animate-[fadeUp_.5s_.5s_ease_both]">
                  <div className="bg-[#DCF8C6] rounded-[14px_14px_4px_14px] py-2.5 px-3.5 max-w-[80%] shadow-[0_1px_2px_rgba(0,0,0,.15)]">
                    <p className="font-body text-[13.5px] text-[#1a1a1a] m-0 leading-[1.45]">
                      Hola! Necesito frenos para mi VW Gol 2019 🔧
                    </p>
                    <div className="text-right mt-1 font-mono text-[10px] text-[#7a8f7a]">
                      14:32 ✓✓
                    </div>
                  </div>
                </div>

                {/* Typing indicator */}
                <div className="flex justify-start opacity-0 animate-[fadeUp_.5s_.9s_ease_both]">
                  <div className="bg-white rounded-[14px_14px_14px_4px] py-3 px-4 shadow-[0_1px_2px_rgba(0,0,0,.1)] flex gap-[5px] items-center">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className={`w-[7px] h-[7px] rounded-full bg-[#9E9E9E] ${DOT_ANIM[i]}`} />
                    ))}
                  </div>
                </div>

                {/* Response */}
                <div className="flex justify-start opacity-0 animate-[fadeUp_.5s_1.4s_ease_both]">
                  <div className="bg-white rounded-[14px_14px_14px_4px] py-2.5 px-3.5 max-w-[85%] shadow-[0_1px_2px_rgba(0,0,0,.1)]">
                    <p className="font-body text-[13.5px] text-[#1a1a1a] m-0 leading-[1.5]">
                      ¡Hola! Tenemos kit de frenos delanteros para el Gol G5. Te lo llevamos hoy en Mendoza ciudad 🚚
                    </p>
                    <div className="text-right mt-1 font-mono text-[10px] text-[#999]">
                      14:33
                    </div>
                  </div>
                </div>
              </div>

              {/* Input bar */}
              <div className="bg-[#F0F0F0] py-2.5 px-3.5 flex items-center gap-2.5 border-t border-[rgba(0,0,0,.08)]">
                <div className="flex-1 bg-white rounded-full py-[9px] px-4 font-body text-[13px] text-[#999]">
                  Escribí tu consulta...
                </div>
                <div className="w-10 h-10 rounded-full bg-[#25D366] flex items-center justify-center flex-none">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Floating badge — response time */}
            <div className="absolute -top-[18px] -right-[22px] bg-white rounded-xl py-2.5 px-4 shadow-[0_12px_36px_rgba(0,0,0,.28)] flex items-center gap-2.5 animate-[fadeUp_.7s_.3s_ease_both]">
              <span className="w-8 h-8 rounded-lg bg-[#DCFCE7] text-[#15803D] flex items-center justify-center text-base flex-none">
                ⚡
              </span>
              <div>
                <div className="font-display text-[13.5px] font-extrabold text-ink900 leading-none mb-[3px]">
                  &lt; 1 hora
                </div>
                <div className="font-body text-[11px] text-textMuted">
                  tiempo de respuesta
                </div>
              </div>
            </div>

            {/* Floating badge — location */}
            <div className="absolute -left-7 -bottom-[22px] bg-[#11223A] border border-[rgba(255,255,255,.12)] rounded-xl shadow-[0_24px_60px_rgba(0,0,0,.5)] p-3.5 flex items-center gap-3 animate-[fadeUp_.7s_.4s_ease_both]">
              <span className="w-[38px] h-[38px] flex-none rounded-[10px] bg-[rgba(0,87,217,.2)] text-[#7FB0FF] flex items-center justify-center">
                <Icon name="mapPin" size={19} strokeWidth={1.5} />
              </span>
              <div>
                <div className="font-body text-[13px] font-bold text-white mb-[3px]">
                  Mendoza ciudad
                </div>
                <div className="font-mono text-[10px] text-[#25D366] tracking-[.05em]">
                  ENTREGA EL MISMO DÍA
                </div>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
