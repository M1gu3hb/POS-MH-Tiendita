import { supabase } from '@/lib/db/supabase';

/**
 * Repositorio de Clientes Frecuentes.
 * Maneja la acumulación, consulta y canje de puntos de clientes (almacenados en `clientes_fiado`).
 */

export async function getPuntos(clienteId: string): Promise<number> {
  const { data, error } = await supabase
    .from('clientes_fiado')
    .select('puntos_acumulados')
    .eq('id', clienteId)
    .single();

  if (error) throw error;
  return data?.puntos_acumulados ?? 0;
}

export async function agregarPuntos(clienteId: string, montoCompra: number): Promise<number> {
  // 1. Obtener el cliente para saber su negocio_id y sus puntos actuales
  const { data: cliente, error: clienteError } = await supabase
    .from('clientes_fiado')
    .select('negocio_id, puntos_acumulados')
    .eq('id', clienteId)
    .single();

  if (clienteError) throw clienteError;
  if (!cliente) throw new Error('Cliente no encontrado');

  // 2. Obtener la tasa de conversión puntos_por_peso de la configuración del negocio
  const { data: config, error: configError } = await supabase
    .from('configuracion_negocio')
    .select('puntos_por_peso')
    .eq('negocio_id', cliente.negocio_id)
    .single();

  if (configError) throw configError;

  const factor = Number(config?.puntos_por_peso ?? 1);
  const puntosNuevos = Math.floor(montoCompra * factor);
  const totalPuntos = (cliente.puntos_acumulados || 0) + puntosNuevos;

  // 3. Actualizar los puntos del cliente
  const { error: updateError } = await supabase
    .from('clientes_fiado')
    .update({ puntos_acumulados: totalPuntos })
    .eq('id', clienteId);

  if (updateError) throw updateError;

  return totalPuntos;
}

export async function canjearPuntos(clienteId: string, puntos: number): Promise<number> {
  // 1. Obtener los puntos actuales del cliente
  const { data: cliente, error: clienteError } = await supabase
    .from('clientes_fiado')
    .select('puntos_acumulados')
    .eq('id', clienteId)
    .single();

  if (clienteError) throw clienteError;
  if (!cliente) throw new Error('Cliente no encontrado');

  const totalPuntos = Math.max(0, (cliente.puntos_acumulados || 0) - puntos);

  // 2. Actualizar los puntos del cliente
  const { error: updateError } = await supabase
    .from('clientes_fiado')
    .update({ puntos_acumulados: totalPuntos })
    .eq('id', clienteId);

  if (updateError) throw updateError;

  return totalPuntos;
}
