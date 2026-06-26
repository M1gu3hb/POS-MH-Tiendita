import { supabase } from '@/lib/db/supabase';

export interface ComboProductoItem {
  id: string;
  combo_id: string;
  producto_id: string;
  cantidad: number;
  productos?: {
    nombre: string;
    precio_venta: number;
  } | null;
}

export interface Combo {
  id: string;
  negocio_id: string;
  nombre: string;
  precio_combo: number;
  precio_sugerido: number | null;
  activo: boolean;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  created_at: string;
  updated_at: string;
  combo_productos?: ComboProductoItem[];
}

export interface ProductoComboStock {
  id: string;
  nombre: string;
  stock_actual: number;
  stock_minimo: number;
  unidad_venta: string | null;
  costo_unitario: number;
}

export async function getCombos(negocioId: string): Promise<Combo[]> {
  const { data, error } = await supabase
    .from('combos')
    .select('*, combo_productos(*, productos(nombre, precio_venta))')
    .eq('negocio_id', negocioId)
    .order('created_at', { ascending: false })
    .returns<Combo[]>();

  if (error) throw error;
  return data ?? [];
}

export async function getProductosComboStock(
  negocioId: string,
  productoIds: string[],
): Promise<ProductoComboStock[]> {
  const ids = Array.from(new Set(productoIds.filter(Boolean)));
  if (ids.length === 0) return [];

  const { data, error } = await supabase
    .from('productos')
    .select('id, nombre, stock_actual, stock_minimo, unidad_venta, costo_unitario')
    .eq('negocio_id', negocioId)
    .in('id', ids)
    .returns<ProductoComboStock[]>();

  if (error) throw error;
  return data ?? [];
}

export async function crearCombo(
  negocioId: string,
  comboData: {
    nombre: string;
    precio_combo: number;
    precio_sugerido: number | null;
    fecha_inicio: string | null;
    fecha_fin: string | null;
    productos: { producto_id: string; cantidad: number }[];
  }
): Promise<Combo> {
  // 1. Insertar cabecera del combo
  const { data: combo, error: comboError } = await supabase
    .from('combos')
    .insert({
      negocio_id: negocioId,
      nombre: comboData.nombre,
      precio_combo: comboData.precio_combo,
      precio_sugerido: comboData.precio_sugerido,
      fecha_inicio: comboData.fecha_inicio || null,
      fecha_fin: comboData.fecha_fin || null,
      activo: true,
    })
    .select('*')
    .single()
    .returns<Combo>();

  if (comboError) throw comboError;

  // 2. Insertar los productos asociados al combo
  if (comboData.productos && comboData.productos.length > 0) {
    const items = comboData.productos.map((p) => ({
      combo_id: combo.id,
      producto_id: p.producto_id,
      cantidad: p.cantidad,
    }));

    const { error: itemsError } = await supabase
      .from('combo_productos')
      .insert(items);

    if (itemsError) {
      // Revertir la inserción de la cabecera en caso de fallo
      await supabase.from('combos').delete().eq('id', combo.id);
      throw itemsError;
    }
  }

  return combo;
}

export async function actualizarCombo(
  comboId: string,
  comboData: {
    nombre: string;
    precio_combo: number;
    precio_sugerido: number | null;
    fecha_inicio: string | null;
    fecha_fin: string | null;
    activo?: boolean;
    productos?: { producto_id: string; cantidad: number }[];
  }
): Promise<Combo> {
  // 1. Actualizar cabecera del combo
  const { data: combo, error: comboError } = await supabase
    .from('combos')
    .update({
      nombre: comboData.nombre,
      precio_combo: comboData.precio_combo,
      precio_sugerido: comboData.precio_sugerido,
      fecha_inicio: comboData.fecha_inicio || null,
      fecha_fin: comboData.fecha_fin || null,
      activo: comboData.activo !== undefined ? comboData.activo : true,
    })
    .eq('id', comboId)
    .select('*')
    .single()
    .returns<Combo>();

  if (comboError) throw comboError;

  // 2. Actualizar la relación de productos (eliminamos y volvemos a insertar)
  if (comboData.productos) {
    const { error: deleteError } = await supabase
      .from('combo_productos')
      .delete()
      .eq('combo_id', comboId);

    if (deleteError) throw deleteError;

    if (comboData.productos.length > 0) {
      const items = comboData.productos.map((p) => ({
        combo_id: comboId,
        producto_id: p.producto_id,
        cantidad: p.cantidad,
      }));

      const { error: insertError } = await supabase
        .from('combo_productos')
        .insert(items);

      if (insertError) throw insertError;
    }
  }

  return combo;
}

export async function eliminarCombo(comboId: string): Promise<void> {
  const { error } = await supabase
    .from('combos')
    .delete()
    .eq('id', comboId);

  if (error) throw error;
}

export async function toggleCombo(comboId: string, activo: boolean): Promise<void> {
  const { error } = await supabase
    .from('combos')
    .update({ activo })
    .eq('id', comboId);

  if (error) throw error;
}
