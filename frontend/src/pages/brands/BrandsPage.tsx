import { useEffect, useState } from "react";
import { usePageMeta } from "@/shared/lib/usePageMeta";
import { Link } from "react-router-dom";
import { Container, Button, CenteredSpinner, EmptyState } from "@/shared/ui";
import { Hoverable } from "@/shared/lib/Hoverable";
import { brandApi, type Brand } from "@/entities/brand";
import { color, font } from "@/shared/config/theme";

export function BrandsPage() {
  usePageMeta("Marcas", "Todas las marcas de repuestos disponibles en Crow Repuestos — Mendoza.");
  const [brands, setBrands] = useState<Brand[] | null>(null);

  useEffect(() => {
    brandApi.list().then(setBrands).catch(() => setBrands([]));
  }, []);

  return (
    <>
      <section style={{ background: color.ink900, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(820px 320px at 85% -20%, rgba(0,87,217,.2), transparent 60%)" }} />
        <Container style={{ position: "relative", padding: "56px 40px" }}>
          <h1 style={{ fontFamily: font.display, fontSize: 42, fontWeight: 800, letterSpacing: "-.02em", color: "#fff", marginBottom: 12 }}>
            Marcas aliadas
          </h1>
          <p style={{ fontFamily: font.body, fontSize: 16, lineHeight: 1.6, color: color.textOnDark, maxWidth: 560 }}>
            Trabajamos con fabricantes reconocidos. Cada referencia que distribuimos está respaldada por garantía de planta.
          </p>
        </Container>
      </section>

      <section style={{ background: color.surface, padding: "60px 0 90px", minHeight: "50vh" }}>
        <Container>
          {brands === null ? (
            <CenteredSpinner label="Cargando marcas…" />
          ) : brands.length === 0 ? (
            <EmptyState title="Aún no hay marcas cargadas" message="Agregá marcas desde el panel de administración." />
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16 }}>
              {brands.map((b) => (
                <Hoverable
                  key={b.id}
                  as={Link}
                  to={`/catalogo?marca=${b.id}`}
                  style={{ height: 130, background: "#fff", border: `1px solid ${color.border}`, borderRadius: 10, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, transition: "border-color .18s, transform .18s" }}
                  hoverStyle={{ borderColor: color.primary, transform: "translateY(-3px)" }}
                >
                  {b.logo_url ? (
                    <img src={b.logo_url} alt={b.name} style={{ maxHeight: 48, maxWidth: "70%", objectFit: "contain" }} />
                  ) : (
                    <span style={{ fontFamily: font.display, fontWeight: 800, fontSize: 20, color: color.ink800 }}>{b.name}</span>
                  )}
                </Hoverable>
              ))}
            </div>
          )}
          <div style={{ marginTop: 44, textAlign: "center" }}>
            <Button as={Link} to="/catalogo">Ver catálogo completo →</Button>
          </div>
        </Container>
      </section>
    </>
  );
}
