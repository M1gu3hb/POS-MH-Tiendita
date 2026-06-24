'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth/AuthContext';
import { getSuscripcion } from '@/lib/db/suscripcion';
import { useStripeConfig } from '@/hooks/useStripeConfig';

/** Estados que permiten OPERAR el POS. */
const ESTADOS_OPERATIVOS = new Set(['trialing', 'active']);

interface UseSubscriptionStatusOptions {
  enabled?: boolean;
}

/**
 * Estado de la suscripción del negocio + flags de gating. Reemplaza la versión
 * basada en Base44 (lee `suscripciones` por negocio_id, no por created_by).
 *
 * Regla: si Stripe NO está totalmente configurado → hasAccess=true (modo
 * configuración). Si SÍ → hasAccess solo si estado ∈ {trialing, active}.
 */
export function useSubscriptionStatus({ enabled = true }: UseSubscriptionStatusOptions = {}) {
  const { negocioId } = useAuth();
  const { fullyConfigured, isLoading: loadingConfig } = useStripeConfig();

  const query = useQuery({
    queryKey: ['suscripcion-actual', negocioId],
    enabled: enabled && !!negocioId,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    queryFn: () => getSuscripcion(negocioId as string),
  });

  const suscripcion = query.data ?? null;
  const estado = suscripcion?.estado ?? 'sin_suscripcion';

  const result = useMemo(() => {
    const puedeOperar = ESTADOS_OPERATIVOS.has(estado);
    const enTrial = estado === 'trialing';
    const diasRestantesTrial = (() => {
      if (!enTrial || !suscripcion?.trial_fin) return null;
      const fin = new Date(suscripcion.trial_fin).getTime();
      if (Number.isNaN(fin)) return null;
      const diff = fin - Date.now();
      return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    })();

    const stripeConfigured = !!fullyConfigured;
    const hasAccess = stripeConfigured ? puedeOperar : true;
    const needsSubscription = stripeConfigured && !puedeOperar;

    return {
      suscripcion,
      estado,
      puedeOperar,
      enTrial,
      diasRestantesTrial,
      requierePago: ['past_due', 'unpaid', 'incomplete'].includes(estado),
      cancelada: estado === 'canceled' || estado === 'incomplete_expired',
      sinSuscripcion: estado === 'sin_suscripcion',
      cancelAtPeriodEnd: !!suscripcion?.cancel_at_period_end,
      status: estado,
      stripeConfigured,
      hasAccess,
      needsSubscription,
      isTrial: enTrial,
      isActive: estado === 'active',
      isPastDue: estado === 'past_due' || estado === 'unpaid',
      isCanceled: estado === 'canceled' || estado === 'incomplete_expired',
    };
  }, [estado, suscripcion, fullyConfigured]);

  return {
    ...result,
    isLoading: query.isLoading || loadingConfig,
    isFetching: query.isFetching,
    refetch: query.refetch,
  };
}

export { ESTADOS_OPERATIVOS };
