import type * as React from "react";
import { useEffect, useState } from "react";
import { Card, CenteredSpinner, Icon } from "@/shared/ui";
import { AdminHeader } from "./ui/AdminHeader";
import { StatCard } from "./ui/StatCard";
import { BarChart, DonutChart } from "./ui/Charts";
import { dashboardApi, type Analytics } from "@/entities/dashboard";
import { formatPrice } from "@/shared/lib/format";
import { color } from "@/shared/config/theme";
import type { IconName } from "@/shared/ui";

export function AdminReportsPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    dashboardApi.analytics().then(setData).catch(() => setError(true));
  }, []);

  if (error) return <AdminHeader title="Reportes" icon="reports" subtitle="No se pudieron cargar las métricas." />;
  if (!data) return <CenteredSpinner label="Calculando métricas…" />;

  const stockTotal = data.stock_summary.in_stock + data.stock_summary.low_stock + data.stock_summary.out_of_stock;

  return (
    <div>
      <AdminHeader title="Reportes" icon="reports" subtitle="Métricas de catálogo, inventario y demanda." />

      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard icon="box" label="Productos en stock" value={data.stock_summary.in_stock} tone="success" />
        <StatCard icon="alert" label="Stock bajo" value={data.stock_summary.low_stock} tone="warning" />
        <StatCard icon="alert" label="Sin stock" value={data.stock_summary.out_of_stock} tone="danger" />
        <StatCard icon="trendingUp" label="Valor inventario" value={formatPrice(data.inventory_value)} tone="primary" />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <Panel title="Productos por categoría" icon="categories">
          <BarChart data={data.products_by_category} />
        </Panel>
        <Panel title="Productos por tipo de vehículo" icon="truck">
          <BarChart data={data.products_by_vehicle} accent={color.ink700} />
        </Panel>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Panel title="Cotizaciones por estado" icon="quotes">
          <DonutChart data={data.quotes_by_status} />
        </Panel>
        <Panel title="Distribución de stock" icon="inventory">
          <DonutChart
            data={[
              { label: "En stock", value: data.stock_summary.in_stock },
              { label: "Bajo", value: data.stock_summary.low_stock },
              { label: "Sin stock", value: data.stock_summary.out_of_stock },
            ]}
          />
          <div className="font-mono text-xs text-textFaint mt-3.5">{stockTotal} productos evaluados</div>
        </Panel>
      </div>
    </div>
  );
}

function Panel({ title, icon, children }: { title: string; icon: IconName; children: React.ReactNode }) {
  return (
    <Card pad={0}>
      <div className="flex items-center gap-2.5 py-[15px] px-5 border-b border-border">
        <span className="text-primary">
          <Icon name={icon} size={18} />
        </span>
        <span className="font-display text-base font-bold text-ink900">{title}</span>
      </div>
      <div className="p-5">{children}</div>
    </Card>
  );
}
