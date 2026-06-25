import { supabase } from '@/lib/db/supabase';
import type { Producto } from '@/lib/db/types';

/**
 * Repositorio de `productos`. Única capa que toca Supabase para esta entidad.
 * RLS aísla por negocio; aun así pasamos `negocio_id` explícito en inserts
 * (columna NOT NULL) y en filtros para que el plan use los índices por tenant.
 */

/** Campos requeridos al crear + el resto opcional (la BD aplica defaults). */
export type ProductoCreate = { negocio_id: string; nombre: string } & Partial<
  Omit<Producto, 'id' | 'created_at' | 'updated_at'>
>;

export type ProductoUpdate = Partial<Omit<Producto, 'id' | 'negocio_id' | 'created_at' | 'updated_at'>>;

interface GetProductosOptions {
  soloActivos?: boolean;
}

export async function getProductos(
  negocioId: string,
  options: GetProductosOptions = {},
): Promise<Producto[]> {
  let query = supabase
    .from('productos')
    .select('*')
    .eq('negocio_id', negocioId)
    .order('nombre', { ascending: true });

  if (options.soloActivos) {
    query = query.eq('activo', true);
  }

  const { data, error } = await query.returns<Producto[]>();
  if (error) throw error;
  return data ?? [];
}

export async function getProductoById(id: string): Promise<Producto | null> {
  const { data, error } = await supabase
    .from('productos')
    .select('*')
    .eq('id', id)
    .maybeSingle()
    .returns<Producto | null>();

  if (error) throw error;
  return data ?? null;
}

/** Lookup exacto por código de barras dentro del negocio (productos activos). */
export async function getProductosByCodigo(
  negocioId: string,
  codigoBarras: string,
): Promise<Producto[]> {
  const { data, error } = await supabase
    .from('productos')
    .select('*')
    .eq('negocio_id', negocioId)
    .eq('codigo_barras', codigoBarras)
    .eq('activo', true)
    .returns<Producto[]>();

  if (error) throw error;
  return data ?? [];
}

/** Búsqueda por nombre (usa el índice trigram gin_trgm_ops). */
export async function searchProductos(negocioId: string, texto: string): Promise<Producto[]> {
  const { data, error } = await supabase
    .from('productos')
    .select('*')
    .eq('negocio_id', negocioId)
    .ilike('nombre', `%${texto}%`)
    .order('nombre', { ascending: true })
    .limit(50)
    .returns<Producto[]>();

  if (error) throw error;
  return data ?? [];
}

export async function createProducto(data: ProductoCreate): Promise<Producto> {
  const { data: created, error } = await supabase
    .from('productos')
    .insert(data)
    .select('*')
    .single()
    .returns<Producto>();

  if (error) throw error;
  return created;
}

export async function updateProducto(id: string, data: ProductoUpdate): Promise<Producto> {
  const { data: updated, error } = await supabase
    .from('productos')
    .update(data)
    .eq('id', id)
    .select('*')
    .single()
    .returns<Producto>();

  if (error) throw error;
  return updated;
}

/** Borrado físico. RLS lo restringe al rol `dueno`. */
export async function deleteProducto(id: string): Promise<void> {
  const { error } = await supabase.from('productos').delete().eq('id', id);
  if (error) throw error;
}

export interface ProductoStockBajo {
  id: string;
  nombre: string;
  stock_actual: number;
  stock_minimo: number;
  proveedor_id: string | null;
  proveedor_nombre: string | null;
}

interface DBProductoConProveedor {
  id: string;
  nombre: string;
  stock_actual: number;
  stock_minimo: number;
  proveedor_id: string | null;
  proveedores: { nombre: string } | null;
}

export async function getProductosStockBajo(negocioId: string): Promise<ProductoStockBajo[]> {
  const { data, error } = await supabase
    .from('productos')
    .select('id, nombre, stock_actual, stock_minimo, proveedor_id, proveedores:proveedor_id(nombre)')
    .eq('negocio_id', negocioId)
    .eq('activo', true)
    .returns<DBProductoConProveedor[]>();

  if (error) throw error;

  const lowStock = (data || [])
    .filter((p) => p.stock_actual <= p.stock_minimo)
    .map((p) => ({
      id: p.id,
      nombre: p.nombre,
      stock_actual: p.stock_actual,
      stock_minimo: p.stock_minimo,
      proveedor_id: p.proveedor_id,
      proveedor_nombre: p.proveedores ? p.proveedores.nombre : null,
    }));

  lowStock.sort((a, b) => {
    const provA = a.proveedor_nombre || '';
    const provB = b.proveedor_nombre || '';
    if (provA !== provB) {
      return provA.localeCompare(provB);
    }
    return a.nombre.localeCompare(b.nombre);
  });

  return lowStock;
}

