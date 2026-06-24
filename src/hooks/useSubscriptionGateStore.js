import { useSyncExternalStore } from 'react';

/**
 * Mini-store global para abrir/cerrar el modal "Activa tu suscripción"
 * desde cualquier parte de la app sin pasar props ni context.
 * No usa zustand para mantener cero dependencias nuevas.
 */
let state = { isOpen: false };
const listeners = new Set();

function emit() {
  for (const l of listeners) l();
}

const api = {
  open() {
    if (state.isOpen) return;
    state = { isOpen: true };
    emit();
  },
  close() {
    if (!state.isOpen) return;
    state = { isOpen: false };
    emit();
  },
  get() {
    return state;
  },
};

function subscribe(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/**
 * Hook estilo zustand simplificado: useSubscriptionGateStore(s => s.open)
 */
export function useSubscriptionGateStore(selector = (s) => s) {
  const snapshot = useSyncExternalStore(subscribe, api.get, api.get);
  return selector({
    ...snapshot,
    open: api.open,
    close: api.close,
  });
}

export const subscriptionGate = api;