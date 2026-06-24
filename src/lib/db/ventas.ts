import { supabase } from '@/lib/db/supabase';
import type { DetalleVenta, Venta } from '@/lib/db/types';

/**
 * Repositorio de `ventas` + `detalle_ventas`. Reemplaza `base44.entities.Venta`
 * y `base44.entities.DetalleVenta`.
 *
 * Nota: la CANCELACIÓN de ventas vive en una API Route server-side (escribe en
 * `audit_log` con service role; ver app/api). Aquí solo creación y lectura.
 */

export type VentaCreate = { negocio_id: string; cajero_nombre: string; folio: string } & Partial<
  Omit<Venta, 'id' | 'created_at'>
>;

export type DetalleVentaCreate = Omit<DetalleVenta, 'id'>;

export interface NuevaVentaInput {
  venta: VentaCreate;
  detalle: Array<Omit<DetalleVentaCreate, 'venta_id'>>;
}

interface GetVentasOptions {
  desde?: string; // ISO
  hasta?: string; // ISO
  corteId?: string;
  limit?: number;
}

export async function getVentas(negocioId: string, options: GetVentasOptions = {}): Promise<Venta[]> {
  let query = supabase
    .from('ventas')
    .select('*')
    .eq('negocio_id', negocioId)
    .order('fecha', { ascending: false });

  if (options.corteId) query = query.eq('corte_id', options.corteId);
  if (options.desde) query = query.gte('fecha', options.desde);
  if (options.hasta) query = query.lte('fecha', options.hasta);
  if (options.limit) query = query.limit(options.limit);

  const { data, error } = await query.returns<Venta[]>();
  if (error) throw error;
  return data ?? [];
}

export async function getVentaById(id: string): Promise<Venta | null> {
  const { data, error } = await supabase
    .from('ventas')
    .select('*')
    .eq('id', id)
    .maybeSingle()
    .returns<Venta | null>();

  if (error) throw error;
  return data ?? null;
}

/** Todos los renglones de venta del negocio (para reportes/resúmenes). */
export async function getDetalleVentasByNegocio(negocioId: string, limit = 2000): Promise<DetalleVenta[]> {
  const { data, error } = await supabase
    .from('detalle_ventas')
    .select('*')
    .eq('negocio_id', negocioId)
    .limit(limit)
    .returns<DetalleVenta[]>();

  if (error) throw error;
  return data ?? [];
}

export async function getDetalleByVenta(ventaId: string): Promise<DetalleVenta[]> {
  const { data, error } = await supabase
    .from('detalle_ventas')
    .select('*')
    .eq('venta_id', ventaId)
    .returns<DetalleVenta[]>();

  if (error) throw error;
  return data ?? [];
}

/**
 * Crea una venta con sus renglones. Inserta la cabecera y luego el detalle.
 * (Para garantía transaccional estricta, mover a una RPC en una fase posterior;
 * ver docs/BUGS_PENDING.md.)
 */
export async function createVenta(input: NuevaVentaInput): Promise<Venta> {
  const { data: venta, error } = await supabase
    .from('ventas')
    .insert(input.venta)
    .select('*')
    .single()
    .returns<Venta>();

  if (error) throw error;

  if (input.detalle.length > 0) {
    const renglones: DetalleVentaCreate[] = input.detalle.map((d) => ({
      ...d,
      venta_id: venta.id,
      negocio_id: input.venta.negocio_id,
    }));
    const { error: detError } = await supabase.from('detalle_ventas').insert(renglones);
    if (detError) throw detError;
  }

  return venta;
}
