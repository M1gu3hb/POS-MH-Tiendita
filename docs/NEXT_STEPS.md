# NEXT_STEPS — Qué sigue en la migración

Estado: **Fases 1–4 completas** (fundamentos, auth, capa de datos + hooks, API routes).
**Fase 5** con el shell de la app listo y navegable; faltan los cuerpos de página.
**Fase 6** pendiente. Verificado con `npm install` + `tsc` + `next build` (todo exit 0; 26 rutas).

## Inmediato para poder usar la app en local

1. Crear un proyecto en Supabase y copiar `.env.example` → `.env.local` con sus claves.
2. Ejecutar en orden las migraciones de `supabase/migrations/` (`001`, `002`, `003`).
3. `npm run dev` → registrar un negocio en `/register` → iniciar sesión en `/login`.

## Fase 3 — Capa de datos ✅ (completa)
- [x] Repositorios: productos, configuracion, usuarios, caja, ventas, carrito (relacional),
      inventario, egresos, reportes, suscripcion, categorias, proveedores, scan, audit.
- [x] Hooks migrados off Base44 (useConfig, useCajaAbierta, useStripeConfig,
      useSubscriptionStatus, useProductoLookup, useUserScopedStorage, useCarritoActivo, useTheme).
- [ ] Pendiente menor: garantía transaccional estricta para `createVenta`/`createCompra` vía RPC
      (hoy insertan cabecera + detalle en 2 pasos). Ver BUGS_PENDING.

## Fase 4 — API Routes ✅ (completa)
- [x] `app/api/stripe/{status,checkout,portal,refresh,webhook}` + `app/api/storage/upload`.
- [x] Webhook valida firma siempre.
- [ ] Pendiente: endpoints server-side para `cancelar venta` y `ajustar inventario` que
      escriban en `audit_log` (se construyen junto con las páginas Registros/Inventario).

## Fase 5 — Páginas y componentes (en progreso)
- [x] `src/components/ui/*` (49) + `common/*` con `"use client"`; `Button` en TSX.
- [x] `app/(dashboard)/layout.tsx` + nav (`MobileQuickNav`, `ThemeToggle`); rutas navegables.
- [ ] **Portar los cuerpos de página** (hoy marcadores `EnMigracion`), recomendado como `.jsx`:
      Dashboard, Venta, Productos, Inventario, Egresos, Caja, Registros, Configuracion, Cuenta,
      Escaner, VistaCliente, Suscripcion(activar/success/cancel). Patrón: `base44.entities.X` →
      repo de `src/lib/db/`, `useAuth().negocioId`, `react-router` → `next/navigation`/`next/link`.
- [ ] Portar los componentes de feature (venta/, caja/, egresos/, productos/, registros/, etc.).
- [ ] **rule 6:** decidir destino de `Compras.jsx`/`Gastos.jsx` (fusionar en Egresos o eliminar) y registrarlo.

## Fase 6 — Realtime, limpieza y cierre
- [ ] Realtime escáner↔POS (`scan_events`) + fallback `BroadcastChannel`; publicación `supabase_realtime`.
- [ ] `003_triggers.sql` para `updated_at` (ver BUGS_PENDING).
- [ ] Verificar/retirar deps sin uso (`three`, `react-leaflet`, `react-quill`, `moment`).
- [ ] Eliminar toda referencia a `@base44/sdk`; confirmar cero imports de Base44.
- [ ] Preparar Vercel (no desplegar): variables de entorno + build.

## Definición de "migración completa" (sección 14 del prompt)
- [x] Estructura Next.js + `npm install`/`tsc`/`next build` en verde (24 rutas)
- [x] Login / registro con Supabase Auth
- [x] Cero imports de `@base44/sdk` en el código migrado (la fuente Base44 queda solo en `extracted/`)
- [x] Capa de datos + RLS multi-tenant lista (dueño y cajero comparten `negocio_id`)
- [x] UI completa: las 17 páginas migradas sobre repositorios/hooks
- [x] Venta completa implementada (buscar → cobrar → ticket) — requiere verificación con BD viva
- [x] Escáner móvil → scan_events → POS (polling 1.5s; falta cambiar a Realtime puro)
- [x] Vista cliente muestra el carrito en vivo (BroadcastChannel/localStorage mismo dispositivo)
- [x] Corte de caja abre y cierra (página Caja + diálogos)
- [x] MDs de la sección 11 creados y actualizados
- [x] `.env.example` con todas las variables

> **Migración de código completa.** Todo el código está libre de Base44 y compila/typechquea.
> Falta **verificación funcional contra una BD Supabase viva** (aplicar migraciones, crear bucket
> `negocio-assets`, configurar Stripe) y el cierre de Fase 6 (Realtime publication para
> scan_events/carrito_items, triggers `updated_at`, auditoría server-side de cancelaciones,
> retiro de deps sin uso, prep Vercel). Ver `docs/BUGS_PENDING.md`.
