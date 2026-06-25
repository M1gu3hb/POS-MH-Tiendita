import { supabase } from '@/lib/db/supabase';

/**
 * Repositorio de Fiado (crédito a clientes): `clientes_fiado` + `movimientos_fiado`.
 * Tipos declarados aquí (no se modifica `types.ts`, fuera del alcance de la ronda).
 *
 * `registrarCargo`/`registrarAbono` actualizan `saldo_pendiente` del cliente.
 * Nota de atomicidad: sin un RPC, son dos operaciones (insert movimiento + update
 * saldo) read-modify-write, no una única transacción. Suficiente para una tiendita
 * de un cajero; ver caveat en el reporte.
 */

export interface ClienteFiado {
  id: string;
  negocio_id: string;
  nombre: string;
  telefono: string | null;
  saldo_pendiente: number;
  limite_credito: number;
  activo: boolean;
  notas: string | null;
  created_at: string;
  updated_at: string;
}

export interface MovimientoFiado {
  id: string;
  negocio_id: string;
  cliente_id: string;
  venta_id: string | null;
  tipo: 'cargo' | 'abono';
  monto: number;
  descripcion: string | null;
  cajero_id: string | null;
  cajero_nombre: string | null;
  created_at: string;
}

export type ClienteFiadoCreate = {
  negocio_id: string;
  nombre: string;
  telefono?: string | null;
  limite_credito?: number;
  notas?: string | null;
};

export type ClienteFiadoUpdate = Partial<
  Omit<ClienteFiado, 'id' | 'negocio_id' | 'created_at' | 'updated_at'>
>;

export async function getClientes(negocioId: string): Promise<ClienteFiado[]> {
  const { data, error } = await supabase
    .from('clientes_fiado')
    .select('*')
    .eq('negocio_id', negocioId)
    .order('nombre', { ascending: true })
    .returns<ClienteFiado[]>();

  if (error) throw error;
  return data ?? [];
}

export async function getClienteById(id: string): Promise<ClienteFiado | null> {
  const { data, error } = await supabase
    .from('clientes_fiado')
    .select('*')
    .eq('id', id)
    .maybeSingle()
    .returns<ClienteFiado | null>();

  if (error) throw error;
  return data ?? null;
}

export async function createCliente(data: ClienteFiadoCreate): Promise<ClienteFiado> {
  const { data: created, error } = await supabase
    .from('clientes_fiado')
    .insert(data)
    .select('*')
    .single()
    .returns<ClienteFiado>();

  if (error) throw error;
  return created;
}

export async function updateCliente(id: string, data: ClienteFiadoUpdate): Promise<ClienteFiado> {
  const { data: updated, error } = await supabase
    .from('clientes_fiado')
    .update(data)
    .eq('id', id)
    .select('*')
    .single()
    .returns<ClienteFiado>();

  if (error) throw error;
  return updated;
}

export async function getMovimientos(clienteId: string, negocioId: string): Promise<MovimientoFiado[]> {
  const { data, error } = await supabase
    .from('movimientos_fiado')
    .select('*')
    .eq('cliente_id', clienteId)
    .eq('negocio_id', negocioId)
    .order('created_at', { ascending: false })
    .returns<MovimientoFiado[]>();

  if (error) throw error;
  return data ?? [];
}

/** Cargo: registra el movimiento y SUMA al saldo pendiente del cliente. */
export async function registrarCargo(
  clienteId: string,
  negocioId: string,
  monto: number,
  ventaId: string | null,
  cajeroNombre: string,
  descripcion?: string | null,
): Promise<MovimientoFiado> {
  const { data: mov, error: movError } = await supabase
    .from('movimientos_fiado')
    .insert({
      negocio_id: negocioId,
      cliente_id: clienteId,
      venta_id: ventaId,
      tipo: 'cargo',
      monto,
      descripcion: descripcion ?? null,
      cajero_nombre: cajeroNombre,
    })
    .select('*')
    .single()
    .returns<MovimientoFiado>();
  if (movError) throw movError;

  const cliente = await getClienteById(clienteId);
  const nuevoSaldo = Number(cliente?.saldo_pendiente ?? 0) + monto;
  const { error: updError } = await supabase
    .from('clientes_fiado')
    .update({ saldo_pendiente: nuevoSaldo })
    .eq('id', clienteId);
  if (updError) throw updError;

  return mov;
}

/** Abono: registra el movimiento y RESTA del saldo pendiente (sin bajar de 0). */
export async function registrarAbono(
  clienteId: string,
  negocioId: string,
  monto: number,
  cajeroNombre: string,
): Promise<MovimientoFiado> {
  const { data: mov, error: movError } = await supabase
    .from('movimientos_fiado')
    .insert({
      negocio_id: negocioId,
      cliente_id: clienteId,
      venta_id: null,
      tipo: 'abono',
      monto,
      descripcion: 'Abono',
      cajero_nombre: cajeroNombre,
    })
    .select('*')
    .single()
    .returns<MovimientoFiado>();
  if (movError) throw movError;

  const cliente = await getClienteById(clienteId);
  const nuevoSaldo = Math.max(0, Number(cliente?.saldo_pendiente ?? 0) - monto);
  const { error: updError } = await supabase
    .from('clientes_fiado')
    .update({ saldo_pendiente: nuevoSaldo })
    .eq('id', clienteId);
  if (updError) throw updError;

  return mov;
}
