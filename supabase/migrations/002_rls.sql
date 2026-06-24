-- ─────────────────────────────────────────────────────────────
-- POS MH Tiendita — Row Level Security
--
-- Patrón central: todos los usuarios del MISMO negocio ven los mismos
-- datos. El filtro es `negocio_id = get_negocio_id()`, no por usuario.
--
-- Restricciones de rol (p.ej. "solo dueño borra productos") viven
-- mayormente en las API Routes; aquí solo se aplican los casos que el
-- esquema exige explícitamente (productos.delete, suscripciones).
-- ─────────────────────────────────────────────────────────────

-- ── Funciones helper ─────────────────────────────────────────
-- IMPORTANTE: son SECURITY DEFINER a propósito. Si fueran SECURITY
-- INVOKER (el modo por defecto), al evaluar la política de SELECT de
-- `usuarios` (`negocio_id = get_negocio_id()`) Postgres volvería a
-- consultar `usuarios`, disparando la misma política => recursión
-- infinita. SECURITY DEFINER hace que la función lea `usuarios`
-- saltándose RLS, rompiendo el ciclo. Ver docs/DECISIONS.md.

create or replace function get_negocio_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select negocio_id from usuarios where auth_user_id = auth.uid() limit 1;
$$;

create or replace function get_user_rol()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select rol from usuarios where auth_user_id = auth.uid() limit 1;
$$;

grant execute on function get_negocio_id() to authenticated;
grant execute on function get_user_rol() to authenticated;

-- ── Habilitar RLS en TODAS las tablas ────────────────────────
alter table negocios enable row level security;
alter table usuarios enable row level security;
alter table sucursales enable row level security;
alter table configuracion_negocio enable row level security;
alter table categorias_producto enable row level security;
alter table proveedores enable row level security;
alter table productos enable row level security;
alter table cortes_caja enable row level security;
alter table ventas enable row level security;
alter table detalle_ventas enable row level security;
alter table compras_mercancia enable row level security;
alter table detalle_compras enable row level security;
alter table movimientos_inventario enable row level security;
alter table gastos_operativos enable row level security;
alter table carritos_activos enable row level security;
alter table carrito_items enable row level security;
alter table scan_events enable row level security;
alter table suscripciones enable row level security;
alter table reportes_generados enable row level security;
alter table audit_log enable row level security;

-- ── NEGOCIOS: cada quien solo ve/edita su propio negocio ─────
-- (La creación del negocio ocurre server-side con service_role en
--  /api/negocio/register, que ignora RLS.)
create policy "own_negocio" on negocios
  for all using (id = get_negocio_id());

-- ── USUARIOS: ver compañeros del mismo negocio; editar solo el propio perfil ─
-- (El alta de usuarios ocurre server-side con service_role.)
create policy "same_negocio_select" on usuarios
  for select using (negocio_id = get_negocio_id());
create policy "own_user_update" on usuarios
  for update using (auth_user_id = auth.uid())
  with check (auth_user_id = auth.uid());

-- ── SUSCRIPCIONES: solo dueño (gestión y lectura) ────────────
-- (Stripe escribe vía webhook con service_role, ignorando RLS.)
create policy "dueno_suscripcion" on suscripciones
  for all using (negocio_id = get_negocio_id() and get_user_rol() = 'dueno')
  with check (negocio_id = get_negocio_id() and get_user_rol() = 'dueno');

-- ── PRODUCTOS: select/insert/update = miembro; delete = dueño ─
create policy "productos_select" on productos
  for select using (negocio_id = get_negocio_id());
create policy "productos_insert" on productos
  for insert with check (negocio_id = get_negocio_id());
create policy "productos_update" on productos
  for update using (negocio_id = get_negocio_id())
  with check (negocio_id = get_negocio_id());
create policy "productos_delete" on productos
  for delete using (negocio_id = get_negocio_id() and get_user_rol() = 'dueno');

