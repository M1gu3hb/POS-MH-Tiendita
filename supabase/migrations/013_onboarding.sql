ALTER TABLE configuracion_negocio 
  ADD COLUMN IF NOT EXISTS onboarding_completado boolean NOT NULL DEFAULT false;
