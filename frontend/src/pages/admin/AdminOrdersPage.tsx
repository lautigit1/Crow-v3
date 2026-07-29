import type * as React from "react";
import { useCallback, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerEvent } from "@/shared/lib/serverEvents";
import { orderKeys } from "@/entities/order/queries";
import {
  Button,
  DataTable,
  Drawer,
  Input,
  Pagination,
  Select,
  Textarea,
  CenteredSpinner,
  type Column,
} from "@/shared/ui";
import { AdminHeader } from "./ui/AdminHeader";
import {
  orderApi,
  waLinkCliente,
  ORDER_STATUSES,
  ORDER_STATUS_COLOR,
  PAYMENT_STATUSES,
  PAYMENT_STATUS_COLOR,
  type AdminOrder,
  type OrderStatus,
  type PaymentStatus,
} from "@/entities/order";
import { formatDateTime, formatPrice } from "@/shared/lib/format";

/**
 * Gestión de pedidos del panel.
 *
 * Los dos estados se muestran y se editan por separado a propósito: la entrega
 * y el cobro son ejes independientes (ver openspec .../admin-orders-and-payment).
 * El cobro se coordina por WhatsApp fuera del sitio, así que esta pantalla no
 * verifica nada -- registra lo que el admin dice que pasó.
 */

const PAGE_SIZE = 20;

// ─── Chip de estado ──────────────────────────────────────────────────────────

function EstadoChip({ texto, color }: { texto: string; color: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full font-body font-semibold text-[12px] whitespace-nowrap"
      style={{ backgroundColor: `${color}1a`, color }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
      {texto}
    </span>
  );
}

// ─── Total, que puede ser parcial ────────────────────────────────────────────

function Total({ pedido }: { pedido: AdminOrder }) {
  return (
    <div className="text-right whitespace-nowrap">
      <strong className="text-ink900">{formatPrice(pedido.total)}</strong>
      {/* Los productos "Consultar precio" no suman. Callarlo mostraría un
          número que parece el total del pedido y no lo es. */}
      {pedido.items_sin_precio > 0 && (
        <div className="font-body text-[11px] text-textMuted">
          + {pedido.items_sin_precio} a consultar
        </div>
      )}
    </div>
  );
}

// ─── Contacto: WhatsApp, o el mail cuando no hay teléfono ────────────────────

function Contacto({ pedido }: { pedido: AdminOrder }) {
  const [copiado, setCopiado] = useState(false);
  const mensaje = `Hola ${pedido.customer_name ?? ""}! Te escribo por tu pedido #${pedido.id} en Crow Repuestos.`;
  const link = waLinkCliente(pedido.customer_phone, mensaje);

  if (link) {
    return (
      <Button as="a" href={link} target="_blank" rel="noreferrer" variant="whatsapp" size="sm">
        WhatsApp
      </Button>
    );
  }

  // Sin teléfono no se muestra un botón que no lleva a ningún lado: se ofrece
  // el mail, que es el dato que sí está siempre.
  if (!pedido.customer_email) {
    return <span className="font-body text-[12px] text-textFaint">Sin contacto</span>;
  }
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => {
        void navigator.clipboard?.writeText(pedido.customer_email!);
        setCopiado(true);
        setTimeout(() => setCopiado(false), 1500);
      }}
    >
      {copiado ? "Copiado" : "Copiar mail"}
    </Button>
  );
}

// ─── Ficha ───────────────────────────────────────────────────────────────────

