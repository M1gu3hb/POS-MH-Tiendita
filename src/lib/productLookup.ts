import { getProductos } from '@/lib/db/productos';
import { normalizeBarcode, compareBarcodes } from '@/utils/barcodeUtils';
import type { Producto } from '@/lib/db/types';

/**
 * Búsqueda de productos por código de barras. Reemplaza la versión Base44.
 * Trae los activos del negocio y compara con normalización (por si el código
 * guardado tiene espacios). RLS ya limita al negocio; pasamos negocioId explícito.
 */

export type LookupResult =
  | { status: 'found'; producto: Producto }
  | { status: 'not_found' }
  | { status: 'duplicate'; productos: Producto[] };

export async function lookupProductoByCodigo(negocioId: string, codigo: string): Promise<LookupResult> {
  const code = normalizeBarcode(codigo);
  if (!code) return { status: 'not_found' };

  const matches = await getProductos(negocioId, { soloActivos: true });
  const exact = matches.filter((p) => p.codigo_barras && compareBarcodes(p.codigo_barras, code));

  if (exact.length === 0) return { status: 'not_found' };
  if (exact.length === 1) return { status: 'found', producto: exact[0] };
  return { status: 'duplicate', productos: exact };
}

/**
 * Resolver SÍNCRONO sobre una lista local de productos ya cargada (POS).
 * Evita un round-trip cuando el producto ya está en memoria.
 */
export function resolveProductByBarcode(codigo: string, productos: Producto[]): LookupResult {
  const code = normalizeBarcode(codigo);
  if (!code) return { status: 'not_found' };
  const exact = (productos || []).filter(
    (p) => p.activo !== false && p.codigo_barras && compareBarcodes(p.codigo_barras, code),
  );
  if (exact.length === 0) return { status: 'not_found' };
  if (exact.length === 1) return { status: 'found', producto: exact[0] };
  return { status: 'duplicate', productos: exact };
}

export async function checkCodigoDuplicado(
  negocioId: string,
  codigo: string,
  excludeId: string | null = null,
): Promise<{ duplicate: boolean; productoConflicto?: Producto }> {
  const code = normalizeBarcode(codigo);
  if (!code) return { duplicate: false };

  const all = await getProductos(negocioId, { soloActivos: true });
  const conflicto = all.find(
    (p) => p.id !== excludeId && p.codigo_barras && compareBarcodes(p.codigo_barras, code),
  );
  return conflicto ? { duplicate: true, productoConflicto: conflicto } : { duplicate: false };
}
