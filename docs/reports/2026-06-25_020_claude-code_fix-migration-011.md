# Reporte 020 — claude-code — fix: migration 011 faltante en el repo

## Tarea recibida

Agregar archivo SQL de migration 011 al repo para que repo == BD.

## Lo que hice

Copié `011_rpc_crear_venta_completa.sql` a `supabase/migrations/`. El archivo contiene la definición del RPC `crear_venta_completa` (SECURITY DEFINER, `REVOKE` a anon/authenticated/public + `GRANT` a service_role), idéntico al que ya está aplicado en la BD. **No se aplicó ninguna migration** (ya estaba en la BD); solo se agregó el archivo al repo. Commit + push: "fix: agregar migration 011 faltante al repo — repo == BD restaurado" (commit `0afe289`, push tras `git pull --rebase` por actividad concurrente en `main`).

## Lo que NO toqué

Ningún otro archivo.

## Estado final

Repo tiene migrations 001–011 (`001_initial_schema`, `002_rls`, `003_functions`, `004_storage_realtime`, `005_storage_policy`, `006_rls_cajeros`, `007_qr_url`, `008_fiado`, `009_devoluciones`, `010_historial_precios`, `011_rpc_crear_venta_completa`), coincide con el ledger de la BD.

## Número de reporte: 020
