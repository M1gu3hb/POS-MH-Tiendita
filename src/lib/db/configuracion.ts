import { supabase } from '@/lib/db/supabase';
import type { ConfiguracionNegocio, Negocio } from '@/lib/db/types';

/**
 * Repositorio de `configuracion_negocio` (1:1 por negocio).
 * Reemplaza `base44.entities.ConfiguracionNegocio`.
 */

export type ConfiguracionUpdate = Partial<
  Omit<ConfiguracionNegocio, 'id' | 'negocio_id' | 'updated_at'>
>;

export async function getNegocio(negocioId: string): Promise<Pick<Negocio, 'id' | 'nombre'> | null> {
  const { data, error } = await supabase
    .from('negocios')
    .select('id, nombre')
    .eq('id', negocioId)
    .maybeSingle()
    .returns<Pick<Negocio, 'id' | 'nombre'> | null>();

  if (error) throw error;
  return data ?? null;
}

export async function getConfiguracion(negocioId: string): Promise<ConfiguracionNegocio | null> {
  const { data, error } = await supabase
    .from('configuracion_negocio')
    .select('*')
    .eq('negocio_id', negocioId)
    .maybeSingle()
    .returns<ConfiguracionNegocio | null>();

  if (error) throw error;
  return data ?? null;
}

export async function updateConfiguracion(
  negocioId: string,
  data: ConfiguracionUpdate,
): Promise<ConfiguracionNegocio> {
  const { data: updated, error } = await supabase
    .from('configuracion_negocio')
    .update(data)
    .eq('negocio_id', negocioId)
    .select('*')
    .single()
    .returns<ConfiguracionNegocio>();

  if (error) throw error;
  return updated;
}
