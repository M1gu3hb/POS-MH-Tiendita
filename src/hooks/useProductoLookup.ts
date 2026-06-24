'use client';

import { useCallback } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import {
  checkCodigoDuplicado,
  lookupProductoByCodigo,
  type LookupResult,
} from '@/lib/productLookup';

/**
 * Enlaza las funciones de búsqueda por código de barras con el negocio actual.
 * Reemplaza el `useProductoLookup` basado en Base44.
 */
export function useProductoLookup() {
  const { negocioId } = useAuth();

  const lookupByCodigo = useCallback(
    (codigo: string): Promise<LookupResult> => {
      if (!negocioId) return Promise.resolve({ status: 'not_found' });
      return lookupProductoByCodigo(negocioId, codigo);
    },
    [negocioId],
  );

  const checkDuplicado = useCallback(
    (codigo: string, excludeId: string | null = null) => {
      if (!negocioId) return Promise.resolve({ duplicate: false });
      return checkCodigoDuplicado(negocioId, codigo, excludeId);
    },
    [negocioId],
  );

  return { lookupByCodigo, checkDuplicado };
}
