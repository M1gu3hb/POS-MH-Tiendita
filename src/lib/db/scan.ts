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
