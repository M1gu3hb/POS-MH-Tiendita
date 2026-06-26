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

// ─────────────────────────────────────────────────────────────
// Conteo / arqueo de inventario (anti robo hormiga)
// Tablas: conteos_inventario + conteo_detalle (migración 018_conteo_mermas).
// ─────────────────────────────────────────────────────────────

export interface ProductoConteo {
  id: string;
  nombre: string;
  stock_sistema: number;
  costo_unitario: number;
}

export interface ConteoInventario {
  id: string;
  negocio_id: string;
  fecha: string;
  usuario_nombre: string | null;
  total_productos: number;
  productos_con_diferencia: number;
  valor_diferencia: number;
  notas: string | null;
  created_at: string;
}

export interface ConteoDetalleInput {
  producto_id: string;
  stock_contado: number;
}

export interface GuardarConteoInput {
  usuarioNombre?: string | null;
  notas?: string | null;
  detalles: ConteoDetalleInput[];
}

/** Devuelve todos los productos activos del negocio con su stock de sistema y costo. */
export async function iniciarConteo(negocioId: string): Promise<ProductoConteo[]> {
  const { data, error } = await supabase
    .from('productos')
    .select('id, nombre, stock_actual, costo_unitario')
    .eq('negocio_id', negocioId)
    .eq('activo', true)
    .order('nombre', { ascending: true })
    .returns<{ id: string; nombre: string; stock_actual: number | null; costo_unitario: number | null }[]>();
  if (error) throw error;
  return (data ?? []).map((p) => ({
    id: p.id,
    nombre: p.nombre,
    stock_sistema: Number(p.stock_actual ?? 0),
    costo_unitario: Number(p.costo_unitario ?? 0),
  }));
}

/**
 * Guarda un conteo físico y su detalle. Calcula diferencia y valor (a costo) por
 * producto contra el stock de sistema autoritativo (re-leído aquí, no del cliente).
 * NO ajusta el stock automáticamente: solo reporta (el ajuste lo decide el dueño).
 */
export async function guardarConteo(
  negocioId: string,
  input: GuardarConteoInput,
): Promise<ConteoInventario> {
  const ids = input.detalles.map((d) => d.producto_id);
  const { data: prods, error: pErr } = await supabase
    .from('productos')
    .select('id, stock_actual, costo_unitario')
    .eq('negocio_id', negocioId)
    .in('id', ids)
    .returns<{ id: string; stock_actual: number | null; costo_unitario: number | null }[]>();
  if (pErr) throw pErr;
  const mapa = new Map((prods ?? []).map((p) => [p.id, p]));

  let productosConDiferencia = 0;
  let valorDiferenciaTotal = 0;
  const detalleRows = input.detalles.map((d) => {
    const prod = mapa.get(d.producto_id);
    const stockSistema = Math.round(Number(prod?.stock_actual ?? 0));
    const stockContado = Math.round(Number(d.stock_contado ?? 0));
    const diferencia = stockContado - stockSistema;
    const valor = Number((diferencia * Number(prod?.costo_unitario ?? 0)).toFixed(2));
    if (diferencia !== 0) productosConDiferencia += 1;
    valorDiferenciaTotal += valor;
    return { producto_id: d.producto_id, stock_sistema: stockSistema, stock_contado: stockContado, diferencia, valor_diferencia: valor };
  });

  const { data: conteo, error: cErr } = await supabase
    .from('conteos_inventario')
    .insert({
      negocio_id: negocioId,
      usuario_nombre: input.usuarioNombre ?? null,
      total_productos: input.detalles.length,
      productos_con_diferencia: productosConDiferencia,
      valor_diferencia: Number(valorDiferenciaTotal.toFixed(2)),
      notas: input.notas ?? null,
    })
    .select('*')
    .single()
    .returns<ConteoInventario>();
  if (cErr) throw cErr;

  if (detalleRows.length > 0) {
    const rows = detalleRows.map((r) => ({ ...r, conteo_id: conteo.id }));
    const { error: dErr } = await supabase.from('conteo_detalle').insert(rows);
    if (dErr) throw dErr;
  }

  return conteo;
}

/** Historial de conteos del negocio (más reciente primero). */
export async function getConteos(negocioId: string): Promise<ConteoInventario[]> {
  const { data, error } = await supabase
    .from('conteos_inventario')
    .select('*')
    .eq('negocio_id', negocioId)
    .order('fecha', { ascending: false })
    .returns<ConteoInventario[]>();
  if (error) throw error;
  return data ?? [];
}

export type MotivoMerma = 'roto' | 'caducado' | 'echado_a_perder' | 'otro';

/**
 * Registra una merma: descuenta `cantidad` del stock del producto Y registra el
 * movimiento como `merma` en el kardex existente (movimientos_inventario). No crea
 * tabla nueva — reutiliza `ajustarStock` con tipoMovimiento 'merma'.
 */
export async function registrarMerma(
  negocioId: string,
  input: { producto_id: string; cantidad: number; motivo: MotivoMerma; usuarioNombre?: string | null },
): Promise<void> {
  const { data: prod, error: pErr } = await supabase
    .from('productos')
    .select('id, nombre, stock_actual, costo_unitario')
    .eq('id', input.producto_id)
    .eq('negocio_id', negocioId)
    .maybeSingle()
    .returns<{ id: string; nombre: string; stock_actual: number | null; costo_unitario: number | null }>();
  if (pErr) throw pErr;
  if (!prod) throw new Error('Producto no encontrado');

  const stockAnterior = Number(prod.stock_actual ?? 0);
  const cantidad = Math.max(0, Number(input.cantidad ?? 0));
  const stockNuevo = Math.max(0, stockAnterior - cantidad);

  await ajustarStock({
    negocioId,
    productoId: prod.id,
    productoNombre: prod.nombre,
    stockAnterior,
    stockNuevo,
    tipoMovimiento: 'merma',
    usuarioNombre: input.usuarioNombre ?? null,
    motivo: input.motivo,
    costoUnitario: Number(prod.costo_unitario ?? 0),
    referenciaTipo: 'merma',
  });
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