-- ── PATRÓN ESTÁNDAR (select/insert/update/delete = miembro) ──
-- Aplicado a todas las tablas operativas. Las restricciones de rol
-- adicionales se aplican en las API Routes.

-- sucursales
create policy "sucursales_select" on sucursales
  for select using (negocio_id = get_negocio_id());
create policy "sucursales_insert" on sucursales
  for insert with check (negocio_id = get_negocio_id());
create policy "sucursales_update" on sucursales
  for update using (negocio_id = get_negocio_id())
  with check (negocio_id = get_negocio_id());
create policy "sucursales_delete" on sucursales
  for delete using (negocio_id = get_negocio_id());

-- configuracion_negocio
create policy "configuracion_negocio_select" on configuracion_negocio
  for select using (negocio_id = get_negocio_id());
create policy "configuracion_negocio_insert" on configuracion_negocio
  for insert with check (negocio_id = get_negocio_id());
create policy "configuracion_negocio_update" on configuracion_negocio
  for update using (negocio_id = get_negocio_id())
  with check (negocio_id = get_negocio_id());
create policy "configuracion_negocio_delete" on configuracion_negocio
  for delete using (negocio_id = get_negocio_id());

-- categorias_producto
create policy "categorias_producto_select" on categorias_producto
  for select using (negocio_id = get_negocio_id());
create policy "categorias_producto_insert" on categorias_producto
  for insert with check (negocio_id = get_negocio_id());
create policy "categorias_producto_update" on categorias_producto
  for update using (negocio_id = get_negocio_id())
  with check (negocio_id = get_negocio_id());
create policy "categorias_producto_delete" on categorias_producto
  for delete using (negocio_id = get_negocio_id());

-- proveedores
create policy "proveedores_select" on proveedores
  for select using (negocio_id = get_negocio_id());
create policy "proveedores_insert" on proveedores
  for insert with check (negocio_id = get_negocio_id());
create policy "proveedores_update" on proveedores
  for update using (negocio_id = get_negocio_id())
  with check (negocio_id = get_negocio_id());
create policy "proveedores_delete" on proveedores
  for delete using (negocio_id = get_negocio_id());

-- cortes_caja
create policy "cortes_caja_select" on cortes_caja
  for select using (negocio_id = get_negocio_id());
create policy "cortes_caja_insert" on cortes_caja
  for insert with check (negocio_id = get_negocio_id());
create policy "cortes_caja_update" on cortes_caja
  for update using (negocio_id = get_negocio_id())
  with check (negocio_id = get_negocio_id());
create policy "cortes_caja_delete" on cortes_caja
  for delete using (negocio_id = get_negocio_id());

-- ventas
create policy "ventas_select" on ventas
  for select using (negocio_id = get_negocio_id());
create policy "ventas_insert" on ventas
  for insert with check (negocio_id = get_negocio_id());
create policy "ventas_update" on ventas
  for update using (negocio_id = get_negocio_id())
  with check (negocio_id = get_negocio_id());
create policy "ventas_delete" on ventas
  for delete using (negocio_id = get_negocio_id());

-- detalle_ventas
create policy "detalle_ventas_select" on detalle_ventas
  for select using (negocio_id = get_negocio_id());
create policy "detalle_ventas_insert" on detalle_ventas
  for insert with check (negocio_id = get_negocio_id());
create policy "detalle_ventas_update" on detalle_ventas
  for update using (negocio_id = get_negocio_id())
  with check (negocio_id = get_negocio_id());
create policy "detalle_ventas_delete" on detalle_ventas
  for delete using (negocio_id = get_negocio_id());

-- compras_mercancia
create policy "compras_mercancia_select" on compras_mercancia
  for select using (negocio_id = get_negocio_id());
create policy "compras_mercancia_insert" on compras_mercancia
  for insert with check (negocio_id = get_negocio_id());
create policy "compras_mercancia_update" on compras_mercancia
  for update using (negocio_id = get_negocio_id())
  with check (negocio_id = get_negocio_id());
