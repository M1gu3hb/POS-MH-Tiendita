import { withStore, STORE_VENTAS } from '@/lib/offline/db';
import type { NuevaVentaInput } from '@/lib/db/ventas';

/**
 * Cola de ventas hechas sin conexión. Al volver internet, `sincronizarVentas`
 * las reenvía al endpoint `POST /api/ventas`, que las procesa con el RPC
 * transaccional `crear_venta_completa` (crea venta + detalle + descuenta stock +
 * kardex, todo atómico). Las que se sincronizan se eliminan de IndexedDB.
 */

export interface VentaPendiente {
  id?: number;
  payload: NuevaVentaInput;
  timestamp: number;
  estado: 'pendiente_sync';
}

export interface ResultadoSync {
  sincronizadas: number;
  fallidas: number;
}

export async function guardarVentaPendiente(venta: NuevaVentaInput): Promise<number> {
  const registro: VentaPendiente = {
    payload: venta,
    timestamp: Date.now(),
    estado: 'pendiente_sync',
  };
  const key = await withStore<IDBValidKey>(STORE_VENTAS, 'readwrite', (s) => s.add(registro));
  return Number(key);
}

export async function getVentasPendientes(): Promise<VentaPendiente[]> {
  const all = await withStore<VentaPendiente[]>(STORE_VENTAS, 'readonly', (s) => s.getAll());
  return all ?? [];
}

export async function marcarVentaSincronizada(id: number): Promise<void> {
  await withStore<undefined>(STORE_VENTAS, 'readwrite', (s) => s.delete(id));
}

/** Mapea la venta guardada (`{ venta, detalle }`) al body plano de `POST /api/ventas`. */
function toRequestBody(pendiente: VentaPendiente) {
  const v = pendiente.payload.venta;
  const items = pendiente.payload.detalle.map((d) => ({
    producto_id: d.producto_id,
    producto_nombre: d.producto_nombre,
    cantidad: d.cantidad,
    precio_unitario: d.precio_unitario_snapshot,
    subtotal: d.subtotal,
    descuento: d.descuento ?? 0,
    total: d.total,
  }));
  return {
    cajero_nombre: v.cajero_nombre,
    corte_id: v.corte_id ?? null,
    folio: v.folio,
    metodo_pago: v.metodo_pago ?? 'efectivo',
    subtotal: v.subtotal ?? 0,
    descuento_total: v.descuento_total ?? 0,
    total: v.total ?? 0,
    monto_recibido: v.monto_recibido ?? v.total ?? 0,
    cambio: v.cambio ?? 0,
    notas: v.notas ?? null,
    items,
  };
}

/**
 * Reenvía las ventas pendientes a `POST /api/ventas`. Las que responden 200 se
 * eliminan de la cola; las que fallan se dejan para reintentar. Devuelve el conteo.
 */
export async function sincronizarVentas(): Promise<ResultadoSync> {
  const pendientes = await getVentasPendientes();
  let sincronizadas = 0;
  let fallidas = 0;

  for (const pendiente of pendientes) {
    try {
      const res = await fetch('/api/ventas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(toRequestBody(pendiente)),
      });
      if (res.ok) {
        if (pendiente.id != null) await marcarVentaSincronizada(pendiente.id);
        sincronizadas += 1;
      } else {
        fallidas += 1;
      }
    } catch {
      // Red intermitente / endpoint inalcanzable: se deja en la cola.
      fallidas += 1;
    }
  }

  return { sincronizadas, fallidas };
}
