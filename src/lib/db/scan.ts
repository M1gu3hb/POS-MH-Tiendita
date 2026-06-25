import { supabase } from '@/lib/db/supabase';
import type { ScanEvent } from '@/lib/db/types';

/**
 * Repositorio de `scan_events` — eventos del escáner móvil que alimentan el POS
 * de escritorio en tiempo real (Supabase Realtime). Reemplaza
 * `base44.entities.ScanEvent`.
 */

export type ScanEventCreate = { negocio_id: string; codigo_barras: string } & Partial<
  Omit<ScanEvent, 'id' | 'created_at'>
>;

export async function createScanEvent(data: ScanEventCreate): Promise<ScanEvent> {
  const { data: created, error } = await supabase
    .from('scan_events')
    .insert(data)
    .select('*')
    .single()
    .returns<ScanEvent>();

  if (error) throw error;
  return created;
}

export async function getScanEventsPendientes(corteId: string): Promise<ScanEvent[]> {
  const { data, error } = await supabase
    .from('scan_events')
    .select('*')
    .eq('corte_id', corteId)
    .eq('estado', 'pendiente')
    .order('created_at', { ascending: true })
    .returns<ScanEvent[]>();

  if (error) throw error;
  return data ?? [];
}

export async function marcarScanEvent(id: string, estado: ScanEvent['estado'], errorMsg?: string): Promise<void> {
  const { error } = await supabase
    .from('scan_events')
    .update({ estado, error_msg: errorMsg ?? null })
    .eq('id', id);
  if (error) throw error;
}

/**
 * Suscripción Realtime pura a los `scan_events` de un corte (evento INSERT).
 * Reemplaza el polling de 1.5s del POS: el escáner móvil inserta scan_events y
 * el POS los recibe en tiempo real. Mantiene el acceso a Supabase en la capa de
 * datos (el componente no importa el cliente directamente). Devuelve una función
 * para cancelar la suscripción.
 */
export function subscribeScanEvents(corteId: string, onInsert: (scan: ScanEvent) => void): () => void {
  const channel = supabase
    .channel(`scan_events:${corteId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'scan_events', filter: `corte_id=eq.${corteId}` },
      (payload) => {
        onInsert(payload.new as ScanEvent);
      },
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
