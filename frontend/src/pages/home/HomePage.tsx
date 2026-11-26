import { useEffect, useState } from "react";
import { usePageMeta } from "@/shared/lib/usePageMeta";
import { Hero } from "@/widgets/hero/Hero";
import { HowItWorks } from "@/widgets/how-it-works/HowItWorks";
import { CategoryGrid } from "@/widgets/category-grid/CategoryGrid";
import { FeaturedProducts } from "@/widgets/featured-products/FeaturedProducts";
import { AboutSection } from "@/widgets/about/AboutSection";
import { CtaFinal } from "@/widgets/cta/CtaFinal";
import { QuoteModal } from "@/features/quote/QuoteModal";
import { useSiteSettings } from "@/entities/settings/useSiteSettings";

const LOCAL_BUSINESS_LD = {
  "@context": "https://schema.org",
  "@type": "AutoPartsStore",
  "name": "Crow Repuestos",
  "description": "Distribuidora de repuestos, lubricantes, baterías y detailing para autos, motos y camiones. Atención directa desde Mendoza.",
  "url": "https://crowrepuestos.com.ar",
  "logo": "https://crowrepuestos.com.ar/logo.png",
  "image": "https://crowrepuestos.com.ar/og-image.png",
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
};

export function HomePage() {
  usePageMeta("Crow Repuestos · Distribuidora automotriz", "Repuestos, lubricantes, baterías y detailing para autos, motos y camiones. Atención personalizada en Mendoza ciudad.");

  // Teléfono, mail y redes salen de la configuración del panel y no de un
  // literal: Google indexa estos datos, y un número de relleno o viejo termina
  // en la ficha del negocio.
  const { whatsapp_number, email, instagram, facebook, tiktok } = useSiteSettings();

  // Inject JSON-LD on mount, remove on unmount
  useEffect(() => {
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.id   = "ld-local-business";
    script.textContent = JSON.stringify({
      ...LOCAL_BUSINESS_LD,
      telephone: `+${whatsapp_number}`,
      email,
      sameAs: [instagram, facebook, tiktok].filter(Boolean),
    });
    document.head.appendChild(script);
    return () => { script.remove(); };
  }, [whatsapp_number, email, instagram, facebook, tiktok]);
  const [modal, setModal] = useState<{ open: boolean; message: string; productId: number | null }>({
    open: false,
    message: "",
    productId: null,
  });

  const openQuote = () => setModal({ open: true, message: "", productId: null });

  return (
    <>
      {/* 1. Hero: qué vendemos, la foto de una pieza real y los canales */}
      <Hero />

      {/* 2. Qué tenemos: el catálogo como índice (vehículo, después rubro).
          Va primero porque es lo único navegable de la home. */}
      <CategoryGrid />

      {/* 3. Destacados: productos reales marcados como destacados en el panel.
          Si no hay ninguno, la sección no aparece. */}
      <FeaturedProducts />

      {/* 4. Quiénes somos: el comercio y sus diferenciales, con la foto de stock. */}
      <AboutSection />

      {/* 5. Cómo comprar: el recorrido con sus canales y formas de pago reales.
          Queda pegado al cierre, que es el paso siguiente. */}
      <HowItWorks />

      {/* 6. Cierre: para quien prefiere hablar, con teléfono y horario. */}
      <CtaFinal onQuote={() => openQuote()} />

      <QuoteModal
        open={modal.open}
        onClose={() => setModal((m) => ({ ...m, open: false }))}
        initialMessage={modal.message}
        productId={modal.productId}
      />
    </>
  );
}
