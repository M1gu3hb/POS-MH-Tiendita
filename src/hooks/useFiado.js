'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth/AuthContext';
import * as fiadoRepo from '@/lib/db/fiado';

/**
 * Hook de Fiado (crédito a clientes). Expone la lista de clientes del negocio y
 * mutaciones (crear cliente, registrar abono). Mismo patrón que el resto de hooks:
 * el componente nunca toca Supabase directo; pasa por el repositorio `fiado`.
 */
export function useFiado() {
  const { negocioId, usuario } = useAuth();
  const queryClient = useQueryClient();
  const cajeroNombre = usuario?.nombre_visible || 'Cajero';

  const { data: clientes = [], isLoading } = useQuery({
    queryKey: ['fiado-clientes', negocioId],
    queryFn: () => fiadoRepo.getClientes(negocioId),
    enabled: !!negocioId,
  });

  const invalidarClientes = () => {
    queryClient.invalidateQueries({ queryKey: ['fiado-clientes', negocioId] });
  };

  const crearCliente = async (data) => {
    const cliente = await fiadoRepo.createCliente({ ...data, negocio_id: negocioId });
    invalidarClientes();
    return cliente;
  };

  const abonar = async (clienteId, monto) => {
    await fiadoRepo.registrarAbono(clienteId, negocioId, monto, cajeroNombre);
    invalidarClientes();
    queryClient.invalidateQueries({ queryKey: ['fiado-movimientos', clienteId] });
  };

  return { clientes, isLoading, negocioId, cajeroNombre, crearCliente, abonar };
}
