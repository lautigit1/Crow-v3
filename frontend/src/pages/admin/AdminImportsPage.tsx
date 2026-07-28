import type * as React from "react";
import { useCallback, useEffect, useState } from "react";
import clsx from "clsx";
import { Badge, Button, CenteredSpinner, EmptyState, Field, Icon, Input, Modal, Select } from "@/shared/ui";
import { AdminHeader } from "./ui/AdminHeader";
import { ImportReviewGrid } from "./ui/ImportReviewGrid";
import {
  hashArchivo,
  importApi,
  type ColumnMapping,
  type DuplicateCheck,
  type ImportBatch,
  type ImportConfirmResult,
  type ImportPreview,
} from "@/entities/import";
import { supplierApi, type Supplier } from "@/entities/supplier";
import { apiError } from "@/shared/api";
import { formatDateTime, formatPrice } from "@/shared/lib/format";

/**
 * Importación de facturas de proveedor.
 *
 * Dos vistas en una sola página: el listado de importaciones y la revisión de
 * una en particular. No son rutas separadas porque revisar es un paso del
 * mismo flujo -- subís, revisás, confirmás -- y partirlo en dos URLs invita a
 * llegar a la revisión sin contexto.
 */

const CAMPOS: { key: keyof ColumnMapping; label: string; required: boolean }[] = [
  { key: "sku", label: "Código / SKU", required: true },
  { key: "name", label: "Descripción", required: true },
  { key: "quantity", label: "Cantidad", required: true },
  { key: "unit_cost", label: "Costo unitario", required: false },
];

const ESTADO_TONO = {
  "Borrador": "warning",
  "Confirmado": "success",
  "Revertido": "neutral",
} as const;

