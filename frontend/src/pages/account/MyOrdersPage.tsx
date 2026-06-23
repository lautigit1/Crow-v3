import { Link } from "react-router-dom";
import { EmptyState, Button } from "@/shared/ui";
import { color, font } from "@/shared/config/theme";

export function MyOrdersPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <h1 style={{ fontFamily: font.display, fontSize: 26, fontWeight: 800, color: color.ink900 }}>Mis pedidos</h1>
      <EmptyState
        title="Aún no tenés pedidos"
        message="Cuando concretes una compra, tus pedidos y su seguimiento aparecerán acá."
        action={<Button as={Link} to="/catalogo">Explorar catálogo</Button>}
      />
    </div>
  );
}
