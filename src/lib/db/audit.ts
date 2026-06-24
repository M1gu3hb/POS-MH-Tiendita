import 'server-only';

import { createAdminClient } from '@/lib/db/supabase-server';
import type { Json } from '@/lib/db/types';

/**
 * Repositorio de `audit_log` — SOLO escritura server-side con service role.
 *
 * En un POS es crítico saber quién canceló una venta o ajustó inventario y
 * cuándo. Las inserciones ignoran RLS (service role) para garantizar que el
 * registro no dependa de los permisos del cliente; los clientes solo pueden
 * LEER su propio negocio (política RLS), nunca escribir/alterar.
 *
 * Se invoca desde las API Routes (cancelación de venta, ajuste de inventario…).
 */

export interface AuditEntry {
  negocioId: string;
  usuarioId?: string | null;
  usuarioNombre?: string | null;
  accion: string; // p.ej. 'cancelar_venta', 'ajustar_inventario'
  entidad: string; // p.ej. 'ventas', 'productos'
  entidadId?: string | null;
  payload?: Json | null;
  ip?: string | null;
}

export async function logAudit(entry: AuditEntry): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from('audit_log').insert({
    negocio_id: entry.negocioId,
    usuario_id: entry.usuarioId ?? null,
    usuario_nombre: entry.usuarioNombre ?? null,
    accion: entry.accion,
    entidad: entry.entidad,
    entidad_id: entry.entidadId ?? null,
    payload: entry.payload ?? null,
    ip: entry.ip ?? null,
  });

  if (error) throw error;
}
