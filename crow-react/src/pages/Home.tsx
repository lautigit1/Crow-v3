import { useState } from "react";
import UtilityBar from "../components/UtilityBar";
import SiteHeader, { type NavLink } from "../components/SiteHeader";
import Footer from "../components/Footer";
import QuoteModal from "../components/QuoteModal";
import Hero from "./home/Hero";
import CategoriesBento from "./home/CategoriesBento";
import WhyChoose from "./home/WhyChoose";
import FeaturedProducts from "./home/FeaturedProducts";
import Detailing from "./home/Detailing";
import StatsBar from "./home/StatsBar";
import Brands from "./home/Brands";
import Testimonials from "./home/Testimonials";
import ContactCTA from "./home/ContactCTA";

const NAV: NavLink[] = [
  { label: "Categorías", href: "#categorias" },
  { label: "Catálogo", href: "/catalogo", route: true },
  { label: "Productos", href: "#productos" },
  { label: "Detailing", href: "#detailing" },
  { label: "Nosotros", href: "#nosotros" },
  { label: "Contacto", href: "#contacto" },
];

export default function Home() {
  const [modalOpen, setModalOpen] = useState(false);
  const openModal = () => setModalOpen(true);

  return (
    <div style={{ background: "#fff", color: "#16202B", overflowX: "hidden" }}>
      <UtilityBar />
      <SiteHeader links={NAV} onQuote={openModal} />
      <Hero onQuote={openModal} />
      <CategoriesBento />
      <WhyChoose />
      <FeaturedProducts onQuote={openModal} />
      <Detailing />
      <StatsBar />
      <Brands />
      <Testimonials />
      <ContactCTA onQuote={openModal} />
      <Footer onHome />
      <QuoteModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
