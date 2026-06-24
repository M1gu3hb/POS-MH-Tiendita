import { supabase } from '@/lib/db/supabase';
import type { Suscripcion } from '@/lib/db/types';

/**
 * Repositorio de `suscripciones` (lectura cliente). RLS limita el acceso al
 * rol `dueno`. Las escrituras las hace el webhook de Stripe server-side
 * (service role). Reemplaza `base44.entities.Suscripcion`.
 */

/** Suscripción del negocio (1:1) o null. */
export async function getSuscripcion(negocioId: string): Promise<Suscripcion | null> {
  const { data, error } = await supabase
    .from('suscripciones')
    .select('*')
    .eq('negocio_id', negocioId)
    .maybeSingle()
    .returns<Suscripcion | null>();

  if (error) throw error;
  return data ?? null;
}
