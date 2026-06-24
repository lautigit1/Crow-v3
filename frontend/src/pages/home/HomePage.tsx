import { useEffect, useState } from "react";
import { usePageMeta } from "@/shared/lib/usePageMeta";
import { Hero } from "@/widgets/hero/Hero";
import { StatsSection } from "@/widgets/stats/StatsSection";
import { HowItWorks } from "@/widgets/how-it-works/HowItWorks";
import { CategoryGrid } from "@/widgets/category-grid/CategoryGrid";
import { AboutSection } from "@/widgets/about/AboutSection";
import { CtaFinal } from "@/widgets/cta/CtaFinal";
import { QuoteModal } from "@/features/quote/QuoteModal";

const LOCAL_BUSINESS_LD = {
  "@context": "https://schema.org",
  "@type": "AutoPartsStore",
  "name": "Crow Repuestos",
  "description": "Distribuidora de repuestos, lubricantes, baterías y detailing para autos, motos y camiones. Atención directa desde Mendoza.",
  "url": "https://crowrepuestos.com.ar",
  "logo": "https://crowrepuestos.com.ar/logo.png",
  "image": "https://crowrepuestos.com.ar/og-image.png",
  "telephone": "+54-261-XXX-XXXX",
  "email": "ventas@crowrepuestos.com.ar",
  "address": {
    "@type": "PostalAddress",
    "addressLocality": "Mendoza",
    "addressRegion": "Mendoza",
    "addressCountry": "AR",
  },
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": -32.8908,
    "longitude": -68.8272,
  },
  "openingHoursSpecification": [
    {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": ["Monday","Tuesday","Wednesday","Thursday","Friday"],
      "opens": "08:00",
      "closes": "18:00",
    },
    {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": ["Saturday"],
      "opens": "08:00",
      "closes": "13:00",
    },
  ],
  "priceRange": "$$",
  "areaServed": {
    "@type": "State",
    "name": "Mendoza",
    "addressCountry": "AR",
  },
  "sameAs": [],
};

export function HomePage() {
  usePageMeta("Crow Repuestos · Distribuidora automotriz", "Repuestos, lubricantes, baterías y detailing para autos, motos y camiones. Atención personalizada en Mendoza ciudad.");

  // Inject JSON-LD on mount, remove on unmount
  useEffect(() => {
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.id   = "ld-local-business";
    script.textContent = JSON.stringify(LOCAL_BUSINESS_LD);
    document.head.appendChild(script);
    return () => { script.remove(); };
  }, []);
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
