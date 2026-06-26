ALTER TABLE configuracion_negocio
  ADD COLUMN IF NOT EXISTS cliente_frecuente_activo boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS puntos_por_peso numeric(6,2) NOT NULL DEFAULT 1.00;

ALTER TABLE clientes_fiado
  ADD COLUMN IF NOT EXISTS puntos_acumulados integer NOT NULL DEFAULT 0;
