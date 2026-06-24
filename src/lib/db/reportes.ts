import { supabase } from '@/lib/db/supabase';
import type { ReporteGenerado } from '@/lib/db/types';

/**
 * Repositorio de `reportes_generados`. Reemplaza `base44.entities.ReporteGenerado`.
 * El snapshot se guarda en `datos_snapshot` (JSONB nativo, no string).
 */

export type ReporteCreate = { negocio_id: string; tipo: ReporteGenerado['tipo']; titulo: string } & Partial<
  Omit<ReporteGenerado, 'id' | 'created_at'>
>;

export async function getReportes(negocioId: string, limit = 100): Promise<ReporteGenerado[]> {
  const { data, error } = await supabase
    .from('reportes_generados')
    .select('*')
    .eq('negocio_id', negocioId)
    .order('created_at', { ascending: false })
    .limit(limit)
    .returns<ReporteGenerado[]>();

  if (error) throw error;
  return data ?? [];
}

export async function createReporte(data: ReporteCreate): Promise<ReporteGenerado> {
  const { data: created, error } = await supabase
    .from('reportes_generados')
    .insert(data)
    .select('*')
    .single()
    .returns<ReporteGenerado>();

  if (error) throw error;
  return created;
}

export async function cancelReporte(id: string): Promise<void> {
  const { error } = await supabase
    .from('reportes_generados')
    .update({ estado: 'cancelado' })
    .eq('id', id);
  if (error) throw error;
}
