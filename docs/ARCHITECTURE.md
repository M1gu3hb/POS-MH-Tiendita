# ARCHITECTURE — POS MH Tiendita

Diagrama de capas y flujo de datos del proyecto migrado.

## Capas

```
                         ┌─────────────────────────────────────┐
   Navegador (cliente)   │  Componentes / Páginas ("use client")│
                         │  hooks (TanStack Query)              │
                         └───────────────┬──────────┬──────────┘
                                         │          │
                         ┌───────────────▼┐        ┌▼──────────────────┐
   Capa Offline          │ Service Worker │        │ IndexedDB         │
   & PWA                 │ (Offline Cache)│        │ (Local Cache/Sync)│
                         └───────────────┬┘        └┬──────────────────┘
                                         │ llaman a…│
                         ┌───────────────▼──────────▼──────────┐
   Capa de datos         │  src/lib/db/*  (Repositorios)        │
   (única que toca DB)   │  productos.ts, configuracion.ts, …   │
                         └───────────────┬─────────────────────┘
                                         │ usan…
              ┌──────────────────────────┼──────────────────────────┐
              ▼                          ▼                          ▼
   supabase.ts (browser)     supabase-server.ts (RSC/route)   supabase-server.ts
   createBrowserClient        createServerSupabase()           createAdminClient()
   [respeta RLS]              [respeta RLS, cookies]           [SERVICE ROLE, ignora RLS]
              │                          │                          │
              └──────────────────────────┼──────────────────────────┘
                                         ▼
                         ┌─────────────────────────────────────┐
                         │   Supabase (PostgreSQL + RLS + Auth) │
                         │   Storage · Realtime                 │
                         └─────────────────────────────────────┘

   Borde de seguridad (servidor):
   ┌─────────────────────────────────────────────────────────────────┐
   │ middleware.ts → src/lib/auth/middleware.ts (updateSession)        │
   │   · refresca sesión Supabase en cada request                      │
   │   · protege rutas: sin sesión → /login (excepto rutas públicas)   │
   └─────────────────────────────────────────────────────────────────┘

   API Routes (app/api/*): Stripe (checkout/portal/webhook/status/refresh),
   storage/upload, negocio/register. Usan supabase-server / admin.
```

## Flujo de autenticación

1. `middleware.ts` corre en cada request → `updateSession()` revalida el token con
   `supabase.auth.getUser()` y redirige a `/login` si no hay sesión (salvo rutas públicas:
   `/login`, `/register`, `/vista-cliente`, retornos de Stripe, y `/api/*`).
2. En el cliente, `AuthProvider` (`src/lib/auth/AuthContext.tsx`) escucha
   `onAuthStateChange`, expone el `authUser` de Supabase y carga el perfil de negocio
   (`usuarios`: `negocio_id`, `rol`, `nombre_visible`).
3. **Registro** (`/register` → `POST /api/negocio/register`): el cliente admin crea el
   usuario de auth (confirmado) y la RPC `registrar_negocio` (SECURITY DEFINER, `EXECUTE`
   solo para `service_role`) inserta, en una transacción, `negocios` + `usuarios` (dueño) +
   `configuracion_negocio` + `suscripciones`, y devuelve `{ negocio_id, usuario_id }`.
4. **Login**: `signInWithPassword` o `signInWithMagicLink` (OTP por correo).

## Multi-tenancy

- Todo dato operativo lleva `negocio_id`. El RLS filtra por `negocio_id = get_negocio_id()`
  (función `SECURITY DEFINER` que lee `usuarios` por `auth.uid()`).
- Un dueño y sus cajeros comparten el mismo `negocio_id` → ven los mismos datos.
- Detalle del esquema y políticas: [`DATABASE.md`](./DATABASE.md).

## Estado

| Tipo de estado | Herramienta |
|----------------|-------------|
| Estado de servidor (datos) | TanStack Query v5 + repositorios `src/lib/db/*` |
| Sesión / auth | Supabase Auth + `AuthContext` + cookies (vía `@supabase/ssr`) |
| Preferencias de UI (tema, sonido) | `localStorage` (prefijo `pos-mh-`) — nunca datos de negocio |
| Realtime escáner↔POS | Supabase Realtime **activo** (`scan_events`, `carrito_items`, `carritos_activos`); `Venta` hoy lo consume por polling 1.5s, fallback `BroadcastChannel` |

## Convenciones

- Ningún componente importa el cliente de Supabase directamente: todo pasa por `src/lib/db/*`.
- Código server-only (`supabase-server.ts`, `audit.ts`) marcado con `import 'server-only'`.
- Sin `any`: tipos de dominio en `src/lib/db/types.ts`, resultados vía `.returns<T>()`.

## Estado de despliegue (2026-06-25)

- **Supabase conectado** (proyecto `lisjbutidntalmobgjso`); `.env.local` con claves reales.
- **10 migraciones aplicadas:** `001_initial_schema`, `002_rls`, `003_functions` (RPC `registrar_negocio`
  endurecida), `004_storage_realtime`, `005_rls_cajeros`, `006_top_productos`, `007_qr_url`, `008_fiado`,
  `009_devoluciones`, `010_historial_precios`. Triggers de `updated_at` verificados y activos.
- **Storage:** bucket público `negocio-assets` (+ políticas) listo para logos/imágenes.
- **Realtime:** publicación `supabase_realtime` incluye `scan_events`, `carrito_items`, `carritos_activos`.
- **Verificado contra BD real:** registro + login, el flujo de venta completo (productos → caja →
  venta efectivo → stock → cierre), historial de precios, fiados, devoluciones, e integración de QR y WhatsApp.
- **GitHub:** `M1gu3hb/POS-MH-Tiendita`, rama `main`.

Resumen de alto nivel para lectura rápida: [`../ARCHITECTURE.md`](../ARCHITECTURE.md).

<!-- Última actualización: 2026-06-25 — Limpieza Fase 6 y preparación para deploy -->
