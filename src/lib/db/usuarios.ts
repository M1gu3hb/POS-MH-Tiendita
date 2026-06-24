import { supabase } from '@/lib/db/supabase';
import type { Usuario } from '@/lib/db/types';

/**
 * Repositorio de `usuarios`. Capa de acceso a datos (cliente).
 * Ningún componente debe consultar Supabase directamente: pasa por aquí.
 */

/** Devuelve el perfil de `usuarios` ligado a un `auth.users.id`, o null. */
export async function getUsuarioByAuthId(authUserId: string): Promise<Usuario | null> {
  const { data, error } = await supabase
    .from('usuarios')
    .select('*')
    .eq('auth_user_id', authUserId)
    .maybeSingle()
    .returns<Usuario | null>();

  if (error) throw error;
  return data ?? null;
}

/** Actualiza el nombre visible del usuario autenticado (RLS: own_user_update). */
export async function updateNombreVisible(authUserId: string, nombreVisible: string): Promise<void> {
  const { error } = await supabase
    .from('usuarios')
    .update({ nombre_visible: nombreVisible })
    .eq('auth_user_id', authUserId);
  if (error) throw error;
}

/** Lista los usuarios (compañeros) del negocio actual. RLS limita al mismo negocio. */
export async function getUsuariosDelNegocio(negocioId: string): Promise<Usuario[]> {
  const { data, error } = await supabase
    .from('usuarios')
    .select('*')
    .eq('negocio_id', negocioId)
    .order('created_at', { ascending: true })
    .returns<Usuario[]>();

  if (error) throw error;
  return data ?? [];
}
