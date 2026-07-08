import { Navbar } from "@/widgets/navbar/Navbar";
import { Footer } from "@/widgets/footer/Footer";
import { AnimatedOutlet } from "@/shared/ui/AnimatedOutlet";
import { LenisProvider } from "@/app/providers/LenisProvider";

export function PublicLayout() {
  return (
    <LenisProvider>
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-1">
          <AnimatedOutlet />
        </main>
        <Footer />
      </div>
    </LenisProvider>
  );
}
