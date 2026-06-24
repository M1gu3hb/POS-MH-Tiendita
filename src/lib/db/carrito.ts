import { supabase } from '@/lib/db/supabase';
import type { CarritoActivo, CarritoItem, Producto } from '@/lib/db/types';

/**
 * Repositorio del carrito RELACIONAL (carritos_activos + carrito_items).
 * Reemplaza el anti-patrón `items_json` de `base44.entities.CarritoActivo`.
 *
 * Un carrito activo por corte de caja. Los renglones viven en `carrito_items`.
 * El sync en vivo (escáner ↔ POS ↔ vista cliente) se hace con Supabase Realtime
 * sobre estas tablas (ver hook useCarritoActivo).
 */

export interface CarritoConItems {
  carrito: CarritoActivo;
  items: CarritoItem[];
}

function recompute(items: CarritoItem[]) {
  const subtotal = items.reduce((s, i) => s + (i.subtotal || 0), 0);
  const descuento_total = items.reduce((s, i) => s + (i.descuento || 0), 0);
  const cantidad_items = items.reduce((s, i) => s + (i.cantidad || 0), 0);
  return { subtotal, descuento_total, total: subtotal - descuento_total, cantidad_items };
}

export async function getItems(carritoId: string): Promise<CarritoItem[]> {
  const { data, error } = await supabase
    .from('carrito_items')
    .select('*')
    .eq('carrito_id', carritoId)
    .order('id', { ascending: true })
    .returns<CarritoItem[]>();

  if (error) throw error;
  return data ?? [];
}

/** Devuelve el carrito activo del corte o crea uno nuevo si no existe. */
export async function getOrCreateCarritoActivo(
  negocioId: string,
  corteId: string,
  cajeroId: string | null = null,
): Promise<CarritoActivo> {
  const { data: existente, error: selErr } = await supabase
    .from('carritos_activos')
    .select('*')
    .eq('negocio_id', negocioId)
    .eq('corte_id', corteId)
    .eq('estado', 'activo')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
    .returns<CarritoActivo | null>();

  if (selErr) throw selErr;
  if (existente) return existente;

  const { data: creado, error: insErr } = await supabase
    .from('carritos_activos')
    .insert({ negocio_id: negocioId, corte_id: corteId, cajero_id: cajeroId, estado: 'activo' })
    .select('*')
    .single()
    .returns<CarritoActivo>();

  if (insErr) throw insErr;
  return creado;
}

/** Recalcula y persiste los totales del carrito (bump de version). */
export async function recomputeTotals(carritoId: string): Promise<CarritoActivo> {
  const items = await getItems(carritoId);
  const totals = recompute(items);

  const { data: actual } = await supabase
    .from('carritos_activos')
    .select('version')
    .eq('id', carritoId)
    .maybeSingle()
    .returns<{ version: number } | null>();

  const { data: updated, error } = await supabase
    .from('carritos_activos')
    .update({ ...totals, version: (actual?.version ?? 0) + 1, updated_at: new Date().toISOString() })
    .eq('id', carritoId)
    .select('*')
    .single()
    .returns<CarritoActivo>();

  if (error) throw error;
  return updated;
}

/** Agrega un producto (o incrementa su cantidad si ya está en el carrito). */
export async function addProducto(
  carritoId: string,
  negocioId: string,
  producto: Producto,
): Promise<void> {
  const items = await getItems(carritoId);
  const existente = items.find((i) => i.producto_id === producto.id);

  if (existente) {
    const cantidad = existente.cantidad + 1;
    const { error } = await supabase
      .from('carrito_items')
      .update({ cantidad, subtotal: cantidad * existente.precio_unitario })
      .eq('id', existente.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('carrito_items').insert({
      carrito_id: carritoId,
      negocio_id: negocioId,
      producto_id: producto.id,
      producto_nombre: producto.nombre,
      sku: producto.sku,
      codigo_barras: producto.codigo_barras,
      cantidad: 1,
      precio_unitario: producto.precio_venta,
      costo_unitario: producto.costo_unitario,
      descuento: 0,
      subtotal: producto.precio_venta,
      es_mayoreo: false,
    });
    if (error) throw error;
  }

  await recomputeTotals(carritoId);
}

export async function setItemCantidad(
  carritoId: string,
  itemId: string,
  cantidad: number,
): Promise<void> {
  if (cantidad <= 0) {
    await removeItem(carritoId, itemId);
    return;
  }
  const { data: item } = await supabase
    .from('carrito_items')
    .select('precio_unitario')
    .eq('id', itemId)
    .maybeSingle()
    .returns<{ precio_unitario: number } | null>();

  if (!item) return;

  const { error } = await supabase
    .from('carrito_items')
    .update({ cantidad, subtotal: cantidad * item.precio_unitario })
    .eq('id', itemId);
  if (error) throw error;

  await recomputeTotals(carritoId);
}

export async function removeItem(carritoId: string, itemId: string): Promise<void> {
  const { error } = await supabase.from('carrito_items').delete().eq('id', itemId);
  if (error) throw error;
  await recomputeTotals(carritoId);
}

export async function clearCarrito(carritoId: string): Promise<void> {
  const { error } = await supabase.from('carrito_items').delete().eq('carrito_id', carritoId);
  if (error) throw error;
  await recomputeTotals(carritoId);
}

/** Cierra el carrito tras cobrar y crea uno nuevo activo para el mismo corte. */
export async function cerrarCarrito(
  carritoId: string,
  negocioId: string,
  corteId: string,
  cajeroId: string | null = null,
): Promise<CarritoActivo> {
  await supabase.from('carrito_items').delete().eq('carrito_id', carritoId);
  await supabase
    .from('carritos_activos')
    .update({ estado: 'cerrado', subtotal: 0, descuento_total: 0, total: 0, cantidad_items: 0 })
    .eq('id', carritoId);

  // Forzar la creación de un carrito nuevo activo.
  const { data: creado, error } = await supabase
    .from('carritos_activos')
    .insert({ negocio_id: negocioId, corte_id: corteId, cajero_id: cajeroId, estado: 'activo' })
    .select('*')
    .single()
    .returns<CarritoActivo>();

  if (error) throw error;
  return creado;
}
