import { supabase } from '@/lib/db/supabase';

export type TipoDevolucion = 'dinero' | 'credito_siguiente_compra';
export type EstadoDevolucion = 'procesada' | 'cancelada';

export interface Devolucion {
  id: string;
  negocio_id: string;
  venta_id: string;
  cajero_id: string | null;
  cajero_nombre: string | null;
  motivo: string;
  tipo_devolucion: TipoDevolucion;
  monto_devuelto: number;
  estado: EstadoDevolucion;
  created_at: string;
}

export interface DetalleDevolucion {
  id: string;
  devolucion_id: string;
  negocio_id: string;
  producto_id: string | null;
  producto_nombre: string;
  cantidad_devuelta: number;
  precio_unitario: number;
  subtotal: number;
  regresa_a_inventario: boolean;
}

export interface DevolucionItemInput {
  producto_id: string | null;
  producto_nombre: string;
  cantidad_devuelta: number;
  precio_unitario: number;
  regresa_a_inventario: boolean;
}

export interface ProcesarDevolucionInput {
  venta_id: string;
  motivo: string;
  tipo_devolucion: TipoDevolucion;
  items: DevolucionItemInput[];
}

export interface ProcesarDevolucionResponse {
  success: boolean;
  devolucion: Devolucion;
  monto_devuelto: number;
}

export async function getDevoluciones(negocioId: string): Promise<Devolucion[]> {
  const { data, error } = await supabase
    .from('devoluciones')
    .select('*')
    .eq('negocio_id', negocioId)
    .order('created_at', { ascending: false })
    .returns<Devolucion[]>();

  if (error) throw error;
  return data ?? [];
}

export async function getDevolucionesByVenta(ventaId: string): Promise<Devolucion[]> {
  const { data, error } = await supabase
    .from('devoluciones')
    .select('*')
    .eq('venta_id', ventaId)
    .order('created_at', { ascending: false })
    .returns<Devolucion[]>();

  if (error) throw error;
  return data ?? [];
}

export async function procesarDevolucion(data: ProcesarDevolucionInput): Promise<ProcesarDevolucionResponse> {
  const res = await fetch('/api/devoluciones', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  const payload = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(payload?.error || 'No se pudo procesar la devolucion');
  }
  return payload as ProcesarDevolucionResponse;
}
