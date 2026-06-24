import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Refresca la sesión de Supabase en cada request y protege rutas en el
 * servidor (reemplaza el `ProtectedRoute` desconectado del original).
 *
 * Rutas públicas (sin sesión): /login, /register, /vista-cliente y los
 * retornos de Stripe. Todo lo demás exige usuario autenticado.
 */

const PUBLIC_PATHS = [
  '/login',
  '/register',
  '/vista-cliente',
  '/suscripcion/success',
  '/suscripcion/cancel',
];

function isPublicPath(pathname: string): boolean {
  if (pathname.startsWith('/api')) return true; // las API routes validan su propia auth
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export async function updateSession(request: NextRequest): Promise<NextResponse> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  let supabaseResponse = NextResponse.next({ request });

  // Sin config de Supabase no podemos validar sesión; dejamos pasar para no
  // romper el arranque local antes de configurar .env.local.
  if (!supabaseUrl || !supabaseAnonKey) {
    return supabaseResponse;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  // IMPORTANTE: getUser() revalida el token contra el servidor de Supabase.
  // No uses getSession() para decisiones de seguridad (lee solo la cookie).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  if (!user && !isPublicPath(pathname)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/login';
    redirectUrl.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  return supabaseResponse;
}
