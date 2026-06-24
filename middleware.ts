import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/auth/middleware';

// Protección de rutas + refresco de sesión de Supabase en el servidor.
export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Aplica a todas las rutas EXCEPTO:
     * - _next/static, _next/image (assets de Next)
     * - favicon y archivos de imagen estáticos
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
