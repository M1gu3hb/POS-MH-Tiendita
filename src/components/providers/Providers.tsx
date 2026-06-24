'use client';

import { useState } from 'react';
import { ThemeProvider } from 'next-themes';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { makeQueryClient } from '@/lib/query-client';
import { AuthProvider } from '@/lib/auth/AuthContext';

/**
 * Providers globales de la app (cliente):
 *  - ThemeProvider (next-themes) — modo claro/oscuro vía clase en <html>.
 *  - QueryClientProvider (TanStack Query) — estado de servidor.
 *  - AuthProvider (Supabase Auth) — sesión + perfil de negocio.
 *  - Toaster (sonner) — notificaciones.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  // Una instancia de QueryClient por montaje del árbol (evita compartir caché
  // entre requests en el servidor).
  const [queryClient] = useState(() => makeQueryClient());

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem
      disableTransitionOnChange
    >
      <QueryClientProvider client={queryClient}>
        <AuthProvider>{children}</AuthProvider>
        <Toaster richColors position="top-center" />
      </QueryClientProvider>
    </ThemeProvider>
  );
}
