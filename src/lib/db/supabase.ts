'use client';

import { createBrowserClient } from '@supabase/ssr';

/**
 * Cliente de Supabase para el NAVEGADOR (componentes/hooks "use client").
 * Respeta RLS mediante la sesión del usuario almacenada en cookies.
 *
 * El cliente de servidor (RSC / route handlers) y el cliente admin
 * (service role) viven en `supabase-server.ts`, que importa `next/headers`
 * y no debe importarse desde código de cliente.
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let browserClient: ReturnType<typeof createBrowserClient> | undefined;

export function createClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Faltan NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY. Revisa tu .env.local.',
    );
  }
  // Singleton: una sola instancia por pestaña.
  if (!browserClient) {
    browserClient = createBrowserClient(supabaseUrl, supabaseAnonKey);
  }
  return browserClient;
}

/** Instancia compartida lista para usar en hooks/repositorios de cliente. */
export const supabase = createClient();
