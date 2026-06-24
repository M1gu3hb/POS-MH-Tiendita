import { supabase } from '@/lib/db/supabase';
import type { CategoriaProducto } from '@/lib/db/types';

/** Repositorio de `categorias_producto`. Reemplaza `base44.entities.CategoriaProducto`. */

export type CategoriaCreate = { negocio_id: string; nombre: string } & Partial<
  Omit<CategoriaProducto, 'id' | 'created_at'>
>;
export type CategoriaUpdate = Partial<Omit<CategoriaProducto, 'id' | 'negocio_id' | 'created_at'>>;

export async function getCategorias(negocioId: string): Promise<CategoriaProducto[]> {
  const { data, error } = await supabase
    .from('categorias_producto')
    .select('*')
    .eq('negocio_id', negocioId)
    .order('orden', { ascending: true })
    .returns<CategoriaProducto[]>();

  if (error) throw error;
  return data ?? [];
}

export async function createCategoria(data: CategoriaCreate): Promise<CategoriaProducto> {
  const { data: created, error } = await supabase
    .from('categorias_producto')
    .insert(data)
    .select('*')
    .single()
    .returns<CategoriaProducto>();

  if (error) throw error;
  return created;
}

export async function updateCategoria(id: string, data: CategoriaUpdate): Promise<CategoriaProducto> {
  const { data: updated, error } = await supabase
    .from('categorias_producto')
    .update(data)
    .eq('id', id)
    .select('*')
    .single()
    .returns<CategoriaProducto>();

  if (error) throw error;
  return updated;
}

export async function deleteCategoria(id: string): Promise<void> {
  const { error } = await supabase.from('categorias_producto').delete().eq('id', id);
  if (error) throw error;
}
