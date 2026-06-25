'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth/AuthContext';
import { getNegocio } from '@/lib/db/configuracion';

/** Negocio actual (id, nombre) desde la tabla `negocios`. Mismo patrón que useConfig. */
export function useNegocio() {
  const { negocioId } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ['negocio', negocioId],
    queryFn: () => getNegocio(negocioId),
    enabled: !!negocioId,
    staleTime: 1000 * 60 * 5,
  });

  return { negocio: data ?? null, isLoading };
}
