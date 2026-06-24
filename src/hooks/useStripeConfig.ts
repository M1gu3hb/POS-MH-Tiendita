'use client';

import { useQuery } from '@tanstack/react-query';

export interface StripeConfigStatus {
  ok: boolean;
  fullyConfigured: boolean;
  canCheckout: boolean;
  hasSecretKey: boolean;
  hasPriceId: boolean;
  hasAppBaseUrl: boolean;
  hasWebhookSecret: boolean;
  missing: string[];
}

const NOT_CONFIGURED: StripeConfigStatus = {
  ok: false,
  fullyConfigured: false,
  canCheckout: false,
  hasSecretKey: false,
  hasPriceId: false,
  hasAppBaseUrl: false,
  hasWebhookSecret: false,
  missing: ['unknown'],
};

/**
 * Estado de configuración de Stripe (cacheado). Reemplaza
 * `base44.functions.invoke('getStripeConfigStatus')` por GET /api/stripe/status.
 * Si no se puede consultar, asume NO configurado para no bloquear el POS.
 */
export function useStripeConfig() {
  const query = useQuery({
    queryKey: ['stripe-config-status'],
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    queryFn: async (): Promise<StripeConfigStatus> => {
      try {
        const res = await fetch('/api/stripe/status');
        if (!res.ok) return NOT_CONFIGURED;
        return (await res.json()) as StripeConfigStatus;
      } catch {
        return NOT_CONFIGURED;
      }
    },
  });

  const data = query.data;
  return {
    config: data ?? null,
    fullyConfigured: !!data?.fullyConfigured,
    canCheckout: !!data?.canCheckout,
    missing: data?.missing ?? [],
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}
