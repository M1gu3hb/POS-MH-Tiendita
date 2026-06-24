import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/db/supabase-server';

/**
 * POST /api/negocio/register
 *
 * Alta self-service: crea el usuario de Supabase Auth (confirmado) y, en una
 * transacción (RPC `registrar_negocio`), el negocio + usuario dueño +
 * configuración + suscripción inicial. Si la transacción falla, se revierte el
 * usuario de auth (acción compensatoria).
 *
 * Usa el cliente ADMIN (service role) porque crea el negocio/usuario raíz
 * antes de que exista una sesión, lo que RLS impediría de otro modo.
 */

const registerSchema = z.object({
  email: z.string().email('Correo inválido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  nombre_negocio: z.string().trim().min(2, 'Nombre del negocio requerido'),
  nombre_visible: z.string().trim().min(2, 'Tu nombre es requerido'),
});

export async function POST(request: Request): Promise<NextResponse> {
  const body: unknown = await request.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Datos inválidos', detalles: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { email, password, nombre_negocio, nombre_visible } = parsed.data;
  const admin = createAdminClient();

  // 1) Crear el usuario de auth (confirmado para que pueda iniciar sesión ya).
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (createError || !created.user) {
    const message = createError?.message ?? 'No se pudo crear el usuario';
    const status = message.toLowerCase().includes('already') ? 409 : 400;
    return NextResponse.json({ error: message }, { status });
  }

  const authUserId = created.user.id;

  // 2) Crear el tenant completo en una transacción (RPC `registrar_negocio`,
  //    SECURITY DEFINER). Devuelve { negocio_id, usuario_id }.
  const { data: result, error: rpcError } = await admin.rpc('registrar_negocio', {
    p_auth_user_id: authUserId,
    p_nombre_negocio: nombre_negocio,
    p_nombre_visible: nombre_visible,
    p_email: email,
  });

  if (rpcError) {
    // Compensación: revertir el usuario de auth para no dejar cuentas huérfanas.
    await admin.auth.admin.deleteUser(authUserId);
    return NextResponse.json({ error: rpcError.message }, { status: 500 });
  }

  const negocioId = (result as { negocio_id?: string } | null)?.negocio_id ?? null;
  return NextResponse.json({ success: true, negocio_id: negocioId });
}
