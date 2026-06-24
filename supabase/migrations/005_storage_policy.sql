-- ─────────────────────────────────────────────────────────────
-- POS MH Tiendita — Endurecimiento de escritura del bucket negocio-assets
-- Refleja el estado aplicado en la BD (repo == BD).
--
-- Antes (004): cualquier usuario `authenticated` podía escribir en CUALQUIER
-- carpeta del bucket (`with check (bucket_id = 'negocio-assets')`).
-- Ahora: solo puede escribir dentro de la carpeta cuyo primer segmento de ruta
-- coincide con SU negocio_id, resuelto por get_negocio_id() (SECURITY DEFINER,
-- ya existente en 002_rls). La ruta del objeto es `<negocio_id>/...`, por lo que
-- (storage.foldername(name))[1] = '<negocio_id>'.
--
-- La política de LECTURA pública (negocio_assets_read) se mantiene como está (004).
-- ─────────────────────────────────────────────────────────────

-- INSERT: solo en la carpeta del propio negocio.
drop policy if exists "negocio_assets_insert" on storage.objects;
create policy "negocio_assets_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'negocio-assets'
    and (storage.foldername(name))[1] = get_negocio_id()::text
  );

-- UPDATE: solo en la carpeta del propio negocio (using + with check).
drop policy if exists "negocio_assets_update" on storage.objects;
create policy "negocio_assets_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'negocio-assets'
    and (storage.foldername(name))[1] = get_negocio_id()::text
  )
  with check (
    bucket_id = 'negocio-assets'
    and (storage.foldername(name))[1] = get_negocio_id()::text
  );
