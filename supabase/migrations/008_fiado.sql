-- ─────────────────────────────────────────────────────────────
-- POS MH Tiendita — Sistema de Fiado (crédito a clientes)
-- Tablas clientes_fiado + movimientos_fiado, RLS por negocio, trigger updated_at.
-- Incluye el método de pago 'fiado' en el check de ventas.metodo_pago.
-- ─────────────────────────────────────────────────────────────

CREATE TABLE clientes_fiado (
  id uuid primary key default uuid_generate_v4(),
  negocio_id uuid not null references negocios(id) on delete cascade,
  nombre text not null,
  telefono text,
  saldo_pendiente numeric(12,2) not null default 0,
  limite_credito numeric(12,2) not null default 500,
  activo boolean not null default true,
  notas text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

CREATE TABLE movimientos_fiado (
  id uuid primary key default uuid_generate_v4(),
  negocio_id uuid not null references negocios(id) on delete cascade,
  cliente_id uuid not null references clientes_fiado(id) on delete cascade,
  venta_id uuid references ventas(id) on delete set null,
  tipo text not null check (tipo in ('cargo','abono')),
  monto numeric(12,2) not null,
  descripcion text,
  cajero_id uuid references usuarios(id) on delete set null,
  cajero_nombre text,
  created_at timestamptz not null default now()
);

-- Índices de apoyo (consultas por tenant / por cliente).
create index clientes_fiado_negocio_idx on clientes_fiado(negocio_id);
create index movimientos_fiado_cliente_idx on movimientos_fiado(cliente_id, created_at desc);

-- RLS
ALTER TABLE clientes_fiado ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimientos_fiado ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fiado_negocio_select" ON clientes_fiado
  FOR SELECT USING (negocio_id = get_negocio_id());
CREATE POLICY "fiado_negocio_insert" ON clientes_fiado
  FOR INSERT WITH CHECK (negocio_id = get_negocio_id());
CREATE POLICY "fiado_negocio_update" ON clientes_fiado
  FOR UPDATE USING (negocio_id = get_negocio_id());

CREATE POLICY "mov_fiado_select" ON movimientos_fiado
  FOR SELECT USING (negocio_id = get_negocio_id());
CREATE POLICY "mov_fiado_insert" ON movimientos_fiado
  FOR INSERT WITH CHECK (negocio_id = get_negocio_id());

-- Trigger updated_at (la función update_updated_at() ya existe en la BD).
CREATE TRIGGER clientes_fiado_updated_at
  BEFORE UPDATE ON clientes_fiado
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Habilitar 'fiado' como método de pago de ventas.
ALTER TABLE ventas DROP CONSTRAINT IF EXISTS ventas_metodo_pago_check;
ALTER TABLE ventas ADD CONSTRAINT ventas_metodo_pago_check
  CHECK (metodo_pago in ('efectivo','tarjeta','transferencia','mixto','fiado'));
