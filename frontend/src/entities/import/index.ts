import { api } from "@/shared/api";

/** Qué se va a hacer con cada línea al confirmar. Los valores son los que
 *  devuelve el backend (`LineResolution` en models/import_batch.py). */
export type LineResolution = "Producto nuevo" | "Reposición" | "Conflicto de SKU" | "Ignorar";

export type ImportStatus = "Borrador" | "Confirmado" | "Revertido";

export type ImportLine = {
  id: number;
  /** Fila del Excel de la que salió, para poder señalarla en el archivo original. */
  row_number: number;
  sku: string;
  name: string;
  quantity: number;
  unit_cost: number | null;
  resolution: LineResolution;
  product_id: number | null;
  subtotal: number;
  /** Salió de una extracción automática de PDF. Se marca en la revisión:
   *  una línea leída por una máquina merece más atención que una tipeada. */
  is_auto: boolean;
};

export type ImportBatch = {
  id: number;
  supplier_id: number;
  filename: string;
  /** Total que declara la factura. Es el control cruzado. */
  declared_total: number | null;
  status: ImportStatus;
  notes: string | null;
  created_at: string;
  confirmed_at: string | null;
  supplier_name: string;
  lines: ImportLine[];
  /** Suma de las líneas no ignoradas. Lo calcula el backend porque depende
   *  del estado actual de las líneas, que cambia con cada corrección. */
  lines_total: number;
  /** `false` bloquea la confirmación. */
  totals_match: boolean;
  /** Hay archivo original guardado: la pantalla muestra el visor al lado
   *  de la grilla. Los bytes se piden aparte, no viajan acá. */
  has_file: boolean;
};

/** De dónde sale el mapeo que se va a aplicar. */
export type MappingSource = "guardado" | "cambiado" | "sugerido" | "ninguno";

export type ImportPreview = {
  headers: string[];
  /** Adivinado a partir de los encabezados, para pre-completar el formulario. */
  suggested_mapping: Record<string, string>;
  /** El que ya se guardó para este proveedor en importaciones anteriores. */
  saved_mapping: Record<string, string>;
  mapping_source: MappingSource;
};

export type DuplicateCheck = {
  found: boolean;
  batch_id: number | null;
  filename: string | null;
  supplier_name: string | null;
  status: ImportStatus | null;
  created_at: string | null;
};

export type ImportConfirmResult = {
  batch_id: number;
  created: number;
  updated: number;
  skipped: number;
};

export type ColumnMapping = {
  sku: string;
  name: string;
  quantity: string;
  unit_cost?: string;
};

/**
 * SHA-256 del archivo, calculado en el navegador.
 *
 * Se hace acá y no en el servidor para poder preguntar "¿esto ya lo importé?"
 * ANTES de subir nada: el aviso llega antes de procesar la factura, no
 * después. Tiene que dar exactamente lo mismo que `hashlib.sha256` del
 * backend, o el aviso no se dispararía nunca y nadie se daría cuenta.
 *
 * `crypto.subtle` solo existe en contexto seguro: HTTPS o localhost. Los dos
 * casos de este proyecto están cubiertos.
 */
export async function hashArchivo(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export const importApi = {
  checkDuplicate: (hash: string) =>
    api.get<DuplicateCheck>(`/imports/by-hash/${hash}`).then((r) => r.data),

  /** Lee los encabezados sin crear nada, para poder mostrar el mapeo
   *  pre-completado antes de comprometer el archivo. */
  preview: (supplierId: number, file: File) => {
    const form = new FormData();
    form.append("file", file);
    return api
      .post<ImportPreview>(`/suppliers/${supplierId}/imports/preview`, form)
      .then((r) => r.data);
  },

  create: (supplierId: number, file: File, mapping: ColumnMapping, declaredTotal: number | null, remember: boolean) => {
    const form = new FormData();
    form.append("file", file);
    form.append("mapping_sku", mapping.sku);
    form.append("mapping_name", mapping.name);
    form.append("mapping_quantity", mapping.quantity);
    if (mapping.unit_cost) form.append("mapping_unit_cost", mapping.unit_cost);
    if (declaredTotal != null) form.append("declared_total", String(declaredTotal));
    form.append("remember_mapping", String(remember));
    return api.post<ImportBatch>(`/suppliers/${supplierId}/imports`, form).then((r) => r.data);
  },

  /** Crea un lote VACÍO a partir de un archivo que no se puede parsear (un
   *  PDF). Las líneas se cargan a mano mirando el documento. */
  createManual: (supplierId: number, file: File, declaredTotal: number | null) => {
    const form = new FormData();
    form.append("file", file);
    if (declaredTotal != null) form.append("declared_total", String(declaredTotal));
    return api.post<ImportBatch>(`/suppliers/${supplierId}/imports/manual`, form).then((r) => r.data);
  },

  /** URL del archivo original. Se usa como `src` de un iframe: el navegador
   *  manda las cookies de sesión solo, así que la ruta admin funciona. */
  fileUrl: (id: number) => `/api/imports/${id}/file`,

  addLine: (batchId: number, data: { sku: string; name: string; quantity: number; unit_cost: number | null }) =>
    api.post<ImportBatch>(`/imports/${batchId}/lines`, data).then((r) => r.data),

  deleteLine: (batchId: number, lineId: number) =>
    api.delete<ImportBatch>(`/imports/${batchId}/lines/${lineId}`).then((r) => r.data),

  list: (params: { supplier_id?: number; skip?: number; limit?: number } = {}) =>
    api.get<{ items: ImportBatch[]; total: number }>("/imports", { params }).then((r) => r.data),

  get: (id: number) => api.get<ImportBatch>(`/imports/${id}`).then((r) => r.data),

  updateLine: (batchId: number, lineId: number, data: Partial<Pick<ImportLine, "sku" | "name" | "quantity" | "unit_cost" | "product_id">> & { resolution?: string }) =>
    api.patch<ImportBatch>(`/imports/${batchId}/lines/${lineId}`, data).then((r) => r.data),

  /** El backend los recibe como query params, no como body. */
  updateBatch: (id: number, params: { declared_total?: number; notes?: string }) =>
    api.patch<ImportBatch>(`/imports/${id}`, null, { params }).then((r) => r.data),

  confirm: (id: number) => api.post<ImportConfirmResult>(`/imports/${id}/confirm`).then((r) => r.data),
  revert: (id: number) => api.post<ImportConfirmResult>(`/imports/${id}/revert`).then((r) => r.data),
};