create policy "compras_mercancia_delete" on compras_mercancia
  for delete using (negocio_id = get_negocio_id());

-- detalle_compras
create policy "detalle_compras_select" on detalle_compras
  for select using (negocio_id = get_negocio_id());
create policy "detalle_compras_insert" on detalle_compras
  for insert with check (negocio_id = get_negocio_id());
create policy "detalle_compras_update" on detalle_compras
  for update using (negocio_id = get_negocio_id())
  with check (negocio_id = get_negocio_id());
create policy "detalle_compras_delete" on detalle_compras
  for delete using (negocio_id = get_negocio_id());

-- movimientos_inventario
create policy "movimientos_inventario_select" on movimientos_inventario
  for select using (negocio_id = get_negocio_id());
create policy "movimientos_inventario_insert" on movimientos_inventario
  for insert with check (negocio_id = get_negocio_id());
create policy "movimientos_inventario_update" on movimientos_inventario
  for update using (negocio_id = get_negocio_id())
  with check (negocio_id = get_negocio_id());
create policy "movimientos_inventario_delete" on movimientos_inventario
  for delete using (negocio_id = get_negocio_id());

-- gastos_operativos
create policy "gastos_operativos_select" on gastos_operativos
  for select using (negocio_id = get_negocio_id());
create policy "gastos_operativos_insert" on gastos_operativos
  for insert with check (negocio_id = get_negocio_id());
create policy "gastos_operativos_update" on gastos_operativos
  for update using (negocio_id = get_negocio_id())
  with check (negocio_id = get_negocio_id());
create policy "gastos_operativos_delete" on gastos_operativos
  for delete using (negocio_id = get_negocio_id());

-- carritos_activos
create policy "carritos_activos_select" on carritos_activos
  for select using (negocio_id = get_negocio_id());
create policy "carritos_activos_insert" on carritos_activos
  for insert with check (negocio_id = get_negocio_id());
create policy "carritos_activos_update" on carritos_activos
  for update using (negocio_id = get_negocio_id())
  with check (negocio_id = get_negocio_id());
create policy "carritos_activos_delete" on carritos_activos
  for delete using (negocio_id = get_negocio_id());

-- carrito_items
create policy "carrito_items_select" on carrito_items
  for select using (negocio_id = get_negocio_id());
create policy "carrito_items_insert" on carrito_items
  for insert with check (negocio_id = get_negocio_id());
create policy "carrito_items_update" on carrito_items
  for update using (negocio_id = get_negocio_id())
  with check (negocio_id = get_negocio_id());
create policy "carrito_items_delete" on carrito_items
  for delete using (negocio_id = get_negocio_id());

-- scan_events
create policy "scan_events_select" on scan_events
  for select using (negocio_id = get_negocio_id());
create policy "scan_events_insert" on scan_events
  for insert with check (negocio_id = get_negocio_id());
create policy "scan_events_update" on scan_events
  for update using (negocio_id = get_negocio_id())
  with check (negocio_id = get_negocio_id());
create policy "scan_events_delete" on scan_events
  for delete using (negocio_id = get_negocio_id());

-- reportes_generados
create policy "reportes_generados_select" on reportes_generados
  for select using (negocio_id = get_negocio_id());
create policy "reportes_generados_insert" on reportes_generados
  for insert with check (negocio_id = get_negocio_id());
create policy "reportes_generados_update" on reportes_generados
  for update using (negocio_id = get_negocio_id())
  with check (negocio_id = get_negocio_id());
create policy "reportes_generados_delete" on reportes_generados
  for delete using (negocio_id = get_negocio_id());

-- ── AUDIT_LOG: solo lectura para miembros ────────────────────
-- Las escrituras SIEMPRE ocurren server-side con service_role (ver
-- sección 2.6 del prompt). No se otorga insert/update/delete a los
-- clientes para garantizar la integridad del registro de auditoría.
create policy "audit_log_select" on audit_log
  for select using (negocio_id = get_negocio_id());
