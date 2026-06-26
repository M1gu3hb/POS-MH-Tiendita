ALTER TABLE configuracion_negocio
  ADD COLUMN IF NOT EXISTS escaner_fisico_activo boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS bascula_activa boolean NOT NULL DEFAULT false;
