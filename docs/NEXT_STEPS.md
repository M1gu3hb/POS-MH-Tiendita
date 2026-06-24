# NEXT_STEPS — Estado actual y qué sigue

## Estado actual (2026-06-24)

🟢 **Migración de código completa y verificada contra la BD real.**

- **Stack:** Next.js 14 (App Router) + Supabase + TypeScript. Cero `@base44/sdk` / `react-router`.
- **Build:** `tsc --noEmit` ✓ · `next build` ✓ · `npm run dev` ✓ (arranca y sirve).
- **BD conectada:** proyecto Supabase `lisjbutidntalmobgjso`. `.env.local` con claves reales (gitignored).
- **Migraciones aplicadas:** `001_initial_schema`, `002_rls`, `003_functions` (RPC `registrar_negocio`,
  endurecida), `004_storage_realtime`. Triggers de `updated_at` creados. Repo == BD.
- **Realtime activo:** `scan_events`, `carrito_items`, `carritos_activos`.
- **Storage:** bucket público `negocio-assets` + políticas.
- **GitHub:** `M1gu3hb/POS-MH-Tiendita`, rama `main`, 3 commits.
- **Verificado funcionalmente (contra BD real):**
  - Registro end-to-end (negocio + dueño + config + suscripción) + login.
  - **Flujo de venta completo**: productos → abrir caja → venta efectivo → descuento de stock + kardex → cerrar caja.

Las 17 páginas y ~30 componentes de feature están portados sobre los repositorios (`src/lib/db/*`) y hooks.

## Qué sigue

### A. Pulir UX (bugs detectados en prueba — ver `docs/BUGS_PENDING.md`)
1. Registro no auto-redirige al dashboard (esperar confirmación de sesión antes de navegar).
2. ProductoDialog sin categorías: ofrecer crear una (estado vacío con CTA / inline).
3. Navegación lenta en 1ª carga: es `next dev` (compila bajo demanda); validar en build de prod.
4. Scrollbar del sidebar visible en resoluciones menores: ajustar estilos.

### B. Probar el resto de los flujos contra la BD real
- Venta con **tarjeta / transferencia / mixto** (no solo efectivo).
- **Compra de mercancía** (sube stock + kardex) y **gastos operativos**.
- **Escáner → POS** en vivo (Realtime ya activo) y **Vista Cliente** (hoy mismo dispositivo).
- **Reportes/PDF** (corte de caja y resumen financiero) y **subida de logo** (bucket listo).
- Verificación de **UI en navegador** del flujo de venta (lo probado fue la capa de datos/RLS).

### C. Endurecer / completar
- Escáner: migrar de **polling** a **suscripción Realtime** pura sobre `scan_events`.
- **Auditoría server-side**: endpoints para cancelar venta / ajustar inventario que escriban `audit_log`.
- Acotar escritura del bucket por carpeta `negocio_id/`.
- Vista Cliente **cross-device** (endpoint público + Realtime del carrito).
- Lectura de `suscripciones` para cajeros (hoy RLS solo dueño).

### D. Stripe (cuando se active el cobro)
- Rellenar `STRIPE_*` + `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` en `.env.local`.
- Probar checkout / portal / webhook (el webhook valida firma).

### E. Limpieza Fase 6 (cuando se indique)
- Eliminar `src/components/common/EnMigracion.tsx` (sin uso).
- Auditar/retirar deps sin uso (`three`, `react-leaflet`, `react-quill`, `moment`).
- (Opcional) tipar páginas `.jsx` → `.tsx` + primitivas shadcn.
- Preparar deploy en **Vercel** (variables de entorno + build).

## Definición de "migración completa" (sección 14 del prompt) — estado
- [x] Estructura Next.js + `npm install`/`tsc`/`next build`/`npm run dev` en verde
- [x] Login / registro con Supabase Auth (verificado contra BD real)
- [x] Cero imports de `@base44/sdk` en el código migrado
- [x] Multi-tenant + RLS (dueño y cajero comparten `negocio_id`)
- [x] Venta completa (buscar → cobrar → ticket) — **verificada a nivel de datos/RLS**
- [x] Corte de caja abre y cierra
- [~] Escáner móvil → carrito en vivo: funciona por polling; falta Realtime puro + prueba UI
- [~] Vista cliente en vivo: mismo dispositivo (BroadcastChannel); falta cross-device
- [x] MDs creados y actualizados · `.env.example` completo

> Leyenda: [x] hecho · [~] funcional con pendiente menor · [ ] pendiente.

<!-- Última actualización: 2026-06-24 — Sesión de migración Base44 → Next.js 14 + Supabase -->
