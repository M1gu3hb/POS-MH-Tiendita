import { supabase } from '@/lib/db/supabase';
import type { Proveedor } from '@/lib/db/types';

/** Repositorio de `proveedores`. Reemplaza `base44.entities.Proveedor`. */

export type ProveedorCreate = { negocio_id: string; nombre: string } & Partial<
  Omit<Proveedor, 'id' | 'created_at' | 'updated_at'>
>;
export type ProveedorUpdate = Partial<Omit<Proveedor, 'id' | 'negocio_id' | 'created_at' | 'updated_at'>>;

export async function getProveedores(negocioId: string): Promise<Proveedor[]> {
  const { data, error } = await supabase
    .from('proveedores')
    .select('*')
    .eq('negocio_id', negocioId)
    .order('nombre', { ascending: true })
    .returns<Proveedor[]>();

  if (error) throw error;
  return data ?? [];
}

export async function createProveedor(data: ProveedorCreate): Promise<Proveedor> {
  const { data: created, error } = await supabase
    .from('proveedores')
    .insert(data)
    .select('*')
    .single()
    .returns<Proveedor>();

  if (error) throw error;
  return created;
}

export async function updateProveedor(id: string, data: ProveedorUpdate): Promise<Proveedor> {
  const { data: updated, error } = await supabase
    .from('proveedores')
    .update(data)
    .eq('id', id)
    .select('*')
    .single()
    .returns<Proveedor>();

  if (error) throw error;
  return updated;
}

export async function deleteProveedor(id: string): Promise<void> {
  const { error } = await supabase.from('proveedores').delete().eq('id', id);
  if (error) throw error;
}