function FichaPedido({
  pedido,
  onGuardar,
}: {
  pedido: AdminOrder;
  onGuardar: (cambios: {
    status: OrderStatus;
    payment_status: PaymentStatus;
    admin_notes: string;
  }) => Promise<void>;
}) {
  const [entrega, setEntrega] = useState<OrderStatus>(pedido.status);
  const [cobro, setCobro] = useState<PaymentStatus>(pedido.payment_status);
  const [notas, setNotas] = useState(pedido.admin_notes ?? "");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sucio =
    entrega !== pedido.status ||
    cobro !== pedido.payment_status ||
    notas !== (pedido.admin_notes ?? "");

  const guardar = async () => {
    setGuardando(true);
    setError(null);
    try {
      await onGuardar({ status: entrega, payment_status: cobro, admin_notes: notas });
    } catch (e) {
      // Reactivar un pedido cancelado devuelve 409 desde el backend: el stock
      // ya se devolvió y volver a descontarlo lo dejaría inconsistente.
      const detalle =
        (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        "No se pudo guardar. Probá de nuevo.";
      setError(detalle);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <section>
        <h3 className="font-display font-bold text-[13px] uppercase tracking-wide text-textMuted mb-2">
          Cliente
        </h3>
        <div className="bg-surface border border-border rounded-md p-3.5">
          <strong className="text-ink900">{pedido.customer_name ?? "Sin nombre"}</strong>
          {pedido.customer_email && (
            <div className="font-mono text-[12px] text-textMuted">{pedido.customer_email}</div>
          )}
          {pedido.customer_phone ? (
            <div className="font-mono text-[12px] text-textMuted">{pedido.customer_phone}</div>
          ) : (
            <div className="font-body text-[12px] text-textFaint">Sin teléfono cargado</div>
          )}
          <div className="mt-2.5">
            <Contacto pedido={pedido} />
          </div>
        </div>
      </section>

      <section>
        <h3 className="font-display font-bold text-[13px] uppercase tracking-wide text-textMuted mb-2">
          Ítems
        </h3>
        <div className="border border-border rounded-md overflow-hidden">
          {pedido.items.map((it) => (
            <div
              key={it.id}
              className="flex items-center justify-between gap-3 py-2.5 px-3.5 border-b border-border last:border-b-0"
            >
              <div className="min-w-0">
                <div className="text-[13.5px] text-ink800 truncate">{it.name_snapshot}</div>
                <div className="font-mono text-[11px] text-textFaint">{it.sku_snapshot}</div>
              </div>
              <div className="text-right whitespace-nowrap">
                <div className="font-mono text-[13px] text-ink900">
                  {it.quantity} ×{" "}
                  {it.unit_price_snapshot === null ? (
                    <span className="text-textMuted">a consultar</span>
                  ) : (
                    formatPrice(it.unit_price_snapshot)
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-end mt-2.5">
          <Total pedido={pedido} />
        </div>
      </section>

      {pedido.notes && (
        <section>
          <h3 className="font-display font-bold text-[13px] uppercase tracking-wide text-textMuted mb-2">
            Notas del cliente
          </h3>
          <p className="bg-surface border border-border rounded-md p-3.5 text-[13.5px] text-ink800">
            {pedido.notes}
          </p>
        </section>
      )}

      {/* Los dos selects llevan `aria-label` explícito además del <span>
          visible. Sin él, el nombre accesible de un <select> envuelto en un
          <label> se calcula desde el textContent de la etiqueta, que incluye
          el texto de TODAS las opciones: queda
          "EntregaPendienteConfirmadoEn proceso…" en vez de "Entrega". El
          atributo tiene prioridad y deja el nombre en una sola palabra, que es
          lo que anuncia un lector de pantalla y lo que buscan los tests. */}
      <section className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="font-body font-semibold text-[13px] text-ink700">Entrega</span>
          <Select
            aria-label="Entrega"
            value={entrega}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
              setEntrega(e.target.value as OrderStatus)
            }
          >
            {ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </Select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="font-body font-semibold text-[13px] text-ink700">Cobro</span>
          <Select
            aria-label="Cobro"
            value={cobro}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
              setCobro(e.target.value as PaymentStatus)
            }
          >
            {PAYMENT_STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </Select>
        </label>
      </section>

      <label className="flex flex-col gap-1.5">
        <span className="font-body font-semibold text-[13px] text-ink700">Notas internas</span>
        <Textarea
          value={notas}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNotas(e.target.value)}
          rows={3}
          placeholder="No las ve el cliente."
        />
      </label>

      {error && (
        <p role="alert" className="font-body text-[13px] text-danger">
          {error}
        </p>
      )}

      <Button onClick={guardar} disabled={!sucio || guardando}>
        {guardando ? "Guardando…" : "Guardar cambios"}
      </Button>
    </div>
  );
}

// ─── Página ──────────────────────────────────────────────────────────────────

export function AdminOrdersPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [entrega, setEntrega] = useState<OrderStatus | "">("");
  const [cobro, setCobro] = useState<PaymentStatus | "">("");
  const [q, setQ] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [abierto, setAbierto] = useState<AdminOrder | null>(null);
  // Pedidos que entraron mientras la persona miraba la pantalla. No se
  // aplican solos: reordenar la tabla justo cuando alguien va a hacer clic es
  // peor que enterarse diez segundos más tarde.
  const [nuevos, setNuevos] = useState(0);

  // Debounce del buscador: sin esto cada tecla dispara una consulta con JOIN
  // contra users.
  useEffect(() => {
    const t = setTimeout(() => {
      setBusqueda(q);
      setPage(0);
    }, 350);
    return () => clearTimeout(t);
  }, [q]);

  // El filtrado es del lado del servidor, no en memoria como en Cotizaciones:
  // los pedidos se acumulan sin techo y traerlos todos para filtrar en el
  // navegador deja de funcionar en algún momento.
  const filtros = {
    skip: page * PAGE_SIZE,
    limit: PAGE_SIZE,
    status: entrega || undefined,
    payment_status: cobro || undefined,
    q: busqueda || undefined,
  };

  const { data, isPending, isError } = useQuery({
    queryKey: orderKeys.adminPage(filtros),
    queryFn: () => orderApi.listAll(filtros),
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;

  const refrescar = useCallback(
    () => queryClient.invalidateQueries({ queryKey: orderKeys.adminAll() }),
    [queryClient],
  );

  // Acá se paga lo que costó pasar la página a TanStack Query: poder decir
  // "esta lista quedó vieja" desde afuera del componente, que es exactamente
  // lo que hace falta cuando el aviso llega por un canal y no por una acción
  // de la persona.
  useServerEvent((evento) => {
    if (evento.type === "order.created") {
      setNuevos((n) => n + 1);
      return;
    }
    if (evento.type === "order.updated") {
      // Un cambio de estado sí se aplica solo: es la confirmación de algo que
      // acaba de pasar, y mostrar el dato viejo es peor que refrescar.
      void refrescar();
    }
  });

  const mostrarNuevos = () => {
    setNuevos(0);
    setPage(0);
    void refrescar();
  };

  const guardar = async (
    pedido: AdminOrder,
    cambios: { status: OrderStatus; payment_status: PaymentStatus; admin_notes: string },
  ) => {
    const actualizado = await orderApi.updateStatus(
      pedido.id,
      cambios.status,
      cambios.admin_notes,
      cambios.payment_status,
    );
    // El PATCH devuelve la forma de admin completa, así que se parchea la fila
    // en el cache sin volver a pedir la página.
    queryClient.setQueryData(orderKeys.adminPage(filtros), (prev: typeof data) =>
      prev ? { ...prev, items: prev.items.map((o) => (o.id === pedido.id ? actualizado : o)) } : prev,
    );
    setAbierto(actualizado);
  };

  const columns: Column<AdminOrder>[] = [
    {
      header: "#",
      width: 60,
      render: (o) => <span className="font-mono text-xs text-textFaint">{o.id}</span>,
    },
    {
      header: "Cliente",
      render: (o) => (
        <div className="min-w-0">
          <strong className="text-ink900">{o.customer_name ?? "Sin nombre"}</strong>
          {o.customer_email && (
            <div className="font-mono text-[11px] text-textFaint truncate">{o.customer_email}</div>
          )}
        </div>
      ),
    },
    {
      header: "Fecha",
      render: (o) => (
        <span className="font-mono text-xs text-textFaint whitespace-nowrap">
          {formatDateTime(o.created_at)}
        </span>
      ),
    },
    { header: "Total", align: "right", render: (o) => <Total pedido={o} /> },
    {
      header: "Entrega",
      render: (o) => <EstadoChip texto={o.status} color={ORDER_STATUS_COLOR[o.status]} />,
    },
    {
      header: "Cobro",
      render: (o) => (
        <EstadoChip texto={o.payment_status} color={PAYMENT_STATUS_COLOR[o.payment_status]} />
      ),
    },
    {
      header: "",
      align: "right",
      render: (o) => (
        <Button variant="ghost" size="sm" onClick={() => setAbierto(o)}>
          Gestionar
        </Button>
      ),
    },
  ];

  return (
    <div>
      <AdminHeader
        title="Pedidos"
        icon="cart"
        subtitle="Pedidos de clientes, su entrega y su cobro."
      />

      <div className="flex gap-2.5 mb-4 flex-wrap items-end">
        <div className="min-w-[240px] flex-1">
          <Input
            value={q}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQ(e.target.value)}
            placeholder="Buscar por cliente, mail o N.º de pedido"
            aria-label="Buscar pedidos"
          />
        </div>
        <div className="w-[170px]">
          <Select
            value={entrega}
            aria-label="Filtrar por entrega"
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
              setEntrega(e.target.value as OrderStatus | "");
              setPage(0);
            }}
          >
            <option value="">Toda la entrega</option>
            {ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </Select>
        </div>
        <div className="w-[160px]">
          <Select
            value={cobro}
            aria-label="Filtrar por cobro"
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
              setCobro(e.target.value as PaymentStatus | "");
              setPage(0);
            }}
          >
            <option value="">Todo el cobro</option>
            {PAYMENT_STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </Select>
        </div>
        {(entrega || cobro || q) && (
          <Button
            variant="ghost"
            onClick={() => {
              setEntrega("");
              setCobro("");
              setQ("");
              setPage(0);
            }}
          >
            Limpiar
          </Button>
        )}
      </div>

      {/* Avisa sin tocar la lista. La persona decide cuándo se reordena. */}
      {nuevos > 0 && (
        <button
          type="button"
          onClick={mostrarNuevos}
          className="mb-4 flex w-full items-center justify-center gap-2.5 rounded-xl bg-primary py-3 font-body text-[14px] font-bold text-white shadow-[0_8px_20px_-8px_rgba(0,87,217,.6)] transition-transform duration-150 hover:-translate-y-px"
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-70" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
          </span>
          {nuevos === 1 ? "1 pedido nuevo" : `${nuevos} pedidos nuevos`} — mostrar
        </button>
      )}

      {isPending ? (
        <CenteredSpinner />
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={items}
            getKey={(o) => o.id}
            onRowClick={(o) => setAbierto(o)}
            empty={
              isError
                ? "No se pudieron cargar los pedidos. Recargá la página."
                : "No hay pedidos con estos filtros."
            }
          />
          <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPage={setPage} />
        </>
      )}

      <Drawer
        open={abierto !== null}
        onClose={() => setAbierto(null)}
        title={abierto ? `Pedido #${abierto.id}` : ""}
        width={720}
      >
        {abierto && (
          <FichaPedido
            // `key` fuerza el remount al cambiar de pedido: sin esto, el estado
            // local del formulario (los dos selects y las notas) se arrastraría
            // del pedido anterior.
            key={abierto.id}
            pedido={abierto}
            onGuardar={(cambios) => guardar(abierto, cambios)}
          />
        )}
      </Drawer>
    </div>
  );
}

export default AdminOrdersPage;
