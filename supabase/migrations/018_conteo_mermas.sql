-- ─────────────────────────────────────────────────────────────
-- POS MH Tiendita — Conteo/arqueo de inventario (anti robo hormiga)
--
-- PENDIENTE DE APLICAR: este archivo NO ha sido aplicado a la BD. El director
-- lo aplica. (Regla de migraciones de la ronda.)
--
-- MERMAS: NO se crea tabla nueva. El kardex `movimientos_inventario` ya soporta
-- `tipo_movimiento = 'merma'`, así que las mermas se registran ahí vía
-- `ajustarStock(... tipoMovimiento: 'merma')` (ver src/lib/db/inventario.ts).
-- Esta migración solo añade las tablas de CONTEO (que sí son nuevas).
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS conteos_inventario (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  negocio_id uuid NOT NULL REFERENCES negocios(id) ON DELETE CASCADE,
  fecha timestamptz NOT NULL DEFAULT now(),
  usuario_nombre text,
  total_productos integer NOT NULL DEFAULT 0,
  productos_con_diferencia integer NOT NULL DEFAULT 0,
  valor_diferencia numeric(12,2) NOT NULL DEFAULT 0,
  notas text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS conteo_detalle (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conteo_id uuid NOT NULL REFERENCES conteos_inventario(id) ON DELETE CASCADE,
  producto_id uuid NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  stock_sistema integer NOT NULL,
  stock_contado integer NOT NULL,
  diferencia integer NOT NULL,
  valor_diferencia numeric(10,2) NOT NULL DEFAULT 0
);

-- Índices de apoyo (consultas por tenant / por conteo).
CREATE INDEX IF NOT EXISTS conteos_inventario_negocio_idx ON conteos_inventario(negocio_id, fecha DESC);
CREATE INDEX IF NOT EXISTS conteo_detalle_conteo_idx ON conteo_detalle(conteo_id);

ALTER TABLE conteos_inventario ENABLE ROW LEVEL SECURITY;
ALTER TABLE conteo_detalle ENABLE ROW LEVEL SECURITY;

CREATE POLICY conteos_negocio ON conteos_inventario
  FOR ALL USING (negocio_id = get_negocio_id())
  WITH CHECK (negocio_id = get_negocio_id());

CREATE POLICY conteo_detalle_negocio ON conteo_detalle
  FOR ALL USING (
    conteo_id IN (SELECT id FROM conteos_inventario WHERE negocio_id = get_negocio_id())
  )
  WITH CHECK (
    conteo_id IN (SELECT id FROM conteos_inventario WHERE negocio_id = get_negocio_id())
  );
