/**
 * Exportación local de datos a CSV / JSON.
 *
 * - Sin Google, sin OAuth, sin red. Todo se descarga al dispositivo del usuario.
 * - No depende de librerías externas (jspdf u otras): solo Blob + URL.createObjectURL.
 * - Cada exportación filtra por `created_by` ya que las entidades de Base44 ya
 *   están aisladas por usuario en las queries del POS — el SDK retorna sólo
 *   los registros del usuario actual.
 *
 * API:
 *   downloadCSV(rows, filenameBase, columns?)
 *   downloadJSON(rows, filenameBase)
 *
 * `columns` opcional: array de { key, label } para fijar orden/encabezados.
 * Si se omite, se usan las claves del primer registro.
 */

function todayStamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`;
}

function escapeCSV(value) {
  if (value === null || value === undefined) return '';
  let s = typeof value === 'object' ? JSON.stringify(value) : String(value);
  // Reemplazar saltos de línea para que cada registro quede en una línea
  s = s.replace(/\r?\n/g, ' ');
  if (s.includes('"') || s.includes(',') || s.includes(';')) {
    s = `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadCSV(rows, filenameBase, columns) {
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error('Sin datos para exportar');
  }
  const cols = columns && columns.length
    ? columns
    : Object.keys(rows[0]).map((k) => ({ key: k, label: k }));

  const header = cols.map((c) => escapeCSV(c.label)).join(',');
  const body = rows
    .map((row) => cols.map((c) => escapeCSV(row[c.key])).join(','))
    .join('\n');

  // BOM para que Excel reconozca UTF-8 correctamente
  const csv = '\ufeff' + header + '\n' + body;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  triggerDownload(blob, `${filenameBase}_${todayStamp()}.csv`);
}

export function downloadJSON(rows, filenameBase) {
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error('Sin datos para exportar');
  }
  const json = JSON.stringify(rows, null, 2);
  const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
  triggerDownload(blob, `${filenameBase}_${todayStamp()}.json`);
}

/* ============================
   Definiciones de columnas
   Una por entidad — orden estable y legible para Excel.
   ============================ */

export const COLUMNS_PRODUCTOS = [
  { key: 'id', label: 'id' },
  { key: 'nombre', label: 'nombre' },
  { key: 'categoria_nombre', label: 'categoria' },
  { key: 'marca', label: 'marca' },
  { key: 'sku', label: 'sku' },
  { key: 'codigo_barras', label: 'codigo_barras' },
  { key: 'unidad_venta', label: 'unidad' },
  { key: 'precio_venta', label: 'precio_venta' },
  { key: 'costo_unitario', label: 'costo_unitario' },
  { key: 'stock_actual', label: 'stock_actual' },
  { key: 'stock_minimo', label: 'stock_minimo' },
  { key: 'proveedor_nombre', label: 'proveedor' },
  { key: 'activo', label: 'activo' },
  { key: 'created_date', label: 'fecha_alta' },
];

export const COLUMNS_VENTAS = [
  { key: 'folio', label: 'folio' },
  { key: 'fecha', label: 'fecha' },
  { key: 'estado', label: 'estado' },
  { key: 'cajero_nombre', label: 'cajero' },
  { key: 'subtotal', label: 'subtotal' },
  { key: 'descuento_total', label: 'descuento' },
  { key: 'total', label: 'total' },
  { key: 'costo_total_snapshot', label: 'costo' },
  { key: 'utilidad_bruta_snapshot', label: 'utilidad' },
  { key: 'metodo_pago', label: 'metodo_pago' },
  { key: 'monto_efectivo', label: 'efectivo' },
  { key: 'monto_tarjeta', label: 'tarjeta' },
  { key: 'monto_transferencia', label: 'transferencia' },
  { key: 'cambio', label: 'cambio' },
  { key: 'corte_id', label: 'corte_id' },
];

export const COLUMNS_CORTES = [
  { key: 'cajero_nombre', label: 'cajero' },
  { key: 'fecha_apertura', label: 'fecha_apertura' },
  { key: 'fecha_cierre', label: 'fecha_cierre' },
  { key: 'fondo_inicial', label: 'fondo_inicial' },
  { key: 'numero_ventas', label: 'num_ventas' },
  { key: 'total_ventas', label: 'total_ventas' },
  { key: 'total_efectivo', label: 'total_efectivo' },
  { key: 'total_tarjeta', label: 'total_tarjeta' },
  { key: 'total_transferencia', label: 'total_transferencia' },
  { key: 'total_gastos', label: 'total_gastos' },
  { key: 'utilidad_bruta', label: 'utilidad_bruta' },
  { key: 'utilidad_neta_estimada', label: 'utilidad_neta' },
  { key: 'efectivo_esperado', label: 'efectivo_esperado' },
  { key: 'efectivo_contado', label: 'efectivo_contado' },
  { key: 'diferencia', label: 'diferencia' },
  { key: 'efectivo_dejado_en_caja', label: 'efectivo_dejado' },
  { key: 'efectivo_retirado', label: 'efectivo_retirado' },
  { key: 'estado', label: 'estado' },
  { key: 'notas', label: 'notas' },
];

export const COLUMNS_GASTOS = [
  { key: 'fecha', label: 'fecha' },
  { key: 'concepto', label: 'concepto' },
  { key: 'categoria', label: 'categoria' },
  { key: 'monto', label: 'monto' },
  { key: 'metodo_pago', label: 'metodo_pago' },
  { key: 'recurrente', label: 'recurrente' },
  { key: 'notas', label: 'notas' },
  { key: 'usuario_nombre', label: 'usuario' },
];

export const COLUMNS_COMPRAS = [
  { key: 'fecha', label: 'fecha' },
  { key: 'proveedor_nombre', label: 'proveedor' },
  { key: 'total', label: 'total' },
  { key: 'metodo_pago', label: 'metodo_pago' },
  { key: 'notas', label: 'notas' },
  { key: 'usuario_nombre', label: 'usuario' },
];

export const COLUMNS_INVENTARIO = [
  { key: 'nombre', label: 'producto' },
  { key: 'categoria_nombre', label: 'categoria' },
  { key: 'sku', label: 'sku' },
  { key: 'codigo_barras', label: 'codigo_barras' },
  { key: 'unidad_venta', label: 'unidad' },
  { key: 'stock_actual', label: 'stock_actual' },
  { key: 'stock_minimo', label: 'stock_minimo' },
  { key: 'precio_venta', label: 'precio_venta' },
  { key: 'costo_unitario', label: 'costo_unitario' },
  { key: 'proveedor_nombre', label: 'proveedor' },
];