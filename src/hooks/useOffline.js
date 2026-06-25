'use client';

import { useState, useEffect, useCallback } from 'react';
import { getVentasPendientes, sincronizarVentas } from '@/lib/offline/ventas';

/**
 * Estado de conexión + sincronización de ventas offline.
 * - Detecta online/offline con navigator.onLine y los eventos 'online'/'offline'.
 * - Al volver online, sincroniza automáticamente las ventas pendientes.
 * Devuelve { isOffline, ventasPendientes, sincronizando, refrescarPendientes }.
 */
export function useOffline() {
  const [isOffline, setIsOffline] = useState(false);
  const [ventasPendientes, setVentasPendientes] = useState(0);
  const [sincronizando, setSincronizando] = useState(false);

  const refrescarPendientes = useCallback(async () => {
    try {
      const pend = await getVentasPendientes();
      setVentasPendientes(pend.length);
    } catch {
      /* noop */
    }
  }, []);

  const sincronizar = useCallback(async () => {
    setSincronizando(true);
    try {
      await sincronizarVentas();
    } catch {
      /* noop */
    } finally {
      setSincronizando(false);
      await refrescarPendientes();
    }
  }, [refrescarPendientes]);

  useEffect(() => {
    setIsOffline(typeof navigator !== 'undefined' && navigator.onLine === false);
    void refrescarPendientes();

    const handleOnline = () => {
      setIsOffline(false);
      void sincronizar();
    };
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [refrescarPendientes, sincronizar]);

  return { isOffline, ventasPendientes, sincronizando, refrescarPendientes };
}
