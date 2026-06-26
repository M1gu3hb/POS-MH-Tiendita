-- 014: Marcar negocios preexistentes como onboarding completado
-- Ya aplicada en BD. Archivo reconstruido para mantener repo == BD.
UPDATE configuracion_negocio 
SET onboarding_completado = true
WHERE negocio_id IN (
  SELECT DISTINCT negocio_id FROM productos
  UNION
  SELECT DISTINCT negocio_id FROM ventas
  UNION  
  SELECT DISTINCT negocio_id FROM cortes_caja
);
