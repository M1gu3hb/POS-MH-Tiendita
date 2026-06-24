-- ─────────────────────────────────────────────────────────────
-- POS MH Tiendita — Esquema inicial
-- Migración de Base44 → Supabase (PostgreSQL)
--
-- Decisiones clave (ver docs/DATABASE.md y docs/DECISIONS.md):
--   * Multi-tenant por `negocio_id` (no por `created_by`/email).
--   * `usuarios` extiende auth.users; `negocios` es la raíz del tenant.
--   * Carrito relacional (carrito_items) en vez de items_json.
--   * Snapshots de reporte como JSONB nativo (no string).
--   * audit_log para trazabilidad de cancelaciones/ajustes.
-- ─────────────────────────────────────────────────────────────

-- EXTENSIONES
create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm"; -- para búsqueda de productos por texto

-- NEGOCIOS (raíz del tenant)
create table negocios (
  id uuid primary key default uuid_generate_v4(),
  nombre text not null,
  slug text unique,
  plan text not null default 'trial' check (plan in ('trial','basico','pro','enterprise')),
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- USUARIOS (extiende auth.users de Supabase)
create table usuarios (
  id uuid primary key default uuid_generate_v4(),
  auth_user_id uuid unique references auth.users(id) on delete cascade,
  negocio_id uuid references negocios(id) on delete cascade,
  nombre_visible text not null,
  rol text not null default 'cajero' check (rol in ('dueno','cajero','admin')),
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- SUCURSALES
create table sucursales (
  id uuid primary key default uuid_generate_v4(),
  negocio_id uuid not null references negocios(id) on delete cascade,
  nombre text not null,
  direccion text,
  activa boolean not null default true,
  created_at timestamptz not null default now()
);

-- CONFIGURACION_NEGOCIO
create table configuracion_negocio (
  id uuid primary key default uuid_generate_v4(),
  negocio_id uuid not null unique references negocios(id) on delete cascade,
  logo_url text,
  background_logo_url text,
  color_primario text not null default '#2563eb',
  color_secundario text not null default '#1e40af',
  telefono text,
  whatsapp text,
  correo text,
  direccion text,
  moneda text not null default 'MXN',
  simbolo_moneda text not null default '$',
  mensaje_ticket text not null default '¡Gracias por su compra!',
  colorear_importes_monetarios boolean not null default true,
  permitir_venta_sin_stock boolean not null default false,
  activar_mayoreo boolean not null default false,
  activar_descuentos boolean not null default true,
  vista_cliente_activa boolean not null default true,
  abrir_caja_obligatorio boolean not null default true,
  iva_porcentaje numeric(5,2) not null default 0,
  mostrar_logo_ticket boolean not null default true,
  updated_at timestamptz not null default now()
);

-- CATEGORIAS_PRODUCTO
create table categorias_producto (
  id uuid primary key default uuid_generate_v4(),
  negocio_id uuid not null references negocios(id) on delete cascade,
  nombre text not null,
  color text not null default '#2563eb',
  icono text not null default 'Package',
  activa boolean not null default true,
  orden int not null default 0,
  created_at timestamptz not null default now()
);

-- PROVEEDORES
create table proveedores (
  id uuid primary key default uuid_generate_v4(),
  negocio_id uuid not null references negocios(id) on delete cascade,
  nombre text not null,
  contacto text,
  telefono text,
  whatsapp text,
  correo text,
  notas text,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- PRODUCTOS
create table productos (
  id uuid primary key default uuid_generate_v4(),
  negocio_id uuid not null references negocios(id) on delete cascade,
  categoria_id uuid references categorias_producto(id) on delete set null,
  proveedor_id uuid references proveedores(id) on delete set null,
  nombre text not null,
  marca text,
  descripcion text,
  imagen_url text,
  sku text,
  codigo_barras text,
  unidad_venta text not null default 'pieza'
    check (unidad_venta in ('pieza','caja','paquete','kg','gramos','litro','mililitro','metro','otro')),
  precio_venta numeric(12,2) not null default 0,
  costo_unitario numeric(12,2) not null default 0,
  stock_actual numeric(12,3) not null default 0,
  stock_minimo numeric(12,3) not null default 5,
  stock_maximo numeric(12,3) not null default 0,
  precio_mayoreo numeric(12,2) not null default 0,
  cantidad_minima_mayoreo numeric(12,3) not null default 0,
  activo boolean not null default true,
  permite_venta_sin_stock boolean not null default false,
  notas text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index productos_negocio_idx on productos(negocio_id);
create index productos_barcode_idx on productos(negocio_id, codigo_barras) where codigo_barras is not null;
create index productos_nombre_trgm_idx on productos using gin(nombre gin_trgm_ops);

-- CORTES_CAJA
create table cortes_caja (
  id uuid primary key default uuid_generate_v4(),
  negocio_id uuid not null references negocios(id) on delete cascade,
  sucursal_id uuid references sucursales(id) on delete set null,
  cajero_id uuid references usuarios(id) on delete set null,
  cajero_nombre text not null,
  fecha_apertura timestamptz not null default now(),
  fecha_cierre timestamptz,
  estado text not null default 'abierta' check (estado in ('abierta','cerrada')),
  fondo_inicial numeric(12,2) not null default 0,
  efectivo_esperado numeric(12,2) not null default 0,
  efectivo_contado numeric(12,2) not null default 0,
  diferencia numeric(12,2) not null default 0,
  efectivo_dejado_en_caja numeric(12,2) not null default 0,
  efectivo_retirado numeric(12,2) not null default 0,
  total_ventas numeric(12,2) not null default 0,
  total_efectivo numeric(12,2) not null default 0,
  total_tarjeta numeric(12,2) not null default 0,
  total_transferencia numeric(12,2) not null default 0,
  total_gastos numeric(12,2) not null default 0,
  utilidad_bruta numeric(12,2) not null default 0,
  utilidad_neta_estimada numeric(12,2) not null default 0,
  numero_ventas int not null default 0,
  ticket_promedio numeric(12,2) not null default 0,
  notas text,
  created_at timestamptz not null default now()
);

-- VENTAS
create table ventas (
  id uuid primary key default uuid_generate_v4(),
  negocio_id uuid not null references negocios(id) on delete cascade,
  sucursal_id uuid references sucursales(id) on delete set null,
  corte_id uuid references cortes_caja(id) on delete set null,
  cajero_id uuid references usuarios(id) on delete set null,
  cajero_nombre text not null,
  folio text not null,
  fecha timestamptz not null default now(),
  estado text not null default 'abierta' check (estado in ('abierta','pagada','cancelada')),
  subtotal numeric(12,2) not null default 0,
  descuento_total numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  costo_total_snapshot numeric(12,2) not null default 0,
  utilidad_bruta_snapshot numeric(12,2) not null default 0,
  margen_snapshot numeric(6,4) not null default 0,
  metodo_pago text not null default 'efectivo'
    check (metodo_pago in ('efectivo','tarjeta','transferencia','mixto')),
  monto_efectivo numeric(12,2) not null default 0,
  monto_tarjeta numeric(12,2) not null default 0,
  monto_transferencia numeric(12,2) not null default 0,
  monto_recibido numeric(12,2) not null default 0,
  cambio numeric(12,2) not null default 0,
  notas text,
  motivo_cancelacion text,
  created_at timestamptz not null default now(),
  unique(negocio_id, folio)
);
create index ventas_negocio_fecha_idx on ventas(negocio_id, fecha desc);
create index ventas_corte_idx on ventas(corte_id);

-- DETALLE_VENTAS
create table detalle_ventas (
  id uuid primary key default uuid_generate_v4(),
  venta_id uuid not null references ventas(id) on delete cascade,
  negocio_id uuid not null references negocios(id) on delete cascade,
  producto_id uuid references productos(id) on delete set null,
  producto_nombre text not null,
  sku text,
  codigo_barras text,
  cantidad numeric(12,3) not null default 1,
  unidad_venta text,
  precio_unitario_snapshot numeric(12,2) not null default 0,
  costo_unitario_snapshot numeric(12,2) not null default 0,
  subtotal numeric(12,2) not null default 0,
  descuento numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  utilidad_snapshot numeric(12,2) not null default 0
);
create index detalle_ventas_venta_idx on detalle_ventas(venta_id);
create index detalle_ventas_negocio_idx on detalle_ventas(negocio_id);

-- COMPRAS_MERCANCIA
create table compras_mercancia (
  id uuid primary key default uuid_generate_v4(),
  negocio_id uuid not null references negocios(id) on delete cascade,
  proveedor_id uuid references proveedores(id) on delete set null,
  proveedor_nombre text not null,
  usuario_id uuid references usuarios(id) on delete set null,
  usuario_nombre text,
  fecha date not null,
  total numeric(12,2) not null default 0,
  metodo_pago text not null default 'efectivo'
    check (metodo_pago in ('efectivo','tarjeta','transferencia','otro')),
  notas text,
  created_at timestamptz not null default now()
);

-- DETALLE_COMPRAS
create table detalle_compras (
  id uuid primary key default uuid_generate_v4(),
  compra_id uuid not null references compras_mercancia(id) on delete cascade,
  negocio_id uuid not null references negocios(id) on delete cascade,
  producto_id uuid references productos(id) on delete set null,
  producto_nombre text not null,
  cantidad_compra numeric(12,3) not null default 1,
  unidad_compra text not null default 'pieza'
    check (unidad_compra in ('pieza','caja','paquete','kg','litro','otro')),
  piezas_por_caja numeric(12,3) not null default 1,
  cantidad_stock_agregada numeric(12,3) not null default 0,
  costo_unitario numeric(12,2) not null default 0,
  costo_total numeric(12,2) not null default 0
);
create index detalle_compras_compra_idx on detalle_compras(compra_id);

-- MOVIMIENTOS_INVENTARIO
create table movimientos_inventario (
  id uuid primary key default uuid_generate_v4(),
  negocio_id uuid not null references negocios(id) on delete cascade,
  producto_id uuid references productos(id) on delete set null,
  producto_nombre text not null,
  usuario_id uuid references usuarios(id) on delete set null,
  usuario_nombre text,
  tipo_movimiento text not null
    check (tipo_movimiento in ('entrada_compra','salida_venta','ajuste','merma','devolucion','cancelacion')),
  cantidad numeric(12,3) not null,
  unidad text,
  stock_anterior numeric(12,3) not null,
  stock_nuevo numeric(12,3) not null,
  costo_unitario numeric(12,2) not null default 0,
  referencia_tipo text,
  referencia_id uuid,
  motivo text,
  fecha timestamptz not null default now()
);
create index movimientos_inventario_negocio_idx on movimientos_inventario(negocio_id, fecha desc);
create index movimientos_inventario_producto_idx on movimientos_inventario(producto_id);

-- GASTOS_OPERATIVOS
create table gastos_operativos (
  id uuid primary key default uuid_generate_v4(),
  negocio_id uuid not null references negocios(id) on delete cascade,
  corte_id uuid references cortes_caja(id) on delete set null,
  usuario_id uuid references usuarios(id) on delete set null,
  usuario_nombre text,
  concepto text not null,
  categoria text not null
    check (categoria in ('luz','renta','agua','internet','sueldos','mantenimiento','bolsas','transporte','comisiones','otro')),
  monto numeric(12,2) not null,
  fecha date not null,
  metodo_pago text not null default 'efectivo'
    check (metodo_pago in ('efectivo','tarjeta','transferencia','otro')),
  notas text,
  recurrente boolean not null default false,
  created_at timestamptz not null default now()
);

-- CARRITOS_ACTIVOS (relacional, no JSON blob)
create table carritos_activos (
  id uuid primary key default uuid_generate_v4(),
  negocio_id uuid not null references negocios(id) on delete cascade,
  corte_id uuid references cortes_caja(id) on delete cascade,
  cajero_id uuid references usuarios(id) on delete set null,
  estado text not null default 'activo' check (estado in ('activo','cerrado','cancelado')),
  total numeric(12,2) not null default 0,
  subtotal numeric(12,2) not null default 0,
  descuento_total numeric(12,2) not null default 0,
  cantidad_items int not null default 0,
  version int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table carrito_items (
  id uuid primary key default uuid_generate_v4(),
  carrito_id uuid not null references carritos_activos(id) on delete cascade,
  negocio_id uuid not null references negocios(id) on delete cascade,
  producto_id uuid references productos(id) on delete set null,
  producto_nombre text not null,
  sku text,
  codigo_barras text,
  cantidad numeric(12,3) not null default 1,
  precio_unitario numeric(12,2) not null default 0,
  costo_unitario numeric(12,2) not null default 0,
  descuento numeric(12,2) not null default 0,
  subtotal numeric(12,2) not null default 0,
  es_mayoreo boolean not null default false
);
create index carrito_items_carrito_idx on carrito_items(carrito_id);

-- SCAN_EVENTS
create table scan_events (
  id uuid primary key default uuid_generate_v4(),
  negocio_id uuid not null references negocios(id) on delete cascade,
  corte_id uuid references cortes_caja(id) on delete set null,
  device_id text,
  source_device text not null default 'mobile_scanner'
    check (source_device in ('mobile_scanner','desktop_pos','other')),
  codigo_barras text not null,
  producto_id uuid references productos(id) on delete set null,
  producto_nombre text,
  cantidad numeric(12,3) not null default 1,
  precio_unitario numeric(12,2) not null default 0,
  estado text not null default 'pendiente'
    check (estado in ('pendiente','procesado','error','descartado')),
  usuario_id uuid references usuarios(id) on delete set null,
  error_msg text,
  created_at timestamptz not null default now()
);
create index scan_events_corte_idx on scan_events(corte_id, created_at desc);

-- SUSCRIPCIONES
create table suscripciones (
  id uuid primary key default uuid_generate_v4(),
  negocio_id uuid not null unique references negocios(id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  stripe_checkout_session_id text,
  stripe_price_id text,
  estado text not null default 'sin_suscripcion'
    check (estado in ('sin_suscripcion','trialing','active','past_due','unpaid','canceled','incomplete','incomplete_expired','paused')),
  trial_inicio timestamptz,
  trial_fin timestamptz,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  ultimo_pago_estado text,
  ultimo_error_pago text,
  trial_usado boolean not null default false,
  updated_at timestamptz not null default now()
);

-- REPORTES_GENERADOS
create table reportes_generados (
  id uuid primary key default uuid_generate_v4(),
  negocio_id uuid not null references negocios(id) on delete cascade,
  usuario_id uuid references usuarios(id) on delete set null,
  usuario_nombre text,
  tipo text not null
    check (tipo in ('corte_caja','resumen_financiero','ventas_periodo','compras','gastos','inventario')),
  titulo text not null,
  periodo_inicio date,
  periodo_fin date,
  referencia_tipo text,
  referencia_id uuid,
  estado text not null default 'generado' check (estado in ('generado','cancelado')),
  total_ventas numeric(12,2) not null default 0,
  costo_venta numeric(12,2) not null default 0,
  utilidad_bruta numeric(12,2) not null default 0,
  gastos_operativos numeric(12,2) not null default 0,
  compras_mercancia numeric(12,2) not null default 0,
  utilidad_neta numeric(12,2) not null default 0,
  datos_snapshot jsonb,
  created_at timestamptz not null default now()
);

-- AUDIT_LOG (nuevo — crítico para POS)
create table audit_log (
  id uuid primary key default uuid_generate_v4(),
  negocio_id uuid not null references negocios(id) on delete cascade,
  usuario_id uuid references usuarios(id) on delete set null,
  usuario_nombre text,
  accion text not null,
  entidad text not null,
  entidad_id uuid,
  payload jsonb,
  ip text,
  created_at timestamptz not null default now()
);
create index audit_log_negocio_idx on audit_log(negocio_id, created_at desc);
