import { useState } from "react";
import { usePageMeta } from "@/shared/lib/usePageMeta";
import { Hero } from "@/widgets/hero/Hero";
import { StatsSection } from "@/widgets/stats/StatsSection";
import { HowItWorks } from "@/widgets/how-it-works/HowItWorks";
import { CategoryGrid } from "@/widgets/category-grid/CategoryGrid";
import { AboutSection } from "@/widgets/about/AboutSection";
import { CtaFinal } from "@/widgets/cta/CtaFinal";
import { QuoteModal } from "@/features/quote/QuoteModal";

export function HomePage() {
  usePageMeta("Crow Repuestos · Distribuidora automotriz", "Repuestos, lubricantes, baterías y detailing para autos, motos y camiones. Atención personalizada en Mendoza ciudad.");
  const [modal, setModal] = useState<{ open: boolean; message: string; productId: number | null }>({
    open: false,
    message: "",
    productId: null,
  });

  const openBlank = () => setModal({ open: true, message: "", productId: null });

  return (
    <>
      {/* 1. Hero — propuesta de valor + CTA WhatsApp */}
      <Hero onQuote={openBlank} />
      <StatsSection />

      {/* 2. Cómo funciona — 3 pasos simples */}
      <HowItWorks />

      {/* 5. Categorías — abren WhatsApp con mensaje pre-cargado */}
      <CategoryGrid />

      {/* 6. Quiénes somos — historia y confianza local */}
      <AboutSection />

      {/* 7. CTA final — WhatsApp + teléfono + horario */}
      <CtaFinal onQuote={openBlank} />

      <QuoteModal
        open={modal.open}
        onClose={() => setModal((m) => ({ ...m, open: false }))}
        initialMessage={modal.message}
        productId={modal.productId}
      />
    </>
  );
}