export function AdminImportsPage() {
  const [batches, setBatches] = useState<ImportBatch[] | null>(null);
  const [revisando, setRevisando] = useState<ImportBatch | null>(null);
  const [error, setError] = useState("");
  const [resultado, setResultado] = useState<ImportConfirmResult | null>(null);
  // Arranca abierto solo si el lote no tiene líneas: es la señal de que hay
  // que cargarlas a mano mirando el documento. Con un Excel ya parseado, el
  // visor estorba más de lo que ayuda.
  const [mostrarDoc, setMostrarDoc] = useState(false);
  const [duplicado, setDuplicado] = useState<DuplicateCheck | null>(null);

  // Asistente de subida
  const [abierto, setAbierto] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierId, setSupplierId] = useState<number | "">("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [mapping, setMapping] = useState<Partial<ColumnMapping>>({});
  const [total, setTotal] = useState("");
  const [subiendo, setSubiendo] = useState(false);

  /** Solo el .xlsx se parsea; el resto va por carga asistida. */
  const esExcel = !!file?.name.toLowerCase().endsWith(".xlsx");

  /** Qué falta para poder subir, en texto. `null` = está todo listo. */
  const faltante =
    supplierId === "" ? "elegir el proveedor"
    : !file ? "elegir el archivo"
    : esExcel && (!mapping.sku || !mapping.name || !mapping.quantity) ? "asignar las columnas obligatorias"
    : null;

  const reload = useCallback(async () => {
    try {
      setBatches((await importApi.list({ limit: 50 })).items);
    } catch (err) {
      setBatches([]);
      setError(apiError(err));
    }
  }, []);

  useEffect(() => { void reload(); }, [reload]);
  useEffect(() => {
    supplierApi.list({ active_only: true, limit: 200 })
      .then((r) => setSuppliers(r.items))
      .catch(() => setSuppliers([]));
  }, []);

  const elegirArchivo = async (f: File) => {
    setFile(f);
    setError("");
    setPreview(null);
    setDuplicado(null);

    // Se pregunta por el hash antes de subir: si esta factura ya se importó,
    // el aviso llega ANTES de procesar nada. Confirmarla dos veces sumaría
    // el stock dos veces, y ese error solo se descubre cuando el inventario
    // no cuadra, semanas después.
    try {
      const d = await importApi.checkDuplicate(await hashArchivo(f));
      if (d.found) setDuplicado(d);
    } catch {
      // Que falle el chequeo no puede impedir importar: es una ayuda, no un
      // requisito. Se sigue sin aviso.
    }
  };

  /**
   * Pide el preview del Excel: encabezados y sugerencia de mapeo.
   *
   * Va en un efecto y no en el `onChange` del archivo porque depende de DOS
   * cosas -- archivo y proveedor -- y antes el input estaba deshabilitado
   * hasta elegir proveedor. Eso hacía que el botón no respondiera al clic sin
   * ninguna explicación en pantalla. Ahora se puede elegir en cualquier
   * orden y el preview se dispara cuando están las dos.
   */
  useEffect(() => {
    if (supplierId === "" || !file) return;
    // Solo el Excel se intenta parsear; PDF y fotos van por carga asistida.
    if (!file.name.toLowerCase().endsWith(".xlsx")) return;

    let vigente = true;
    importApi.preview(supplierId, file)
      .then((p) => {
        if (!vigente) return;
        setPreview(p);
        // El mapeo guardado gana sobre la sugerencia: si ya importaste de
        // este proveedor, esa configuración es la que sabés que funciona.
        setMapping(Object.keys(p.saved_mapping).length ? p.saved_mapping : p.suggested_mapping);
      })
      .catch((err) => {
        if (!vigente) return;
        setPreview(null);
        setError(apiError(err));
      });
    return () => { vigente = false; };
  }, [supplierId, file]);

  const subir = async () => {
    if (supplierId === "" || !file || !mapping.sku || !mapping.name || !mapping.quantity) return;
    setSubiendo(true);
    setError("");
    try {
      const batch = await importApi.create(
        supplierId, file,
        mapping as ColumnMapping,
        total ? Number(total.replace(",", ".")) : null,
        true,
      );
      cerrarAsistente();
      await reload();
      setRevisando(batch);  // se va derecho a revisar, que es el paso que importa
    } catch (err) {
      setError(apiError(err));
    } finally {
      setSubiendo(false);
    }
  };

  /** Carga asistida: el archivo no se parsea, se guarda para mirarlo. */
  const subirManual = async () => {
    if (supplierId === "" || !file) return;
    setSubiendo(true);
    setError("");
    try {
      const batch = await importApi.createManual(
        supplierId, file, total ? Number(total.replace(",", ".")) : null,
      );
      cerrarAsistente();
      await reload();
      setRevisando(batch);
      // Siempre visible en este camino: si no se extrajo nada hay que tipear
      // mirándolo, y si se extrajo algo hay que verificarlo contra él.
      setMostrarDoc(true);
    } catch (err) {
      setError(apiError(err));
    } finally {
      setSubiendo(false);
    }
  };

  const cerrarAsistente = () => {
    setAbierto(false);
    setFile(null);
    setPreview(null);
    setMapping({});
    setTotal("");
    setDuplicado(null);
  };

  const confirmar = async () => {
    if (!revisando) return;
    setError("");
    try {
      const r = await importApi.confirm(revisando.id);
      setRevisando(await importApi.get(revisando.id));
      await reload();
      setError("");
      setResultado(r);
    } catch (err) {
      setError(apiError(err));
    }
  };

  const revertir = async () => {
    if (!revisando) return;
    setError("");
    try {
      await importApi.revert(revisando.id);
      setRevisando(await importApi.get(revisando.id));
      await reload();
    } catch (err) {
      setError(apiError(err));
    }
  };

  // ── Vista de revisión ────────────────────────────────────────────────────
  if (revisando) {
    return (
      <div className="flex flex-col gap-5">
        <AdminHeader
          title={`Factura ${revisando.filename}`}
          icon="inventory"
          subtitle={`${revisando.lines.length} líneas · ${revisando.status}`}
          action={<Button variant="outline" onClick={() => setRevisando(null)}>← Volver</Button>}
        />

        {/* Documento a la izquierda, grilla a la derecha. Es toda la fase 5:
            no se intenta leer el PDF, se lo pone al lado para poder tipear
            mirándolo. Funciona igual con un PDF digital que con la foto de
            un papel, que es exactamente el punto. */}
        <div className={clsx("grid gap-5", mostrarDoc && "xl:grid-cols-[minmax(0,460px)_minmax(0,1fr)]")}>
          {mostrarDoc && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="font-body text-[12.5px] font-semibold text-textFaint">Documento original</span>
                <button
                  onClick={() => setMostrarDoc(false)}
                  className="cursor-pointer border-none bg-transparent font-body text-[12.5px] font-semibold text-primary"
                >
                  Ocultar
                </button>
              </div>
              <iframe
                src={importApi.fileUrl(revisando.id)}
                title={`Factura ${revisando.filename}`}
                className="h-[720px] w-full rounded-lg border border-border bg-white"
              />
            </div>
          )}

          <div className="min-w-0">
            {revisando.has_file && !mostrarDoc && (
              <button
                onClick={() => setMostrarDoc(true)}
                className="mb-3 cursor-pointer rounded-md border border-border bg-white px-3.5 py-2 font-body text-[12.5px] font-semibold text-primary"
              >
                Ver el documento original
              </button>
            )}
            <ImportReviewGrid batch={revisando} onChange={setRevisando} />
          </div>
        </div>

        {/* El aviso más importante no es "se confirmó" sino "los productos
            nuevos quedaron en borrador": si no, quedan cargados y sin precio
            de venta, invisibles en el catálogo, esperando a que alguien se
            acuerde. */}
        {resultado && (
          <div className="rounded-lg border border-[#BBF7D0] bg-successSoft px-5 py-4">
            <div className="flex items-center gap-2.5 font-body text-[14px] font-semibold text-success">
              <Icon name="check" size={18} />
              Mercadería ingresada
            </div>
            <p className="m-0 mt-1.5 font-body text-[13px] leading-relaxed text-textMuted">
              {resultado.created} producto{resultado.created !== 1 ? "s" : ""} creado{resultado.created !== 1 ? "s" : ""},{" "}
              {resultado.updated} actualizado{resultado.updated !== 1 ? "s" : ""},{" "}
              {resultado.skipped} ignorado{resultado.skipped !== 1 ? "s" : ""}.
              {resultado.created > 0 && (
                <> Los nuevos quedaron <strong>en borrador</strong>: ponéles precio de venta y publicalos desde Productos.</>
              )}
            </p>
          </div>
        )}

        {error && (
          <div className="rounded-md border border-danger bg-dangerSoft px-4 py-3 font-body text-[13px] text-danger">
            {error}
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          {revisando.status === "Borrador" && (
            <Button
              size="lg"
              onClick={confirmar}
              disabled={!revisando.totals_match}
              // El backend rechaza igual una confirmación descuadrada; acá el
              // botón muestra la misma regla antes de intentar, en vez de
              // dejar hacer clic para después explicar por qué no.
              title={revisando.totals_match ? undefined : "El total de la factura no coincide con la suma de las líneas"}
            >
              <Icon name="check" size={16} /> Confirmar e ingresar mercadería
            </Button>
          )}
          {revisando.status === "Confirmado" && (
            <Button variant="outline" size="lg" onClick={revertir}>
              <Icon name="refresh" size={16} /> Revertir esta importación
            </Button>
          )}
        </div>
      </div>
    );
  }

  // ── Listado ──────────────────────────────────────────────────────────────
  return (
    <div>
      <AdminHeader
        title="Importaciones"
        icon="inventory"
        subtitle="Cargá facturas de proveedor para dar entrada a mercadería."
        action={<Button onClick={() => setAbierto(true)}><Icon name="plus" size={16} /> Nueva importación</Button>}
      />

      {error && !abierto && <div className="mb-4 font-body text-[13px] text-danger">{error}</div>}

      {batches === null ? (
        <CenteredSpinner label="Cargando importaciones…" />
      ) : batches.length === 0 ? (
        <EmptyState
          icon={<Icon name="inventory" size={24} />}
          title="Todavía no importaste ninguna factura"
          message="Subí el Excel que te manda el proveedor y revisá las líneas antes de que toquen tu stock."
          action={<Button onClick={() => setAbierto(true)}>Nueva importación</Button>}
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-white">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-border bg-surface">
                {["Archivo", "Proveedor", "Fecha", "Líneas", "Total", "Estado", ""].map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-body text-[11.5px] font-semibold text-textFaint">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {batches.map((b) => (
                <tr
                  key={b.id}
                  onClick={() => setRevisando(b)}
                  className="cursor-pointer border-b border-border last:border-b-0 hover:bg-surface"
                >
                  <td className="px-4 py-3 font-body text-[13.5px] font-semibold text-ink900">{b.filename}</td>
                  <td className="px-4 py-3 font-body text-[13px] text-textMuted">{b.supplier_name}</td>
                  <td className="px-4 py-3 font-body text-[12.5px] text-textMuted">{formatDateTime(b.created_at)}</td>
                  <td className="px-4 py-3 font-mono text-[12.5px]">{b.lines.length}</td>
                  <td className="px-4 py-3 font-mono text-[12.5px]">{formatPrice(b.lines_total)}</td>
                  <td className="px-4 py-3"><Badge tone={ESTADO_TONO[b.status]}>{b.status}</Badge></td>
                  <td className="px-4 py-3 text-right">
                    {b.status === "Borrador" && !b.totals_match && (
                      <span className="font-body text-[12px] text-warning">Revisar</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Asistente de subida */}
      <Modal
        open={abierto}
        onClose={cerrarAsistente}
        eyebrow="NUEVA"
        title="Importar factura"
        width={640}
        footer={
          <>
            {error && <div className="flex-1 font-body text-[12.5px] text-danger">{error}</div>}
            {!error && faltante && (
              // Un botón deshabilitado sin motivo visible es exactamente el
              // problema que tenía el selector de archivo. Se dice qué falta.
              <div className="flex-1 font-body text-[12.5px] text-textFaint">Falta {faltante}.</div>
            )}
            <Button
              onClick={esExcel ? subir : subirManual}
              disabled={subiendo || !!faltante}
              fullWidth={!error && !faltante}
            >
              {subiendo ? "Procesando…" : esExcel ? "Leer y revisar" : "Guardar y cargar a mano"}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-5">
          <Field label="Proveedor *">
            <Select
              value={supplierId}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                setSupplierId(e.target.value ? Number(e.target.value) : "");
                // El archivo NO se limpia: si ya lo elegiste, el efecto de
                // arriba vuelve a pedir el preview con el proveedor nuevo.
                setPreview(null);
              }}
            >
              <option value="">Elegí un proveedor…</option>
              {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          </Field>

          <Field
            label="Archivo de la factura *"
            hint="Excel (.xlsx) o PDF se leen solos. Un escaneo o una foto se cargan a mano, con el documento al lado."
          >
            {/* El input nativo va escondido y el botón visible es un <label>
                apuntado a él.
                Motivo: el texto del `<input type="file">` ("Choose file",
                "Sin archivos seleccionados") lo dibuja el navegador según SU
                idioma, y no hay forma de cambiarlo ni con CSS ni con JS. La
                única manera de tenerlo en español es no mostrarlo. */}
            <input
              id="archivo-factura"
              type="file"
              accept=".xlsx,.pdf,image/*"
              onChange={(e) => e.target.files?.[0] && elegirArchivo(e.target.files[0])}
              className="sr-only"
            />
            <div className="flex flex-wrap items-center gap-3">
              <label
                htmlFor="archivo-factura"
                className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-borderStrong bg-white px-4 py-2.5 font-body text-[13.5px] font-semibold text-ink900 transition-colors duration-150 hover:border-primary hover:text-primary"
              >
                <Icon name="box" size={15} />
                {file ? "Cambiar archivo" : "Elegir archivo…"}
              </label>
              <span className="min-w-0 flex-1 truncate font-body text-[13px] text-textFaint" title={file?.name}>
                {file ? file.name : "Ningún archivo seleccionado"}
              </span>
            </div>
          </Field>

          {/* Un archivo que no es Excel no se intenta parsear: se guarda y se
              muestra al lado de la grilla. Es el camino de la fase 5, y el
              único razonable para una factura escaneada. */}
          {file && !esExcel && (
            <>
              <div className="rounded-md border border-border bg-surface px-4 py-3 font-body text-[12.5px] leading-snug text-textMuted">
                <strong className="text-ink900">{file.name}</strong> se va a guardar y mostrar al lado de la grilla.
                Si es un PDF con texto, se intenta leer la tabla sola y vas a tener que verificar el
                resultado; si es un escaneo o una foto, cargás las líneas a mano.
                El control contra el total de la factura funciona igual en los dos casos.
              </div>

              <Field
                label="Total de la factura"
                hint="El importe final que figura en el papel. Es lo que verifica que no se te haya escapado ninguna línea."
              >
                <Input
                  value={total}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTotal(e.target.value)}
                  placeholder="Ej. 154300.50"
                />
              </Field>
            </>
          )}

          {/* El aviso de duplicado va arriba de todo y es lo único que
              importa si aparece: nada de lo de abajo tiene sentido si esta
              factura ya se procesó. No bloquea -- reimportar después de
              revertir es un caso legítimo -- pero lo dice fuerte. */}
          {duplicado?.found && (
            <div className="rounded-md border border-danger bg-dangerSoft px-4 py-3.5">
              <div className="flex items-center gap-2 font-body text-[13.5px] font-semibold text-danger">
                <Icon name="alert" size={16} />
                Esta factura ya se importó
              </div>
              <p className="m-0 mt-1.5 font-body text-[12.5px] leading-relaxed text-textMuted">
                El mismo archivo se subió como <strong>{duplicado.filename}</strong>
                {duplicado.supplier_name && <> para <strong>{duplicado.supplier_name}</strong></>}
                {duplicado.created_at && <> el {formatDateTime(duplicado.created_at)}</>}, y está en estado{" "}
                <strong>{duplicado.status}</strong>.
                {duplicado.status === "Confirmado"
                  ? " Si la volvés a confirmar, el stock se va a sumar dos veces."
                  : " Podés seguir igual si sabés lo que estás haciendo."}
              </p>
              {duplicado.batch_id != null && (
                <button
                  onClick={() => {
                    const id = duplicado.batch_id!;
                    cerrarAsistente();
                    importApi.get(id).then(setRevisando).catch(() => undefined);
                  }}
                  className="mt-2 cursor-pointer border-none bg-transparent p-0 font-body text-[12.5px] font-semibold text-danger underline"
                >
                  Ver la importación anterior
                </button>
              )}
            </div>
          )}

          {preview && (
            <>
              {/* El mapeo se resuelve solo cuando se puede. Lo que cambia es
                  cuánta atención hay que prestarle, y eso se dice explícito
                  en vez de dejar que el usuario lo deduzca. */}
              <div
                className={clsx(
                  "rounded-md border px-4 py-3 font-body text-[12.5px] leading-snug",
                  preview.mapping_source === "guardado" ? "border-[#BBF7D0] bg-successSoft text-success"
                  : preview.mapping_source === "cambiado" ? "border-[#FDE68A] bg-warningSoft text-warning"
                  : "border-border bg-surface text-textMuted"
                )}
              >
                {preview.mapping_source === "guardado" && (
                  <><strong>Formato reconocido.</strong> Se aplicó el mapeo guardado de este proveedor y todas las columnas coinciden. No hace falta que toques nada.</>
                )}
                {preview.mapping_source === "cambiado" && (
                  <><strong>El formato cambió.</strong> El mapeo guardado de este proveedor apunta a columnas que ya no están en el archivo. Revisá las asignaciones de abajo; se van a guardar las nuevas.</>
                )}
                {preview.mapping_source === "sugerido" && (
                  <><strong>Primera importación de este proveedor.</strong> Se adivinaron las columnas por el nombre del encabezado: verificá que estén bien y se guardan para las próximas.</>
                )}
                {preview.mapping_source === "ninguno" && (
                  <><strong>No se pudieron reconocer las columnas.</strong> Asignalas a mano abajo; se guardan para las próximas facturas de este proveedor.</>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                {CAMPOS.map((campo) => (
                  <Field key={campo.key} label={campo.required ? `${campo.label} *` : campo.label}>
                    <Select
                      value={mapping[campo.key] ?? ""}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                        setMapping((m) => ({ ...m, [campo.key]: e.target.value }))
                      }
                    >
                      <option value="">— sin asignar —</option>
                      {preview.headers.map((h) => <option key={h} value={h}>{h}</option>)}
                    </Select>
                  </Field>
                ))}
              </div>

              <Field
                label="Total de la factura"
                hint="El importe final que figura en el papel. Se usa para verificar que no se haya leído mal ninguna línea."
              >
                <Input
                  value={total}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTotal(e.target.value)}
                  placeholder="Ej. 154300.50"
                />
              </Field>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}
