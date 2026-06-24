-- ─────────────────────────────────────────────────────────────
-- POS MH Tiendita — Storage + Realtime
-- Refleja el estado aplicado en la BD (repo == BD).
-- ─────────────────────────────────────────────────────────────

-- Bucket público para logos / imágenes del negocio (lo usa /api/storage/upload).
insert into storage.buckets (id, name, public)
values ('negocio-assets', 'negocio-assets', true)
on conflict (id) do update set public = excluded.public;

-- Políticas de storage.objects para el bucket:
--   lectura pública (bucket público) · escritura solo para usuarios autenticados.
drop policy if exists "negocio_assets_read" on storage.objects;
create policy "negocio_assets_read" on storage.objects
  for select using (bucket_id = 'negocio-assets');

drop policy if exists "negocio_assets_insert" on storage.objects;
create policy "negocio_assets_insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'negocio-assets');

drop policy if exists "negocio_assets_update" on storage.objects;
create policy "negocio_assets_update" on storage.objects
  for update to authenticated using (bucket_id = 'negocio-assets');

-- Realtime: publicar cambios de las tablas del sync escáner↔POS↔vista cliente.
do $$
declare t text;
begin
  foreach t in array array['scan_events', 'carrito_items', 'carritos_activos'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
