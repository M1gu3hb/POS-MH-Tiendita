-- ─────────────────────────────────────────────────────────────
-- POS MH Tiendita — Funciones de negocio
-- ─────────────────────────────────────────────────────────────

-- crear_negocio_inicial: alta atómica del tenant tras registrar un usuario.
-- Crea, en UNA transacción: negocio + usuario (rol dueño) + configuración +
-- suscripción inicial (sin_suscripcion). Devuelve el negocio_id.
--
-- Se invoca server-side desde /api/negocio/register con el cliente admin
-- (service_role). Es SECURITY DEFINER y se revoca a anon/authenticated para
-- que ningún cliente pueda fabricar negocios saltándose el flujo de registro.
create or replace function crear_negocio_inicial(
  p_auth_user_id uuid,
  p_nombre_negocio text,
  p_nombre_visible text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_negocio_id uuid;
begin
  insert into negocios (nombre)
    values (p_nombre_negocio)
    returning id into v_negocio_id;

  insert into usuarios (auth_user_id, negocio_id, nombre_visible, rol)
    values (p_auth_user_id, v_negocio_id, p_nombre_visible, 'dueno');

  insert into configuracion_negocio (negocio_id)
    values (v_negocio_id);

  insert into suscripciones (negocio_id, estado)
    values (v_negocio_id, 'sin_suscripcion');

  return v_negocio_id;
end;
$$;

revoke all on function crear_negocio_inicial(uuid, text, text) from public, anon, authenticated;
grant execute on function crear_negocio_inicial(uuid, text, text) to service_role;
