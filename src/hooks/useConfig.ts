'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth/AuthContext';
import { getConfiguracion } from '@/lib/db/configuracion';

/** Configuración del negocio actual. Reemplaza la versión basada en Base44. */
export function useConfig() {
  const { negocioId } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ['config-negocio', negocioId],
    queryFn: () => getConfiguracion(negocioId as string),
    enabled: !!negocioId,
    staleTime: 1000 * 60 * 5,
  });

  return { config: data ?? null, isLoading };
}
