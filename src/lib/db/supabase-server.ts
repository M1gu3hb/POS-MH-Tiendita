import 'server-only';

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

/**
 * Clientes de Supabase para el SERVIDOR.
 *
 * - `createServerSupabase()` — cliente ligado a la sesión del usuario
 *   (lee/escribe cookies). Respeta RLS. Úsalo en Server Components,
 *   Route Handlers y Server Actions.
 * - `createAdminClient()` — cliente con SERVICE ROLE que IGNORA RLS.
 *   Solo para operaciones server-side de confianza: webhook de Stripe,
 *   alta de negocio/usuario, escritura de audit_log. NUNCA exponer al cliente.
 *
 * Este módulo es `server-only`: importarlo desde código de cliente es un error
 * en tiempo de compilación.
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** Cliente de servidor ligado a la sesión del usuario (cookies). Respeta RLS. */
export function createServerSupabase(): SupabaseClient {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Faltan NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY.');
  }
  const cookieStore = cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // `set` lanza si se llama desde un Server Component (cookies de solo
          // lectura). El refresco de sesión lo hace el middleware, así que es
          // seguro ignorarlo aquí.
        }
      },
    },
  });
}

/** Cliente con SERVICE ROLE — ignora RLS. Solo server-side de confianza. */
export function createAdminClient(): SupabaseClient {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Faltan NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY.');
  }
  return createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
