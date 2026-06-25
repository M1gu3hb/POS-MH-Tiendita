CREATE TABLE devoluciones (
  id uuid primary key default uuid_generate_v4(),
  negocio_id uuid not null references negocios(id) on delete cascade,
  venta_id uuid not null references ventas(id) on delete cascade,
  cajero_id uuid references usuarios(id) on delete set null,
  cajero_nombre text,
  motivo text not null,
  tipo_devolucion text not null
    check (tipo_devolucion in ('dinero','credito_siguiente_compra')),
  monto_devuelto numeric(12,2) not null default 0,
  estado text not null default 'procesada'
    check (estado in ('procesada','cancelada')),
  created_at timestamptz not null default now()
);

CREATE TABLE detalle_devoluciones (
  id uuid primary key default uuid_generate_v4(),
  devolucion_id uuid not null references devoluciones(id) on delete cascade,
  negocio_id uuid not null references negocios(id) on delete cascade,
  producto_id uuid references productos(id) on delete set null,
  producto_nombre text not null,
  cantidad_devuelta numeric(12,3) not null,
  precio_unitario numeric(12,2) not null,
  subtotal numeric(12,2) not null,
  regresa_a_inventario boolean not null default true
);

ALTER TABLE devoluciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE detalle_devoluciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dev_select" ON devoluciones
  FOR SELECT USING (negocio_id = get_negocio_id());
CREATE POLICY "dev_insert" ON devoluciones
  FOR INSERT WITH CHECK (negocio_id = get_negocio_id());
CREATE POLICY "det_dev_select" ON detalle_devoluciones
  FOR SELECT USING (negocio_id = get_negocio_id());
CREATE POLICY "det_dev_insert" ON detalle_devoluciones
  FOR INSERT WITH CHECK (negocio_id = get_negocio_id());
