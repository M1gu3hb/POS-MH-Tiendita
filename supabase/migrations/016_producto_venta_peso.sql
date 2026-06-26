ALTER TABLE productos
  ADD COLUMN IF NOT EXISTS vendido_por_peso boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS precio_por_kg numeric(10,2);
