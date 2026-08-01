import type * as React from "react";
import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Button,
  ConfirmModal,
  Drawer,
  Field,
  Icon,
  Input,
  Select,
  Textarea,
} from "@/shared/ui";
import {
  quoteApi,
  optionTotal,
  QUOTE_STATUSES,
  type Quote,
  type QuoteOption,
  type QuoteOptionInput,
  type QuoteStatus,
} from "@/entities/quote";
import { StatusBadge } from "@/entities/quote/StatusBadge";
import { useWaLink } from "@/entities/settings/useSiteSettings";
import { formatDate, formatPrice } from "@/shared/lib/format";

/**
 * Ficha de una cotización: dónde se carga la respuesta y desde dónde se
 * convierte en pedido.
 *
 * Hasta ahora el panel podía cambiarle el estado a una cotización y nada más:
 * el precio y el plazo -- que en un negocio que trae a pedido SON la venta --
 * vivían en WhatsApp. Esta pantalla es el otro extremo del agujero que tapa el
 * change: acá se escriben, y del otro lado el cliente los ve.
 */

const SIN_CONTACTO =
  "Esta consulta no tiene email ni cuenta asociada, y un pedido necesita un cliente. " +
  "Pedile el correo por WhatsApp y cargalo en la consulta.";

// ─── Formulario de una opción (sirve para alta y para edición) ───────────────

const VACIA: QuoteOptionInput = {
  title: "",
  detail: "",
  unit_price: 0,
  quantity: 1,
  lead_time: "",
};

