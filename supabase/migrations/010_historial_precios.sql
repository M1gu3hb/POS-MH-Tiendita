CREATE TABLE historial_precios (
  id uuid primary key default uuid_generate_v4(),
  negocio_id uuid not null references negocios(id) on delete cascade,
  producto_id uuid not null references productos(id) on delete cascade,
  precio_venta_anterior numeric(12,2) not null,
  precio_venta_nuevo numeric(12,2) not null,
  costo_anterior numeric(12,2) not null default 0,
  costo_nuevo numeric(12,2) not null default 0,
  usuario_id uuid references usuarios(id) on delete set null,
  usuario_nombre text,
  motivo text,
  created_at timestamptz not null default now()
);

ALTER TABLE historial_precios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "historial_select" ON historial_precios
  FOR SELECT USING (negocio_id = get_negocio_id());
CREATE POLICY "historial_insert" ON historial_precios
  FOR INSERT WITH CHECK (negocio_id = get_negocio_id());

CREATE OR REPLACE FUNCTION registrar_cambio_precio()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF (OLD.precio_venta <> NEW.precio_venta OR
      OLD.costo_unitario <> NEW.costo_unitario) THEN
    INSERT INTO historial_precios (
      negocio_id, producto_id,
      precio_venta_anterior, precio_venta_nuevo,
      costo_anterior, costo_nuevo
    ) VALUES (
      NEW.negocio_id, NEW.id,
      OLD.precio_venta, NEW.precio_venta,
      OLD.costo_unitario, NEW.costo_unitario
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER productos_precio_changed
  AFTER UPDATE ON productos
  FOR EACH ROW EXECUTE FUNCTION registrar_cambio_precio();
