# CHANGELOG — Migración Base44 → Next.js + Supabase

Formato: cada entrada con fecha y los cambios significativos de la fase.

---

## 2026-06-24 — Fase 5 completa: todas las páginas migradas

Todas las páginas se portaron 1:1 a `.jsx` sobre los repositorios/hooks (sin Base44,
sin react-router). Build verde: **24 rutas** (17 páginas + 7 API), `tsc` y `next build` exit 0.

- **Páginas migradas:** Dashboard, Productos, Inventario, Egresos, Caja, Registros, Cuenta,
  Configuración, Venta, Escáner, VistaCliente, Suscripción y los retornos de Stripe
  (activar/success/cancel), login, register, not-found.
- **Componentes de feature portados:** productos/ProductoDialog; caja/{AbrirCaja,CierreCaja,
  TicketViewer}Dialog; dashboard/{StatCard,SuscripcionAviso}; egresos/{NuevaCompra,NuevoGasto}Dialog
  + ProveedoresTab; configuracion/BaseDatosTab; cuenta/SuscripcionCard; venta/* (8) ; barcode/* (3);
  registros PDF (CortePDF, ResumenFinancieroPDF, PDFStyles); layout/{ThemeToggle,MobileQuickNav}.
- **Adaptaciones de esquema:** `categoria_nombre`/`proveedor_nombre` → `categoria_id`/`proveedor_id`;
  `items_json` (carrito) → `CarritoItem` relacional con una vista de mapeo en Venta;
  `datos_snapshot_json` (string) → `datos_snapshot` (JSONB); `caja_id` → `corte_id`;
  `fecha_generacion` → `created_at`. Subida de logo vía `/api/storage/upload`.
- **Flujos de negocio sobre repos:** cobro (createVenta + ajustarStock + cierre de carrito),
  cierre de caja (cerrarCaja + createReporte), compra (createCompra + ajustarStock),
  ajuste de inventario (ajustarStock), escáner→POS (scan_events + polling), Vista Cliente
  (BroadcastChannel/localStorage para mismo dispositivo).
- **Fix:** se reemplazó el sentinel de `Select` vacío por `__none__`/`__new__`; `Button` migrado a TSX
  tipado para consumo desde el layout.

---

## 2026-06-24 — Fases 3–5: Capa de datos completa, API routes, y shell de la app

### Fase 3 — Capa de datos (completa)
- Repositorios nuevos en `src/lib/db/`: `caja`, `ventas`, `carrito` (relacional),
  `inventario`, `egresos`, `reportes`, `suscripcion`, `categorias`, `proveedores`, `scan`.
- Hooks migrados off Base44 (`src/hooks/`): `useConfig`, `useCajaAbierta`, `useStripeConfig`
  (→ `/api/stripe/status`), `useSubscriptionStatus`, `useProductoLookup`, `useUserScopedStorage`
  (Supabase `authUser.email`), y `useCarritoActivo` **reescrito** a `carrito_items` + Supabase
  Realtime (sin `items_json` ni polling). `useTheme` → wrapper de next-themes. `lib/productLookup` migrado.
- Utils y hooks framework-agnósticos copiados a `src/`.

### Fase 4 — API Routes (completa)
- `app/api/stripe/{status,checkout,portal,refresh,webhook}` portadas desde las Deno functions
  (`created_by`→`negocio_id`, `asServiceRole`→`createAdminClient`, sin `email_cliente`,
  `APP_BASE_URL`→`NEXT_PUBLIC_APP_URL`). El **webhook valida firma** siempre.
- `app/api/storage/upload` (Supabase Storage, bucket `negocio-assets`) reemplaza `Core.UploadFile`.
- Helpers: `src/lib/stripe/server.ts`, `src/lib/auth/server.ts` (contexto server-side).

### Fase 5 — Shell y componentes (en progreso)
- 49 primitivas shadcn/ui + 5 componentes `common/` copiados con `"use client"`.
  `Button` convertido a TSX tipado (se consume desde TSX).
- `app/(dashboard)/layout.tsx`: AppLayout portado a App Router (next/link, usePathname, children).
  Nav: `MobileQuickNav` (next/navigation), `ThemeToggle`.
- Rutas creadas y navegables: dashboard (`/`, venta, escaner, caja, productos, inventario, egresos,
  registros, configuracion, cuenta, suscripcion), `vista-cliente`, `suscripcion/{activar,success,cancel}`,
  `not-found`. Los **cuerpos** de página son marcadores `EnMigracion` salvo el shell; su port 1:1
  sobre los repositorios es el trabajo restante (ver NEXT_STEPS).

### Fixes
- **Bug SSR real:** `src/lib/utils.js` evaluaba `window.self !== window.top` en scope de módulo →
  rompía el prerender de toda página que importa `cn`. Ahora guardado con `typeof window`.

### Verificación
- `tsc --noEmit` ✓ · `next build` ✓ (exit 0) — **26 rutas** compilan y prerenderizan; 7 API routes
  dinámicas + middleware. Login/registro funcionales; shell navegable.

---

## 2026-06-24 — Fase 2: Auth + base de la Fase 3 (capa de datos)

- **Clientes Supabase** (`src/lib/db/`): `supabase.ts` (browser, `createBrowserClient`),
  `supabase-server.ts` (`createServerSupabase` por cookies + `createAdminClient` service role,
  `server-only`).
- **Auth** (`src/lib/auth/`): `AuthContext.tsx` (Supabase Auth: sesión + perfil de `usuarios`,
  `signInWithPassword`/`signInWithMagicLink`/`signOut`), `useAuth.ts`, `middleware.ts`
  (`updateSession` — refresca sesión y protege rutas en el servidor).
- **`middleware.ts`** (raíz) con matcher que excluye assets.
- **Páginas de auth**: `app/(auth)/login` y `app/(auth)/register` (estilo skeuomórfico, sin
  depender de componentes UI aún sin migrar) + `app/(auth)/layout.tsx`.
- **Registro funcional**: `app/api/negocio/register/route.ts` (admin `createUser` + RPC) y
  `supabase/migrations/003_functions.sql` (`crear_negocio_inicial`, transaccional, SECURITY DEFINER).
- **Providers** (`src/components/providers/Providers.tsx`): ThemeProvider + QueryClient + AuthProvider
  + Toaster (sonner), montados en `app/layout.tsx`. `query-client.ts` portado.
- **Capa de datos (patrón establecido)**: `types.ts` (tipos de dominio de las 20 tablas + enums),
  y repositorios `usuarios.ts`, `productos.ts`, `configuracion.ts` (cliente) y `audit.ts` (server-only).
- **Verificación:** `npm install` ✓ (672 paquetes, exit 0), `tsc --noEmit` ✓ (exit 0),
  `next build` ✓ (exit 0) — `/login`, `/register`, `/api/negocio/register` y middleware compilan.
- **Docs:** `ARCHITECTURE.md` (raíz, resumen), `docs/ARCHITECTURE.md` (capas), `SECURITY.md`,
  `docs/FILE_MAP.md`, `docs/NEXT_STEPS.md`; decisiones y pendientes actualizados.

### Decisiones notables (detalle en `docs/DECISIONS.md`)
- Registro vía admin `createUser` + RPC transaccional `crear_negocio_inicial` (auto-confirma correo).
- Toaster de `sonner` en los Providers.

---

## 2026-06-24 — Fase 1: Fundamentos

- Estructura base de **Next.js 14 (App Router)** creada en la raíz del repo; fuente
  original Base44/Vite conservada en `extracted/` (solo referencia).
- **`package.json`** migrado: se quitan `@base44/sdk`, `@base44/vite-plugin`, `vite`,
  `@vitejs/plugin-react` y `react-router-dom`; se añaden `next`, `@supabase/supabase-js`,
  `@supabase/ssr`, `stripe` (server) y `eslint-config-next`. Se conservan el resto de
  dependencias del original.
- Configs Next: `next.config.mjs`, `tsconfig.json` (alias `@/* → ./src/*`, `extracted`
  excluido), `tailwind.config.ts` (portado 1:1, content → `app/`+`src/`),
  `postcss.config.js`, `.eslintrc.json`, `components.json`, `.gitignore`, `next-env.d.ts`.
- **Estética preservada:** `app/globals.css` porta verbatim los tokens HSL y las clases
  skeuomórficas (`.skeu-*`) del `src/index.css` original. `app/layout.tsx` raíz mínimo.
- **`.env.example`** con todas las variables (Supabase, Stripe, App).
- **Base de datos:** `supabase/migrations/001_initial_schema.sql` (20 tablas, índices,
  `uuid-ossp` + `pg_trgm`) y `002_rls.sql` (RLS en todas las tablas, helpers
  `get_negocio_id()`/`get_user_rol()` como `SECURITY DEFINER`, políticas por negocio).
- **Docs creadas:** `PROJECT_CONTEXT.md`, `README.md`, `docs/DATABASE.md`,
  `docs/DECISIONS.md`, `docs/BUGS_PENDING.md`, este `CHANGELOG.md`.

### Decisiones notables (detalle en `docs/DECISIONS.md`)
- `next.config.mjs` (no `.ts`) por compatibilidad con Next 14.
- Helpers RLS `SECURITY DEFINER` para evitar recursión en políticas de `usuarios`.
- `audit_log` de solo lectura para clientes; escrituras solo con service role.
- `react-router-dom` retirado; ruteo vía App Router (`next/navigation`).
