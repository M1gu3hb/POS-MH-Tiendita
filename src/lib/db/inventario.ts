import { supabase } from '@/lib/db/supabase';
import type { MovimientoInventario } from '@/lib/db/types';

/**
 * Repositorio de `movimientos_inventario` (kardex). Reemplaza
 * `base44.entities.MovimientoInventario`.
 *
 * Nota: los AJUSTES de inventario que requieren auditoría se ejecutan en una
 * API Route server-side (escribe en audit_log). Aquí: registro y lectura del kardex.
 */

export type MovimientoCreate = Omit<MovimientoInventario, 'id' | 'fecha'> & { fecha?: string };

interface GetMovimientosOptions {
  productoId?: string;
  limit?: number;
}

export async function getMovimientos(
  negocioId: string,
  options: GetMovimientosOptions = {},
): Promise<MovimientoInventario[]> {
  let query = supabase
    .from('movimientos_inventario')
    .select('*')
    .eq('negocio_id', negocioId)
    .order('fecha', { ascending: false });

  if (options.productoId) query = query.eq('producto_id', options.productoId);
  if (options.limit) query = query.limit(options.limit);

  const { data, error } = await query.returns<MovimientoInventario[]>();
  if (error) throw error;
  return data ?? [];
}

export async function createMovimiento(data: MovimientoCreate): Promise<MovimientoInventario> {
  const { data: created, error } = await supabase
    .from('movimientos_inventario')
    .insert(data)
    .select('*')
    .single()
    .returns<MovimientoInventario>();

  if (error) throw error;
  return created;
}

/** Actualiza el stock de un producto y registra el movimiento correspondiente. */
export async function ajustarStock(params: {
  negocioId: string;
  productoId: string;
  productoNombre: string;
  stockAnterior: number;
  stockNuevo: number;
  tipoMovimiento: MovimientoInventario['tipo_movimiento'];
  usuarioId?: string | null;
  usuarioNombre?: string | null;
  motivo?: string | null;
  costoUnitario?: number;
  referenciaTipo?: string | null;
  referenciaId?: string | null;
}): Promise<void> {
  const { error: updErr } = await supabase
    .from('productos')
    .update({ stock_actual: params.stockNuevo })
    .eq('id', params.productoId);
  if (updErr) throw updErr;

  await createMovimiento({
    negocio_id: params.negocioId,
    producto_id: params.productoId,
    producto_nombre: params.productoNombre,
    usuario_id: params.usuarioId ?? null,
    usuario_nombre: params.usuarioNombre ?? null,
    tipo_movimiento: params.tipoMovimiento,
    cantidad: params.stockNuevo - params.stockAnterior,
    unidad: null,
    stock_anterior: params.stockAnterior,
    stock_nuevo: params.stockNuevo,
    costo_unitario: params.costoUnitario ?? 0,
    referencia_tipo: params.referenciaTipo ?? null,
    referencia_id: params.referenciaId ?? null,
    motivo: params.motivo ?? null,
  });
}
