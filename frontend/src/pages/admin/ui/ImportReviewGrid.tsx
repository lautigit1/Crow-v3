import { useState } from "react";
import clsx from "clsx";
import { Button, Icon, Input, Select } from "@/shared/ui";
import { importApi, type ImportBatch, type ImportLine, type LineResolution } from "@/entities/import";
import { apiError } from "@/shared/api";
import { formatPrice } from "@/shared/lib/format";

/**
 * Grilla de revisión de una factura importada.
 *
 * Es la pieza que hace que todo esto sea seguro: las líneas se ven y se
 * corrigen ANTES de que toquen el stock o el catálogo. El backend no deja
 * confirmar si la suma de las líneas no da el total declarado de la factura,
 * y acá el botón refleja esa misma regla en vez de dejar intentar y fallar.
 *
 * La fase 5 (facturas en PDF) va a reusar esta misma grilla: lo único que
 * cambia es de dónde salen las líneas.
 */

const TONO: Record<LineResolution, string> = {
  "Producto nuevo": "border-[#BBF7D0] bg-successSoft text-success",
  "Reposición": "border-[#BFDBFE] bg-primarySoft text-primaryDark",
  "Conflicto de SKU": "border-[#FDE68A] bg-warningSoft text-warning",
  "Ignorar": "border-border bg-surface text-textFaint",
};

function CeldaEditable({
  value, onCommit, type = "text", className,
}: {
  value: string;
  onCommit: (v: string) => void;
  type?: string;
  className?: string;
}) {
  const [draft, setDraft] = useState(value);
  const [editando, setEditando] = useState(false);

  // El commit va en `blur` y no en cada tecla: cada guardado es un request
  // que devuelve el lote entero recalculado, y hacerlo por pulsación
  // saturaría al backend y haría saltar el total mientras se escribe.
  return (
    <Input
      type={type}
      value={editando ? draft : value}
      onFocus={() => { setDraft(value); setEditando(true); }}
      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDraft(e.target.value)}
      onBlur={() => {
        setEditando(false);
        if (draft !== value) onCommit(draft);
      }}
      className={clsx("h-9 text-[13px]", className)}
    />
  );
}

