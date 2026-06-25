import { NextResponse } from 'next/server';
import { getServerAuthContext } from '@/lib/auth/server';
import { createAdminClient } from '@/lib/db/supabase-server';

/**
 * POST /api/ventas — procesa una venta (típicamente una venta hecha OFFLINE que se
 * sincroniza al volver internet) mediante el RPC transaccional `crear_venta_completa`:
 * crea la venta + el detalle, descuenta stock y registra el kardex en una sola
 * transacción atómica.
 *
 * Seguridad: `negocio_id` y `cajero_id` se toman de la SESIÓN (no del body). El RPC
 * solo lo puede ejecutar `service_role`, por eso se invoca con el cliente admin.
 */

interface VentaItemBody {
  producto_id: string | null;
  producto_nombre: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  descuento: number;
  total: number;
}

interface VentaBody {
  cajero_nombre?: string;
  corte_id?: string | null;
  folio?: string;
  metodo_pago?: string;
  subtotal?: number;
  descuento_total?: number;
  total?: number;
  monto_recibido?: number;
  cambio?: number;
  notas?: string | null;
  items?: VentaItemBody[];
}

export async function POST(request: Request): Promise<NextResponse> {
  // 1) Validar sesión y obtener negocio_id / cajero_id del usuario.
  const ctx = await getServerAuthContext();
  if (!ctx || !ctx.negocioId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as VentaBody | null;
  if (!body || !body.folio || !Array.isArray(body.items) || body.items.length === 0) {
    return NextResponse.json({ error: 'Venta inválida (folio e items requeridos)' }, { status: 400 });
  }

  const negocioId = ctx.negocioId;
  const cajeroId = ctx.usuario?.id ?? null;

  // 3) Procesar con el RPC transaccional usando el cliente admin (service_role).
  const admin = createAdminClient();
  const { data, error } = await admin.rpc('crear_venta_completa', {
    p_negocio_id: negocioId,
    p_cajero_id: cajeroId,
    p_cajero_nombre: body.cajero_nombre ?? ctx.usuario?.nombre_visible ?? 'Cajero',
    p_corte_id: body.corte_id ?? null,
    p_folio: body.folio,
    p_metodo_pago: body.metodo_pago || 'efectivo',
    p_subtotal: body.subtotal ?? 0,
    p_descuento_total: body.descuento_total || 0,
    p_total: body.total ?? 0,
    p_monto_recibido: body.monto_recibido || body.total || 0,
    p_cambio: body.cambio || 0,
    p_monto_efectivo: body.total ?? 0,
    p_monto_tarjeta: 0,
    p_monto_transferencia: 0,
    p_notas: body.notas || null,
    p_items: body.items,
  });

  // 4) Error → 500 con el mensaje. 5) OK → 200 con data.
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 200 });
}