function OptionForm({
  inicial,
  onSubmit,
  onCancel,
  etiquetaEnviar,
}: {
  inicial?: QuoteOption;
  onSubmit: (data: QuoteOptionInput) => Promise<void>;
  onCancel?: () => void;
  etiquetaEnviar: string;
}) {
  const [datos, setDatos] = useState<QuoteOptionInput>(
    inicial
      ? {
          title: inicial.title,
          detail: inicial.detail ?? "",
          unit_price: inicial.unit_price,
          quantity: inicial.quantity,
          lead_time: inicial.lead_time ?? "",
        }
      : VACIA,
  );
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof QuoteOptionInput>(campo: K, valor: QuoteOptionInput[K]) =>
    setDatos((prev) => ({ ...prev, [campo]: valor }));

  // El backend rechaza precio <= 0 con un 422. Validarlo también acá no es
  // duplicar la regla porque no es la misma pregunta: el backend protege los
  // datos, esto evita que la persona descubra el problema recién después de
  // apretar el botón y de perder lo que escribió.
  const valido = datos.title.trim().length > 0 && datos.unit_price > 0;

  const enviar = async () => {
    setGuardando(true);
    setError(null);
    try {
      await onSubmit({
        ...datos,
        title: datos.title.trim(),
        detail: datos.detail?.trim() || null,
        lead_time: datos.lead_time?.trim() || null,
      });
      if (!inicial) setDatos(VACIA); // en alta, queda listo para la siguiente
    } catch (e) {
      setError(
        (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
          "No se pudo guardar. Probá de nuevo.",
      );
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 bg-surface border border-border rounded-md p-3.5">
      <Field label="Repuesto *">
        <Input
          aria-label="Repuesto"
          value={datos.title}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("title", e.target.value)}
          placeholder="Original Bosch"
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Precio unitario *">
          <Input
            aria-label="Precio unitario"
            type="number"
            min={1}
            value={datos.unit_price || ""}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              set("unit_price", Number(e.target.value))
            }
          />
        </Field>
        <Field label="Cantidad">
          <Input
            aria-label="Cantidad"
            type="number"
            min={1}
            value={datos.quantity}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              set("quantity", Math.max(1, Number(e.target.value) || 1))
            }
          />
        </Field>
      </div>

      {/* Texto libre y no un número de días: lo que se le dice al cliente es
          "3 a 5 días" o "depende del importador". */}
      <Field label="Plazo" hint="Como se lo decís al cliente: “3 a 5 días hábiles”.">
        <Input
          aria-label="Plazo"
          value={datos.lead_time ?? ""}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("lead_time", e.target.value)}
          placeholder="3 a 5 días hábiles"
        />
      </Field>

      <Field label="Detalle">
        <Textarea
          aria-label="Detalle"
          rows={2}
          value={datos.detail ?? ""}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => set("detail", e.target.value)}
          placeholder="Juego completo, incluye sensores."
        />
      </Field>

      {datos.unit_price > 0 && datos.quantity > 1 && (
        <div className="font-body text-[13px] text-textMuted">
          Total: <strong className="text-ink900">{formatPrice(datos.unit_price * datos.quantity)}</strong>
        </div>
      )}

      {error && (
        <p role="alert" className="font-body text-[13px] text-danger m-0">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <Button size="sm" onClick={enviar} disabled={!valido || guardando}>
          {guardando ? "Guardando…" : etiquetaEnviar}
        </Button>
        {onCancel && (
          <Button size="sm" variant="outline" onClick={onCancel} disabled={guardando}>
            Cancelar
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Una opción ya cargada ──────────────────────────────────────────────────

function OptionRow({
  option,
  seleccionada,
  onSeleccionar,
  onEditar,
  onBorrar,
  bloqueada,
}: {
  option: QuoteOption;
  seleccionada: boolean;
  onSeleccionar: () => void;
  onEditar: () => void;
  onBorrar: () => void;
  bloqueada: boolean;
}) {
  return (
    <div
      className={
        "flex items-start gap-3 py-3 px-3.5 border-b border-border last:border-b-0 " +
        (seleccionada ? "bg-primarySoft" : "")
      }
    >
      {!bloqueada && (
        <input
          type="radio"
          name="opcion-a-convertir"
          checked={seleccionada}
          onChange={onSeleccionar}
          // Nombre único por fila: sin esto los tres radios comparten nombre
          // accesible y no hay forma de apuntarle a uno.
          aria-label={`Elegir ${option.title}`}
          className="mt-1 accent-primary cursor-pointer"
        />
      )}

      <div className="min-w-0 flex-1">
        <div className="text-[14px] font-semibold text-ink900">{option.title}</div>
        {option.detail && (
          <div className="font-body text-[12.5px] text-textMuted leading-snug">{option.detail}</div>
        )}
        {option.lead_time && (
          <div className="inline-flex items-center gap-1.5 mt-1 font-body text-[12px] text-textMuted">
            <Icon name="truck" size={12} />
            {option.lead_time}
          </div>
        )}
      </div>

      <div className="text-right whitespace-nowrap">
        <div className="font-mono text-[13.5px] text-ink900">{formatPrice(optionTotal(option))}</div>
        {option.quantity > 1 && (
          <div className="font-body text-[11.5px] text-textFaint">
            {option.quantity} × {formatPrice(option.unit_price)}
          </div>
        )}
        {!bloqueada && (
          <div className="flex gap-1 justify-end mt-1.5">
            <Button size="sm" variant="ghost" onClick={onEditar} aria-label={`Editar ${option.title}`}>
              Editar
            </Button>
            <Button size="sm" variant="ghost" onClick={onBorrar} aria-label={`Borrar ${option.title}`}>
              Borrar
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── La ficha ───────────────────────────────────────────────────────────────

export function QuoteSheet({
  quote,
  onClose,
  onChange,
}: {
  quote: Quote;
  onClose: () => void;
  /** Devuelve la cotización actualizada para que la lista de atrás no quede vieja. */
  onChange: (actualizada: Quote) => void;
}) {
  const waLink = useWaLink();
  const [editando, setEditando] = useState<number | null>(null);
  const [agregando, setAgregando] = useState(false);
  const [aBorrar, setABorrar] = useState<QuoteOption | null>(null);
  const [elegida, setElegida] = useState<number | null>(null);
  const [confirmarConversion, setConfirmarConversion] = useState(false);
  const [convirtiendo, setConvirtiendo] = useState(false);
  const [errorConversion, setErrorConversion] = useState<string | null>(null);

  const convertida = quote.order_id !== null;
  const sinContacto = quote.user_id === null && !quote.customer_email;

  const opcionElegida = quote.options.find((o) => o.id === elegida) ?? null;

  // Por qué NO se puede convertir, en el orden en que la persona lo resolvería.
  const impedimento = convertida
    ? null
    : quote.options.length === 0
      ? "Cargá al menos una opción para poder convertir."
      : sinContacto
        ? SIN_CONTACTO
        : !opcionElegida
          ? "Elegí cuál de las opciones aceptó el cliente."
          : null;

  const cambiarEstado = async (status: QuoteStatus) => {
    onChange(await quoteApi.setStatus(quote.id, status));
  };

  const convertir = async () => {
    if (!opcionElegida) return;
    setConvirtiendo(true);
    setErrorConversion(null);
    try {
      await quoteApi.convert(quote.id, opcionElegida.id);
      // La cotización cambió de estado y quedó enlazada al pedido: se relee en
      // vez de parchear a mano, que es como se desincroniza una pantalla.
      const frescas = await quoteApi.listAll();
      const actualizada = frescas.find((q) => q.id === quote.id);
      if (actualizada) onChange(actualizada);
      setConfirmarConversion(false);
    } catch (e) {
      setErrorConversion(
        (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
          "No se pudo convertir. Probá de nuevo.",
      );
      setConfirmarConversion(false);
    } finally {
      setConvirtiendo(false);
    }
  };

  return (
    <Drawer
      open
      onClose={onClose}
      eyebrow={`Consulta N.º ${String(quote.id).padStart(5, "0")}`}
      title={quote.customer_name}
      width={560}
    >
      <div className="flex flex-col gap-6">
        {/* ── Cliente ── */}
        <section>
          <h3 className="font-display font-bold text-[13px] uppercase tracking-wide text-textMuted mb-2">
            Cliente
          </h3>
          <div className="bg-surface border border-border rounded-md p-3.5">
            {quote.customer_email ? (
              <div className="font-mono text-[12px] text-textMuted">{quote.customer_email}</div>
            ) : (
              <div className="font-body text-[12px] text-textFaint">Sin email cargado</div>
            )}
            {quote.customer_phone && (
              <div className="font-mono text-[12px] text-textMuted">{quote.customer_phone}</div>
            )}
            {quote.user_id === null && (
              <div className="font-body text-[12px] text-textFaint mt-1">
                Entró sin cuenta, desde el formulario público.
              </div>
            )}
            {quote.customer_phone && (
              <div className="mt-2.5">
                <Button
                  as="a"
                  href={waLink(`Hola ${quote.customer_name}, sobre tu consulta en Crow Repuestos…`)}
                  target="_blank"
                  rel="noreferrer"
                  variant="whatsapp"
                  size="sm"
                >
                  WhatsApp
                </Button>
              </div>
            )}
          </div>
        </section>

        {/* ── La consulta ── */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-display font-bold text-[13px] uppercase tracking-wide text-textMuted">
              Consulta
            </h3>
            <StatusBadge status={quote.status} />
          </div>
          <div className="bg-surface border border-border rounded-md p-3.5 flex flex-col gap-2">
            {quote.vehicle && (
              <div className="inline-flex items-center gap-1.5 font-body text-[13px] text-ink800">
                <Icon name="truck" size={13} />
                {quote.vehicle}
              </div>
            )}
            <p className="m-0 font-body text-[13.5px] text-ink800 leading-[1.6]">{quote.message}</p>
            <div className="font-body text-[12px] text-textFaint">
              Recibida el {formatDate(quote.created_at)}
              {quote.answered_at && ` · Respondida el ${formatDate(quote.answered_at)}`}
            </div>
          </div>
        </section>

        {/* ── Opciones ── */}
        <section>
          <h3 className="font-display font-bold text-[13px] uppercase tracking-wide text-textMuted mb-2">
            Opciones cotizadas
          </h3>

          {quote.options.length > 0 && (
            <div className="border border-border rounded-md overflow-hidden mb-3">
              {quote.options.map((o) =>
                editando === o.id ? (
                  <div key={o.id} className="p-2">
                    <OptionForm
                      inicial={o}
                      etiquetaEnviar="Guardar"
                      onCancel={() => setEditando(null)}
                      onSubmit={async (data) => {
                        onChange(await quoteApi.updateOption(quote.id, o.id, data));
                        setEditando(null);
                      }}
                    />
                  </div>
                ) : (
                  <OptionRow
                    key={o.id}
                    option={o}
                    bloqueada={convertida}
                    seleccionada={elegida === o.id}
                    onSeleccionar={() => setElegida(o.id)}
                    onEditar={() => setEditando(o.id)}
                    onBorrar={() => setABorrar(o)}
                  />
                ),
              )}
            </div>
          )}

          {convertida ? null : agregando || quote.options.length === 0 ? (
            <OptionForm
              etiquetaEnviar="Agregar opción"
              onCancel={quote.options.length > 0 ? () => setAgregando(false) : undefined}
              onSubmit={async (data) => {
                onChange(await quoteApi.addOption(quote.id, data));
                setAgregando(false);
              }}
            />
          ) : (
            <Button size="sm" variant="outline" onClick={() => setAgregando(true)}>
              Agregar otra opción
            </Button>
          )}

          {quote.options.length === 0 && (
            // Es la consecuencia menos obvia de la pantalla y la que hace que
            // el cliente se entere: cargar la primera opción responde la
            // cotización y le manda el aviso.
            <p className="font-body text-[12.5px] text-textFaint mt-2 m-0">
              Al guardar la primera, la cotización pasa a “Respondida” y le avisamos al cliente.
            </p>
          )}
        </section>

        {/* ── Convertir ── */}
        <section>
          <h3 className="font-display font-bold text-[13px] uppercase tracking-wide text-textMuted mb-2">
            Pedido
          </h3>

          {convertida ? (
            <div className="bg-successSoft border border-border rounded-md p-3.5 flex items-center justify-between gap-3">
              <div className="font-body text-[13.5px] text-ink800">
                Convertida en el pedido N.º {String(quote.order_id).padStart(5, "0")}
              </div>
              <Button as={Link} to="/admin/pedidos" size="sm" variant="outline">
                Ver pedido
              </Button>
            </div>
          ) : (
            <>
              <Button
                onClick={() => setConfirmarConversion(true)}
                disabled={impedimento !== null}
                aria-label="Convertir en pedido"
              >
                Convertir en pedido
              </Button>
              {impedimento && (
                // Un botón gris sin explicación obliga a adivinar. Sobre todo
                // en el caso sin contacto, que no se resuelve en esta pantalla.
                <p className="font-body text-[12.5px] text-textMuted mt-2 m-0">{impedimento}</p>
              )}
              {errorConversion && (
                <p role="alert" className="font-body text-[13px] text-danger mt-2 m-0">
                  {errorConversion}
                </p>
              )}
            </>
          )}
        </section>

        {/* ── Estado, al final: es lo que menos se toca ── */}
        {!convertida && (
          <section>
            <label className="flex flex-col gap-1.5">
              <span className="font-body font-semibold text-[13px] text-ink700">Estado</span>
              <Select
                aria-label="Estado"
                value={quote.status}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  void cambiarEstado(e.target.value as QuoteStatus)
                }
              >
                {QUOTE_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </label>
          </section>
        )}
      </div>

      <ConfirmModal
        open={confirmarConversion}
        title="Convertir en pedido"
        message={
          opcionElegida
            ? `Se crea un pedido por ${formatPrice(optionTotal(opcionElegida))} (${opcionElegida.title})` +
              (quote.user_id === null
                ? `, y se le crea una cuenta a ${quote.customer_email} para que pueda seguirlo.`
                : ".")
            : ""
        }
        confirmLabel="Convertir"
        loading={convirtiendo}
        onConfirm={() => void convertir()}
        onCancel={() => setConfirmarConversion(false)}
      />

      <ConfirmModal
        open={aBorrar !== null}
        title="Borrar opción"
        message={
          // No promete deshacer lo que ya salió: el aviso al cliente se mandó
          // al cargar la primera opción y borrarla no lo cancela.
          `Se borra “${aBorrar?.title}”. La cotización sigue figurando como respondida.`
        }
        confirmLabel="Borrar"
        danger
        onConfirm={async () => {
          if (!aBorrar) return;
          onChange(await quoteApi.deleteOption(quote.id, aBorrar.id));
          if (elegida === aBorrar.id) setElegida(null);
          setABorrar(null);
        }}
        onCancel={() => setABorrar(null)}
      />
    </Drawer>
  );
}
