import { supabase } from '@/lib/db/supabase';
import type { CompraMercancia, DetalleCompra, GastoOperativo } from '@/lib/db/types';

/**
 * Repositorio de egresos: `compras_mercancia` + `detalle_compras` + `gastos_operativos`.
 * Reemplaza `base44.entities.CompraMercancia` y `base44.entities.GastoOperativo`.
 */

// ── Compras de mercancía ─────────────────────────────────────
export type CompraCreate = { negocio_id: string; proveedor_nombre: string; fecha: string } & Partial<
  Omit<CompraMercancia, 'id' | 'created_at'>
>;
export type DetalleCompraCreate = Omit<DetalleCompra, 'id'>;

export interface NuevaCompraInput {
  compra: CompraCreate;
  detalle: Array<Omit<DetalleCompraCreate, 'compra_id'>>;
}

export async function getCompras(negocioId: string, limit = 100): Promise<CompraMercancia[]> {
  const { data, error } = await supabase
    .from('compras_mercancia')
    .select('*')
    .eq('negocio_id', negocioId)
    .order('fecha', { ascending: false })
    .limit(limit)
    .returns<CompraMercancia[]>();

  if (error) throw error;
  return data ?? [];
}

export async function createCompra(input: NuevaCompraInput): Promise<CompraMercancia> {
  const { data: compra, error } = await supabase
    .from('compras_mercancia')
    .insert(input.compra)
    .select('*')
    .single()
    .returns<CompraMercancia>();

  if (error) throw error;

  if (input.detalle.length > 0) {
    const renglones: DetalleCompraCreate[] = input.detalle.map((d) => ({
      ...d,
      compra_id: compra.id,
      negocio_id: input.compra.negocio_id,
    }));
    const { error: detError } = await supabase.from('detalle_compras').insert(renglones);
    if (detError) throw detError;
  }

  return compra;
}

// ── Gastos operativos ────────────────────────────────────────
export type GastoCreate = { negocio_id: string; concepto: string; fecha: string; monto: number } & Partial<
  Omit<GastoOperativo, 'id' | 'created_at'>
>;

interface GetGastosOptions {
  corteId?: string;
  desde?: string;
  hasta?: string;
  limit?: number;
}

export async function getGastos(
  negocioId: string,
  options: GetGastosOptions = {},
): Promise<GastoOperativo[]> {
  let query = supabase
    .from('gastos_operativos')
    .select('*')
    .eq('negocio_id', negocioId)
    .order('fecha', { ascending: false });

  if (options.corteId) query = query.eq('corte_id', options.corteId);
  if (options.desde) query = query.gte('fecha', options.desde);
  if (options.hasta) query = query.lte('fecha', options.hasta);
  if (options.limit) query = query.limit(options.limit);

  const { data, error } = await query.returns<GastoOperativo[]>();
  if (error) throw error;
  return data ?? [];
}

export async function createGasto(data: GastoCreate): Promise<GastoOperativo> {
  const { data: created, error } = await supabase
    .from('gastos_operativos')
    .insert(data)
    .select('*')
    .single()
    .returns<GastoOperativo>();

  if (error) throw error;
  return created;
}
