'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/db/supabase';
import { useAuth } from '@/lib/auth/AuthContext';
import * as carritoRepo from '@/lib/db/carrito';
import type { CarritoActivo, CarritoItem, Producto } from '@/lib/db/types';

/**
 * Carrito compartido por caja, RELACIONAL (carritos_activos + carrito_items).
 * Reemplaza el anti-patrón items_json + polling de 900ms por Supabase Realtime.
 *
 * - Un carrito activo por corte; se crea/adopta al montar.
 * - Realtime sobre carrito_items (cambios de renglones desde escáner/otro
 *   dispositivo) y carritos_activos (totales/estado).
 *
 * Requiere que las tablas estén en la publicación `supabase_realtime`
 * (ver docs/BUGS_PENDING.md).
 */
export function useCarritoActivo(corteId: string | null) {
  const { negocioId, usuario } = useAuth();
  const cajeroId = usuario?.id ?? null;

  const [carrito, setCarrito] = useState<CarritoActivo | null>(null);
  const [items, setItems] = useState<CarritoItem[]>([]);
  const [ready, setReady] = useState(false);
  const carritoIdRef = useRef<string | null>(null);

  const refetchItems = useCallback(async (carritoId: string) => {
    const list = await carritoRepo.getItems(carritoId);
    setItems(list);
  }, []);

  // Cargar / adoptar el carrito activo al cambiar de corte.
  useEffect(() => {
    if (!negocioId || !corteId) {
      carritoIdRef.current = null;
      setCarrito(null);
      setItems([]);
      setReady(false);
      return;
    }
    let cancelled = false;
    setReady(false);
    void (async () => {
      try {
        const c = await carritoRepo.getOrCreateCarritoActivo(negocioId, corteId, cajeroId);
        if (cancelled) return;
        carritoIdRef.current = c.id;
        setCarrito(c);
        await refetchItems(c.id);
      } catch {
        /* noop */
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [negocioId, corteId, cajeroId, refetchItems]);

  // Realtime: renglones del carrito + cambios de cabecera.
  useEffect(() => {
    const carritoId = carrito?.id;
    if (!carritoId) return;

    const channel = supabase
      .channel(`carrito:${carritoId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'carrito_items', filter: `carrito_id=eq.${carritoId}` },
        () => {
          void refetchItems(carritoId);
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'carritos_activos', filter: `id=eq.${carritoId}` },
        (payload) => {
          setCarrito(payload.new as CarritoActivo);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [carrito?.id, refetchItems]);

  const withCarrito = useCallback(
    async (fn: (carritoId: string) => Promise<void>) => {
      const id = carritoIdRef.current;
      if (!id) return;
      await fn(id);
      await refetchItems(id);
    },
    [refetchItems],
  );

  const addItem = useCallback(
    (producto: Producto) => withCarrito((id) => carritoRepo.addProducto(id, negocioId as string, producto)),
    [withCarrito, negocioId],
  );

  const updateQty = useCallback(
    (itemId: string, cantidad: number) => withCarrito((id) => carritoRepo.setItemCantidad(id, itemId, cantidad)),
    [withCarrito],
  );

  const removeItem = useCallback(
    (itemId: string) => withCarrito((id) => carritoRepo.removeItem(id, itemId)),
    [withCarrito],
  );

  const clear = useCallback(() => withCarrito((id) => carritoRepo.clearCarrito(id)), [withCarrito]);

  const cerrarVenta = useCallback(async () => {
    const id = carritoIdRef.current;
    if (!id || !negocioId || !corteId) return;
    const nuevo = await carritoRepo.cerrarCarrito(id, negocioId, corteId, cajeroId);
    carritoIdRef.current = nuevo.id;
    setCarrito(nuevo);
    setItems([]);
  }, [negocioId, corteId, cajeroId]);

  return {
    carrito,
    items,
    ready,
    carritoId: carrito?.id ?? null,
    addItem,
    updateQty,
    removeItem,
    clear,
    cerrarVenta,
    cancelar: clear,
  };
}
