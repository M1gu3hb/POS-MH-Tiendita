-- ── SUSCRIPCIONES: SELECT para cajeros del mismo negocio ──────
CREATE POLICY "suscripcion_select_cajero" ON suscripciones
  FOR SELECT USING (negocio_id = get_negocio_id());
