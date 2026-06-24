import 'server-only';

import { createServerSupabase } from '@/lib/db/supabase-server';
import type { Usuario } from '@/lib/db/types';

/**
 * Contexto de autenticación server-side para API Routes / Server Components.
 * Devuelve el usuario de Supabase Auth + su perfil de negocio (negocio_id, rol).
 */

export interface ServerAuthContext {
  userId: string;
  email: string | null;
  usuario: Usuario | null;
  negocioId: string | null;
}

export async function getServerAuthContext(): Promise<ServerAuthContext | null> {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('usuarios')
    .select('*')
    .eq('auth_user_id', user.id)
    .maybeSingle();
  // Cast en el borde de confianza: el cliente server-side no propaga el tipo de
  // fila (sin generic Database). Es nuestro esquema, así que casteamos a Usuario.
  const usuario = (data as Usuario | null) ?? null;

  return {
    userId: user.id,
    email: user.email ?? null,
    usuario,
    negocioId: usuario?.negocio_id ?? null,
  };
}
