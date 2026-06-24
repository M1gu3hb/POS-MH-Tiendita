import { supabase } from '@/lib/db/supabase';
import type { CorteCaja } from '@/lib/db/types';

/**
 * Repositorio de `cortes_caja`. Reemplaza `base44.entities.CorteCaja`.
 */

export type CorteCajaCreate = { negocio_id: string; cajero_nombre: string } & Partial<
  Omit<CorteCaja, 'id' | 'created_at'>
>;
export type CorteCajaUpdate = Partial<Omit<CorteCaja, 'id' | 'negocio_id' | 'created_at'>>;

/** Caja abierta más reciente del negocio (o null). */
export async function getCajaAbierta(negocioId: string): Promise<CorteCaja | null> {
  const { data, error } = await supabase
    .from('cortes_caja')
    .select('*')
    .eq('negocio_id', negocioId)
    .eq('estado', 'abierta')
    .order('fecha_apertura', { ascending: false })
    .limit(1)
    .maybeSingle()
    .returns<CorteCaja | null>();

  if (error) throw error;
  return data ?? null;
}

export async function getCorteById(id: string): Promise<CorteCaja | null> {
  const { data, error } = await supabase
    .from('cortes_caja')
    .select('*')
    .eq('id', id)
    .maybeSingle()
    .returns<CorteCaja | null>();

  if (error) throw error;
  return data ?? null;
}

export async function getCortes(negocioId: string, limit = 50): Promise<CorteCaja[]> {
  const { data, error } = await supabase
    .from('cortes_caja')
    .select('*')
    .eq('negocio_id', negocioId)
    .order('fecha_apertura', { ascending: false })
    .limit(limit)
    .returns<CorteCaja[]>();

  if (error) throw error;
  return data ?? [];
}

export async function abrirCaja(data: CorteCajaCreate): Promise<CorteCaja> {
  const { data: created, error } = await supabase
    .from('cortes_caja')
    .insert(data)
    .select('*')
    .single()
    .returns<CorteCaja>();

  if (error) throw error;
  return created;
}

export async function cerrarCaja(id: string, data: CorteCajaUpdate): Promise<CorteCaja> {
  const { data: updated, error } = await supabase
    .from('cortes_caja')
    .update({ ...data, estado: 'cerrada', fecha_cierre: data.fecha_cierre ?? new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single()
    .returns<CorteCaja>();

  if (error) throw error;
  return updated;
}
