import { supabase } from '@/lib/db/supabase';
import type { ConfiguracionNegocio, Negocio } from '@/lib/db/types';

/**
 * Repositorio de `configuracion_negocio` (1:1 por negocio).
 * Reemplaza `base44.entities.ConfiguracionNegocio`.
 */

export type ConfiguracionUpdate = Partial<
  Omit<ConfiguracionNegocio, 'id' | 'negocio_id' | 'updated_at'>
> & {
  qr_url?: string | null;
  onboarding_completado?: boolean;
  escaner_fisico_activo?: boolean;
  bascula_activa?: boolean;
  cliente_frecuente_activo?: boolean;
  puntos_por_peso?: number;
};

export type ConfiguracionConQr = ConfiguracionNegocio & {
  qr_url: string | null;
  onboarding_completado: boolean;
  escaner_fisico_activo: boolean;
  bascula_activa: boolean;
  cliente_frecuente_activo: boolean;
  puntos_por_peso: number;
};

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

export async function getConfiguracion(negocioId: string): Promise<ConfiguracionConQr | null> {
  const { data, error } = await supabase
    .from('configuracion_negocio')
    .select('*')
    .eq('negocio_id', negocioId)
    .maybeSingle()
    .returns<ConfiguracionConQr | null>();

  if (error) throw error;
  return data ?? null;
}

export async function updateConfiguracion(
  negocioId: string,
  data: ConfiguracionUpdate,
): Promise<ConfiguracionConQr> {
  const { data: updated, error } = await supabase
    .from('configuracion_negocio')
    .update(data)
    .eq('negocio_id', negocioId)
    .select('*')
    .single()
    .returns<ConfiguracionConQr>();

  if (error) throw error;
  return updated;
}
