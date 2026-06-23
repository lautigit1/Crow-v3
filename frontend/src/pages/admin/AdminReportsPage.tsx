import type * as React from "react";
import { useEffect, useState } from "react";
import { Card, CenteredSpinner, Icon } from "@/shared/ui";
import { AdminHeader } from "./ui/AdminHeader";
import { StatCard } from "./ui/StatCard";
import { BarChart, DonutChart } from "./ui/Charts";
import { dashboardApi, type Analytics } from "@/entities/dashboard";
import { formatPrice } from "@/shared/lib/format";
import { color, font } from "@/shared/config/theme";
import type { IconName } from "@/shared/ui";

export function AdminReportsPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    dashboardApi.analytics().then(setData).catch(() => setError(true));
  }, []);

  if (error) return <AdminHeader title="Reportes" icon="reports" subtitle="No se pudieron cargar las métricas." />;
  if (!data) return <CenteredSpinner label="Calculando métricas…" />;

  const stockTotal = data.stock.in_stock + data.stock.low_stock + data.stock.out_of_stock;

  return (
    <div>
      <AdminHeader title="Reportes" icon="reports" subtitle="Métricas de catálogo, inventario y demanda." />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 24 }}>
        <StatCard icon="box" label="Productos en stock" value={data.stock.in_stock} tone="success" />
        <StatCard icon="alert" label="Stock bajo" value={data.stock.low_stock} tone="warning" />
        <StatCard icon="alert" label="Sin stock" value={data.stock.out_of_stock} tone="danger" />
        <StatCard icon="trendingUp" label="Valor inventario" value={formatPrice(data.inventory_value)} tone="primary" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <Panel title="Productos por categoría" icon="categories">
          <BarChart data={data.products_by_category} />
        </Panel>
        <Panel title="Productos por tipo de vehículo" icon="truck">
          <BarChart data={data.products_by_vehicle} accent={color.ink700} />
        </Panel>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Panel title="Cotizaciones por estado" icon="quotes">
          <DonutChart data={data.quotes_by_status} />
        </Panel>
        <Panel title="Distribución de stock" icon="inventory">
          <DonutChart
            data={[
              { label: "En stock", value: data.stock.in_stock },
              { label: "Bajo", value: data.stock.low_stock },
              { label: "Sin stock", value: data.stock.out_of_stock },
            ]}
          />
          <div style={{ fontFamily: font.mono, fontSize: 11, color: color.textFaint, marginTop: 14 }}>{stockTotal} productos evaluados</div>
        </Panel>
      </div>
    </div>
  );
}

function Panel({ title, icon, children }: { title: string; icon: IconName; children: React.ReactNode }) {
  return (
    <Card pad={0}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "15px 20px", borderBottom: `1px solid ${color.border}` }}>
        <span style={{ color: color.primary }}>
          <Icon name={icon} size={18} />
        </span>
        <span style={{ fontFamily: font.display, fontSize: 16, fontWeight: 700, color: color.ink900 }}>{title}</span>
      </div>
      <div style={{ padding: 20 }}>{children}</div>
    </Card>
  );
}
