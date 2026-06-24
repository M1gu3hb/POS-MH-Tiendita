import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerAuthContext } from '@/lib/auth/server';
import { createServerSupabase } from '@/lib/db/supabase-server';
import { logAudit } from '@/lib/db/audit';
import type { Json, Venta } from '@/lib/db/types';

const cancelarVentaSchema = z.object({
  venta_id: z.string().uuid('venta_id invalido'),
  motivo: z.string().trim().min(1, 'Motivo requerido'),
});

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Error desconocido';
}

export async function POST(request: Request): Promise<NextResponse> {
  const body: unknown = await request.json().catch(() => null);
  const parsed = cancelarVentaSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Datos invalidos', detalles: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const ctx = await getServerAuthContext();
  if (!ctx) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!ctx.negocioId || !ctx.usuario) {
    return NextResponse.json({ error: 'Usuario sin negocio asociado' }, { status: 403 });
  }

  const supabase = createServerSupabase();
  const { venta_id, motivo } = parsed.data;

  const { data: ventaData, error: ventaError } = await supabase
    .from('ventas')
    .select('*')
    .eq('id', venta_id)
    .eq('negocio_id', ctx.negocioId)
    .maybeSingle();

  if (ventaError) {
    return NextResponse.json({ error: ventaError.message }, { status: 500 });
  }
  const venta = (ventaData as Venta | null) ?? null;
  if (!venta) {
    return NextResponse.json({ error: 'Venta no encontrada' }, { status: 404 });
  }

  const { data: ventaCancelada, error: cancelarError } = await supabase
    .from('ventas')
    .update({ estado: 'cancelada', motivo_cancelacion: motivo })
    .eq('id', venta_id)
    .eq('negocio_id', ctx.negocioId)
    .select('*')
    .single()
    .returns<Venta>();

  if (cancelarError) {
    return NextResponse.json({ error: cancelarError.message }, { status: 500 });
  }

  const payload: Json = {
    motivo,
    venta_total: venta.total,
    cajero_nombre: venta.cajero_nombre,
  };

  try {
    await logAudit({
      negocioId: ctx.negocioId,
      usuarioId: ctx.usuario.id,
      usuarioNombre: ctx.usuario.nombre_visible,
      accion: 'cancelar_venta',
      entidad: 'ventas',
      entidadId: venta_id,
      payload,
      ip: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
    });
  } catch (auditError) {
    const { error: revertError } = await supabase
      .from('ventas')
      .update({
        estado: venta.estado,
        motivo_cancelacion: venta.motivo_cancelacion,
      })
      .eq('id', venta_id)
      .eq('negocio_id', ctx.negocioId);

    if (revertError) {
      return NextResponse.json(
        {
          error: 'No se pudo registrar auditoria ni revertir la cancelacion',
          detalles: {
            audit_log: errorMessage(auditError),
            revert: revertError.message,
          },
        },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        error: 'No se pudo registrar auditoria; la cancelacion fue revertida',
        detalles: errorMessage(auditError),
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true, venta: ventaCancelada });
}
