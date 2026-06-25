import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerAuthContext } from '@/lib/auth/server';
import { createServerSupabase } from '@/lib/db/supabase-server';
import { logAudit } from '@/lib/db/audit';
import type { Json } from '@/lib/db/types';

const itemSchema = z.object({
  producto_id: z.string().uuid().nullable(),
  producto_nombre: z.string().trim().min(1, 'Producto requerido'),
  cantidad_devuelta: z.coerce.number().positive('Cantidad invalida'),
  precio_unitario: z.coerce.number().nonnegative('Precio invalido'),
  regresa_a_inventario: z.boolean(),
});

const devolucionSchema = z.object({
  venta_id: z.string().uuid('venta_id invalido'),
  motivo: z.string().trim().min(1, 'Motivo requerido'),
  tipo_devolucion: z.enum(['dinero', 'credito_siguiente_compra']),
  items: z.array(itemSchema).min(1, 'Selecciona al menos un producto'),
});

type ProductoStock = {
  id: string;
  nombre: string;
  stock_actual: number;
  costo_unitario: number;
  unidad_venta: string | null;
};

type VentaProcesable = {
  id: string;
  estado: string;
  cajero_id: string | null;
  cajero_nombre: string | null;
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Error desconocido';
}

function money(value: number): number {
  return Math.round(value * 100) / 100;
}

export async function POST(request: Request): Promise<NextResponse> {
  const body: unknown = await request.json().catch(() => null);
  const parsed = devolucionSchema.safeParse(body);
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
  const { venta_id, motivo, tipo_devolucion, items } = parsed.data;
  const monto_devuelto = money(
    items.reduce((sum, item) => sum + item.cantidad_devuelta * item.precio_unitario, 0),
  );

  const { data: ventaData, error: ventaError } = await supabase
    .from('ventas')
    .select('id, estado, cajero_id, cajero_nombre')
    .eq('id', venta_id)
    .eq('negocio_id', ctx.negocioId)
    .maybeSingle()
    .returns<VentaProcesable | null>();

  if (ventaError) {
    return NextResponse.json({ error: ventaError.message }, { status: 500 });
  }
  if (!ventaData) {
    return NextResponse.json({ error: 'Venta no encontrada' }, { status: 404 });
  }
  if (ventaData.estado !== 'pagada') {
    return NextResponse.json({ error: 'Solo se pueden devolver ventas pagadas' }, { status: 400 });
  }

  const { data: devolucion, error: devolucionError } = await supabase
    .from('devoluciones')
    .insert({
      negocio_id: ctx.negocioId,
      venta_id,
      cajero_id: ventaData.cajero_id,
      cajero_nombre: ventaData.cajero_nombre,
      motivo,
      tipo_devolucion,
      monto_devuelto,
    })
    .select('*')
    .single();

  if (devolucionError || !devolucion) {
    return NextResponse.json({ error: devolucionError?.message || 'No se pudo crear la devolucion' }, { status: 500 });
  }

  const detalleRows = items.map((item) => ({
    devolucion_id: devolucion.id,
    negocio_id: ctx.negocioId,
    producto_id: item.producto_id,
    producto_nombre: item.producto_nombre,
    cantidad_devuelta: item.cantidad_devuelta,
    precio_unitario: item.precio_unitario,
    subtotal: money(item.cantidad_devuelta * item.precio_unitario),
    regresa_a_inventario: item.regresa_a_inventario,
  }));

  const { error: detalleError } = await supabase
    .from('detalle_devoluciones')
    .insert(detalleRows);

  if (detalleError) {
    return NextResponse.json({ error: detalleError.message }, { status: 500 });
  }

  for (const item of items) {
    if (!item.regresa_a_inventario || !item.producto_id) continue;

    const { data: producto, error: productoError } = await supabase
      .from('productos')
      .select('id, nombre, stock_actual, costo_unitario, unidad_venta')
      .eq('id', item.producto_id)
      .eq('negocio_id', ctx.negocioId)
      .maybeSingle()
      .returns<ProductoStock | null>();

    if (productoError) {
      return NextResponse.json({ error: productoError.message }, { status: 500 });
    }
    if (!producto) {
      return NextResponse.json({ error: `Producto no encontrado: ${item.producto_nombre}` }, { status: 404 });
    }

    const stockAnterior = Number(producto.stock_actual || 0);
    const stockNuevo = stockAnterior + item.cantidad_devuelta;

    const { error: stockError } = await supabase
      .from('productos')
      .update({ stock_actual: stockNuevo })
      .eq('id', item.producto_id)
      .eq('negocio_id', ctx.negocioId);

    if (stockError) {
      return NextResponse.json({ error: stockError.message }, { status: 500 });
    }

    const { error: movimientoError } = await supabase
      .from('movimientos_inventario')
      .insert({
        negocio_id: ctx.negocioId,
        producto_id: item.producto_id,
        producto_nombre: producto.nombre || item.producto_nombre,
        usuario_id: ctx.usuario.id,
        usuario_nombre: ctx.usuario.nombre_visible,
        tipo_movimiento: 'devolucion',
        cantidad: item.cantidad_devuelta,
        unidad: producto.unidad_venta,
        stock_anterior: stockAnterior,
        stock_nuevo: stockNuevo,
        costo_unitario: producto.costo_unitario || 0,
        referencia_tipo: 'devolucion',
        referencia_id: devolucion.id,
        motivo,
      });

    if (movimientoError) {
      return NextResponse.json({ error: movimientoError.message }, { status: 500 });
    }
  }

  try {
    const payload: Json = { motivo, monto_devuelto };
    await logAudit({
      negocioId: ctx.negocioId,
      usuarioId: ctx.usuario.id,
      usuarioNombre: ctx.usuario.nombre_visible,
      accion: 'devolucion',
      entidad: 'ventas',
      entidadId: venta_id,
      payload,
      ip: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
    });
  } catch (auditError) {
    return NextResponse.json(
      { error: 'No se pudo registrar auditoria de la devolucion', detalles: errorMessage(auditError) },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true, devolucion, monto_devuelto });
}
