'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
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
      const { sincronizadas, fallidas } = await sincronizarVentas();
      if (sincronizadas > 0) {
        toast.success(`${sincronizadas} ${sincronizadas === 1 ? 'venta sincronizada' : 'ventas sincronizadas'}`);
      }
      if (fallidas > 0) {
        toast.error(`${fallidas} ${fallidas === 1 ? 'venta no se pudo sincronizar' : 'ventas no se pudieron sincronizar'}`);
      }
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
