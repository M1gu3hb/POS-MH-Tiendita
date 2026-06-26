CREATE TABLE IF NOT EXISTS combos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  negocio_id uuid NOT NULL REFERENCES negocios(id) ON DELETE CASCADE,
  nombre text NOT NULL,
  precio_combo numeric(10,2) NOT NULL,
  precio_sugerido numeric(10,2),
  activo boolean NOT NULL DEFAULT true,
  fecha_inicio date,
  fecha_fin date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS combo_productos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  combo_id uuid NOT NULL REFERENCES combos(id) ON DELETE CASCADE,
  producto_id uuid NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  cantidad integer NOT NULL DEFAULT 1
);

ALTER TABLE combos ENABLE ROW LEVEL SECURITY;
ALTER TABLE combo_productos ENABLE ROW LEVEL SECURITY;

CREATE POLICY combos_negocio ON combos
  FOR ALL USING (negocio_id = get_negocio_id())
  WITH CHECK (negocio_id = get_negocio_id());

CREATE POLICY combo_productos_negocio ON combo_productos
  FOR ALL USING (
    combo_id IN (SELECT id FROM combos WHERE negocio_id = get_negocio_id())
  )
  WITH CHECK (
    combo_id IN (SELECT id FROM combos WHERE negocio_id = get_negocio_id())
  );

-- trigger updated_at
CREATE TRIGGER combos_updated_at BEFORE UPDATE ON combos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
