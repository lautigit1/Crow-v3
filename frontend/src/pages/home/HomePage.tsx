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

      {/* 2. Categorías — subido arriba de todo a propósito: es la única
          sección realmente navegable de la home, antes quedaba 4ta en el
          scroll detrás de tres bloques de puro texto persuasivo. */}
      <CategoryGrid />

      {/* 3. Stats — oscuro (ver StatsSection.tsx), quiebra el bloque claro
          de Categorías en vez de sumarse a él. */}
      <StatsSection />

      {/* 4. Quiénes somos — clara a propósito: hace de respiro entre las
          dos secciones oscuras (Stats y Cómo funciona) en vez de quedar
          pegada a Categorías, que también es clara. */}
      <AboutSection />

      {/* 5. Cómo funciona — 3 pasos simples. Queda justo antes del CTA:
          "así de fácil es el proceso" enlaza mejor con "así que escribinos
          ahora" que si quedara más arriba. */}
      <HowItWorks />

      {/* 6. CTA final — WhatsApp + teléfono + horario */}
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