export function ImportReviewGrid({
  batch, onChange,
}: {
  batch: ImportBatch;
  onChange: (b: ImportBatch) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const editable = batch.status === "Borrador";

  const guardarLinea = async (linea: ImportLine, patch: Record<string, unknown>) => {
    setBusy(true);
    setError("");
    try {
      onChange(await importApi.updateLine(batch.id, linea.id, patch));
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  };

  const borrarLinea = async (linea: ImportLine) => {
    setBusy(true);
    setError("");
    try {
      onChange(await importApi.deleteLine(batch.id, linea.id));
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  };

  const guardarTotal = async (valor: string) => {
    const numero = Number(valor.replace(",", "."));
    if (Number.isNaN(numero)) return;
    setBusy(true);
    try {
      onChange(await importApi.updateBatch(batch.id, { declared_total: numero }));
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  };

  const conflictos = batch.lines.filter((l) => l.resolution === "Conflicto de SKU").length;
  const automaticas = batch.lines.filter((l) => l.is_auto).length;

  return (
    <div className="flex flex-col gap-4">
      {/* Control cruzado -- lo primero que se ve, porque es lo que decide si
          esto se puede confirmar o no. */}
      <div
        className={clsx(
          "flex flex-wrap items-center justify-between gap-4 rounded-lg border px-5 py-4",
          batch.totals_match ? "border-[#BBF7D0] bg-successSoft" : "border-[#FDE68A] bg-warningSoft"
        )}
      >
        <div className="flex items-center gap-3">
          <Icon
            name={batch.totals_match ? "check" : "alert"}
            size={20}
            className={batch.totals_match ? "text-success" : "text-warning"}
          />
          <div>
            <div className={clsx("font-body text-[14px] font-semibold", batch.totals_match ? "text-success" : "text-warning")}>
              {batch.totals_match ? "El total coincide" : "El total no coincide"}
            </div>
            <div className="mt-0.5 font-body text-[12.5px] text-textMuted">
              Suma de las líneas: <strong>{formatPrice(batch.lines_total)}</strong>
              {batch.declared_total != null && <> · Factura: <strong>{formatPrice(batch.declared_total)}</strong></>}
            </div>
          </div>
        </div>

        {editable && (
          <label className="flex items-center gap-2.5">
            <span className="font-body text-[12.5px] font-semibold text-ink800">Total de la factura</span>
            <CeldaEditable
              value={batch.declared_total != null ? String(batch.declared_total) : ""}
              onCommit={guardarTotal}
              className="w-36"
            />
          </label>
        )}
      </div>

      {automaticas > 0 && (
        <div className="rounded-md border border-[#FDE68A] bg-warningSoft px-4 py-3 font-body text-[13px] leading-snug text-warning">
          <strong>{automaticas} línea{automaticas !== 1 ? "s" : ""} leída{automaticas !== 1 ? "s" : ""} automáticamente del PDF.</strong>{" "}
          Verificá códigos, cantidades y precios contra el documento de al lado antes de confirmar.
          Si el total no cuadra, es señal de que algo se leyó mal.
        </div>
      )}

      {conflictos > 0 && (
        <div className="rounded-md border border-[#FDE68A] bg-warningSoft px-4 py-3 font-body text-[13px] leading-snug text-warning">
          <strong>{conflictos} línea{conflictos !== 1 ? "s" : ""} con conflicto de SKU.</strong> Ese código ya existe
          en un producto de otro proveedor. Si es la misma pieza, dejala como está para sumarle stock;
          si es una coincidencia, cambiale el código y se va a crear un producto nuevo.
        </div>
      )}

      {/* Grilla */}
      <div className="overflow-x-auto rounded-lg border border-border bg-white">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-border bg-surface">
              {["Fila", "Código", "Descripción", "Cant.", "Costo unit.", "Subtotal", "Destino"].map((h) => (
                <th key={h} className="px-3 py-2.5 text-left font-body text-[11.5px] font-semibold text-textFaint">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {batch.lines.map((linea) => (
              <tr
                key={linea.id}
                className={clsx(
                  "border-b border-border last:border-b-0",
                  linea.resolution === "Ignorar" && "opacity-55"
                )}
              >
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[11.5px] text-textFaint">{linea.row_number}</span>
                    {linea.is_auto && (
                      <span
                        title="Leída automáticamente del PDF — verificá el código, la cantidad y el precio"
                        className="flex h-4 w-4 items-center justify-center rounded-full bg-warningSoft text-warning"
                      >
                        <Icon name="sparkles" size={10} />
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-3 py-2 w-[130px]">
                  {editable ? (
                    <CeldaEditable value={linea.sku} onCommit={(v) => guardarLinea(linea, { sku: v })} />
                  ) : (
                    <span className="font-mono text-[12.5px]">{linea.sku}</span>
                  )}
                </td>
                <td className="px-3 py-2 min-w-[220px]">
                  {editable ? (
                    <CeldaEditable value={linea.name} onCommit={(v) => guardarLinea(linea, { name: v })} />
                  ) : (
                    <span className="font-body text-[13px]">{linea.name}</span>
                  )}
                </td>
                <td className="px-3 py-2 w-[90px]">
                  {editable ? (
                    <CeldaEditable
                      type="number"
                      value={String(linea.quantity)}
                      onCommit={(v) => guardarLinea(linea, { quantity: Number(v) })}
                    />
                  ) : (
                    <span className="font-mono text-[12.5px]">{linea.quantity}</span>
                  )}
                </td>
                <td className="px-3 py-2 w-[120px]">
                  {editable ? (
                    <CeldaEditable
                      type="number"
                      value={linea.unit_cost != null ? String(linea.unit_cost) : ""}
                      onCommit={(v) => guardarLinea(linea, { unit_cost: v ? Number(v) : null })}
                    />
                  ) : (
                    <span className="font-mono text-[12.5px]">{formatPrice(linea.unit_cost)}</span>
                  )}
                </td>
                <td className="px-3 py-2 whitespace-nowrap font-mono text-[12.5px] font-semibold text-ink900">
                  {formatPrice(linea.subtotal)}
                </td>
                <td className="px-3 py-2 w-[210px]">
                  {editable ? (
                    <div className="flex items-center gap-1.5">
                    <Select
                      value={linea.resolution === "Ignorar" ? "IGNORAR" : "INCLUIR"}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                        guardarLinea(linea, {
                          // Volver a incluir una línea deja que el backend
                          // recalcule la resolución contra el SKU actual, en
                          // vez de restaurar la que tenía al parsear.
                          resolution: e.target.value === "IGNORAR" ? "IGNORAR" : undefined,
                          ...(e.target.value === "INCLUIR" ? { sku: linea.sku } : {}),
                        })
                      }
                      className="h-9 text-[12.5px]"
                    >
                      <option value="INCLUIR">{linea.resolution === "Ignorar" ? "Incluir" : linea.resolution}</option>
                      <option value="IGNORAR">Ignorar</option>
                    </Select>
                    {/* Borrar es distinto de ignorar: ignorar deja la línea a
                        la vista para saber que existía en la factura y se
                        decidió no traerla. Borrar es para las que se cargaron
                        a mano por error. */}
                    <button
                      onClick={() => borrarLinea(linea)}
                      aria-label="Borrar línea"
                      className="shrink-0 cursor-pointer rounded-md border-none bg-transparent p-1.5 text-textFaint transition-colors duration-150 hover:bg-dangerSoft hover:text-danger"
                    >
                      <Icon name="trash" size={14} />
                    </button>
                    </div>
                  ) : (
                    <span className={clsx("inline-block rounded-pill border px-2.5 py-1 font-body text-[11.5px] font-semibold", TONO[linea.resolution])}>
                      {linea.resolution}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Alta manual -- es lo que vuelve utilizable una factura en PDF: se
          mira el documento al lado y se tipea. Aparece también en lotes de
          Excel, para agregar una línea que el parser no pudo leer. */}
      {editable && <NuevaLinea batch={batch} onChange={onChange} onError={setError} />}

      {error && <div className="font-body text-[13px] text-danger">{error}</div>}
      {busy && <div className="font-body text-[12.5px] text-textFaint">Guardando…</div>}
    </div>
  );
}

const VACIA = { sku: "", name: "", quantity: "", unit_cost: "" };

function NuevaLinea({
  batch, onChange, onError,
}: {
  batch: ImportBatch;
  onChange: (b: ImportBatch) => void;
  onError: (m: string) => void;
}) {
  const [form, setForm] = useState(VACIA);
  const [guardando, setGuardando] = useState(false);

  const listo = form.sku.trim() && form.name.trim() && Number(form.quantity) > 0;

  const agregar = async () => {
    if (!listo) return;
    setGuardando(true);
    try {
      onChange(await importApi.addLine(batch.id, {
        sku: form.sku.trim(),
        name: form.name.trim(),
        quantity: Number(form.quantity),
        unit_cost: form.unit_cost ? Number(form.unit_cost.replace(",", ".")) : null,
      }));
      setForm(VACIA);  // queda lista para la siguiente, sin sacar el foco del flujo
    } catch (err) {
      onError(apiError(err));
    } finally {
      setGuardando(false);
    }
  };

  const set = (k: keyof typeof VACIA) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="rounded-lg border border-dashed border-borderStrong bg-surface p-4">
      <div className="mb-3 font-body text-[12.5px] font-semibold text-textFaint">Agregar línea a mano</div>
      <div className="flex flex-wrap items-end gap-2.5">
        <Input value={form.sku} onChange={set("sku")} placeholder="Código" className="h-9 w-[130px] text-[13px]" />
        <Input value={form.name} onChange={set("name")} placeholder="Descripción" className="h-9 min-w-[220px] flex-1 text-[13px]" />
        <Input value={form.quantity} onChange={set("quantity")} type="number" placeholder="Cant." className="h-9 w-[85px] text-[13px]" />
        <Input value={form.unit_cost} onChange={set("unit_cost")} placeholder="Costo unit." className="h-9 w-[120px] text-[13px]" />
        <Button size="sm" onClick={agregar} disabled={!listo || guardando}>
          <Icon name="plus" size={14} /> Agregar
        </Button>
      </div>
    </div>
  );
}
