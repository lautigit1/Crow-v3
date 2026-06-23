import { Navbar } from "@/widgets/navbar/Navbar";
import { Footer } from "@/widgets/footer/Footer";
import { AnimatedOutlet } from "@/shared/ui/AnimatedOutlet";

export function PublicLayout() {
  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <Navbar />
      <main style={{ flex: 1 }}>
        <AnimatedOutlet />
      </main>
      <Footer />
    </div>
  );
}
