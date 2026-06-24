-- ─────────────────────────────────────────────────────────────
-- POS MH Tiendita — Funciones de negocio
--
-- Este archivo refleja EXACTAMENTE la función desplegada en la BD
-- (migración 003_register_rpc). Repo y BD deben quedar idénticos.
-- ─────────────────────────────────────────────────────────────

-- registrar_negocio: alta atómica del tenant tras registrar un usuario.
-- Crea, en UNA transacción: negocio + usuario (rol dueño) + configuración +
-- suscripción inicial. Devuelve json { negocio_id, usuario_id }.
--
-- Se invoca server-side desde /api/negocio/register con el cliente admin
-- (service_role). Es SECURITY DEFINER.
create or replace function public.registrar_negocio(
  p_auth_user_id uuid,
  p_nombre_negocio text,
  p_nombre_visible text,
  p_email text
)
returns json
language plpgsql
security definer
as $function$
declare
  v_negocio_id uuid;
  v_usuario_id uuid;
begin
  -- 1. Crear negocio
  insert into negocios (nombre, plan)
  values (p_nombre_negocio, 'trial')
  returning id into v_negocio_id;

  -- 2. Crear usuario dueño
  insert into usuarios (auth_user_id, negocio_id, nombre_visible, rol)
  values (p_auth_user_id, v_negocio_id, p_nombre_visible, 'dueno')
  returning id into v_usuario_id;

  -- 3. Configuración inicial del negocio
  insert into configuracion_negocio (negocio_id)
  values (v_negocio_id);

  -- 4. Suscripción inicial (sin suscripción)
  insert into suscripciones (negocio_id)
  values (v_negocio_id);

  return json_build_object(
    'negocio_id', v_negocio_id,
    'usuario_id', v_usuario_id
  );
end;
$function$;
