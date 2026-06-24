'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth/AuthContext';
import { getCajaAbierta } from '@/lib/db/caja';

/**
 * Estado de la caja abierta — sincronizado entre dispositivos vía polling
 * (1.5s con la pestaña visible). Reemplaza la versión basada en Base44.
 */
export function useCajaAbierta() {
  const { negocioId } = useAuth();
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['caja-abierta', negocioId],
    queryFn: () => getCajaAbierta(negocioId as string),
    enabled: !!negocioId,
    staleTime: 0,
    refetchInterval: () => (typeof document !== 'undefined' && document.hidden ? false : 1500),
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });

  return { cajaAbierta: data ?? null, isLoading, refetch };
}
