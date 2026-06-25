import { withStore, STORE_VENTAS } from '@/lib/offline/db';
import { createVenta, type NuevaVentaInput } from '@/lib/db/ventas';

/**
 * Cola de ventas hechas sin conexión. Al volver internet, `sincronizarVentas`
 * las reenvía al flujo normal de creación de venta (repo `createVenta`).
 *
 * Nota: la spec pedía POST a una API route `app/api/ventas/route.ts`, pero ese
 * archivo NO está en los permitidos de esta ronda. Se usa el repo `createVenta`
 * existente (mismo efecto: inserta cabecera + detalle), sin crear la ruta.
 */

export interface VentaPendiente {
  id?: number;
  payload: NuevaVentaInput;
  timestamp: number;
  estado: 'pendiente_sync';
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

/** Reenvía las ventas pendientes; elimina las que se sincronizan. Devuelve cuántas. */
export async function sincronizarVentas(): Promise<number> {
  const pendientes = await getVentasPendientes();
  let sincronizadas = 0;
  for (const pendiente of pendientes) {
    try {
      await createVenta(pendiente.payload);
      if (pendiente.id != null) await marcarVentaSincronizada(pendiente.id);
      sincronizadas += 1;
    } catch {
      // Si una venta falla (p. ej. red intermitente), se deja en la cola.
    }
  }
  return sincronizadas;
}
