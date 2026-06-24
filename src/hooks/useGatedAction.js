import { useCallback } from 'react';

/**
 * useGatedAction — MODO PAUSADO TEMPORAL
 *
 * El bloqueo por suscripción está desactivado mientras Stripe no se use en producción.
 * Todas las acciones se ejecutan normalmente; no se abre ningún modal de paywall.
 *
 * Cuando se reactive el cobro, restaurar la versión que consulta useSubscriptionStatus
 * y useSubscriptionGateStore.
 */
export function useGatedAction() {
  const ensureAccess = useCallback(() => true, []);

  const wrap = useCallback((fn) => {
    return (...args) => fn?.(...args);
  }, []);

  wrap.ensureAccess = ensureAccess;
  wrap.hasAccess = true;
  wrap.needsSubscription = false;

  return wrap;
}