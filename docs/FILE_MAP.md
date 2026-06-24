# FILE_MAP — Árbol real del proyecto

Estado al 2026-06-24. Refleja los archivos que existen ahora. `extracted/` (fuente Base44/Vite
original) y `node_modules/` quedan fuera del build y de git.

```
pos-mh-tiendita/
├── PROJECT_CONTEXT.md          Qué es, stack, estado
├── ARCHITECTURE.md             Resumen de alto nivel (<2 min)
├── README.md                   Setup local (env, migraciones, scripts)
├── SECURITY.md                 Controles de seguridad
├── package.json / package-lock.json   Deps (Next + Supabase + Stripe; sin Base44/Vite)
├── next.config.mjs             Config Next (images: hosts Supabase)
├── tsconfig.json               TS estricto, alias @/* → ./src/*, excluye extracted
├── tailwind.config.ts · postcss.config.js · components.json · .eslintrc.json
├── .env.example                Plantilla de variables  (·  .env.local real, gitignored)
├── next-env.d.ts · .gitignore
├── middleware.ts               Borde de seguridad raíz → updateSession
│
├── app/                        NEXT.JS APP ROUTER
│   ├── layout.tsx              Layout raíz (monta <Providers>)
│   ├── globals.css             Tokens HSL + clases skeuomórficas (.skeu-*)
│   ├── not-found.tsx           404
│   ├── (auth)/                 layout.tsx · login/page.tsx · register/page.tsx
│   ├── (dashboard)/            layout.tsx (sidebar/nav) + páginas .jsx:
│   │     page.jsx (Dashboard) · venta · escaner · caja · productos · inventario ·
│   │     egresos · registros · configuracion · cuenta · suscripcion
│   ├── vista-cliente/page.jsx  Pantalla cliente (pública)
│   ├── suscripcion/            activar · success · cancel  (públicas, retornos Stripe)
│   └── api/
│         negocio/register/route.ts     Alta: admin createUser + RPC registrar_negocio
│         storage/upload/route.ts       Subida a bucket negocio-assets
│         stripe/{status,checkout,portal,refresh,webhook}/route.ts
│
├── src/
│   ├── lib/
│   │   ├── auth/      AuthContext.tsx · useAuth.ts · middleware.ts (updateSession) · server.ts (ctx server-side)
│   │   ├── db/        CAPA DE DATOS (única que toca Supabase):
│   │   │     supabase.ts (browser) · supabase-server.ts (server + admin, server-only) ·
│   │   │     types.ts (tipos de las 20 tablas + enums) ·
│   │   │     usuarios · productos · configuracion · caja · ventas · carrito · inventario ·
│   │   │     egresos · reportes · suscripcion · categorias · proveedores · scan · audit (.ts)
│   │   ├── stripe/server.ts   Cliente Stripe (server-only)
│   │   ├── productLookup.ts · query-client.ts
│   │   ├── utils.js (cn) · downloadHtmlReport.js · downloadPdfReport.js
│   ├── hooks/        useConfig · useCajaAbierta · useCarritoActivo (relacional+Realtime) ·
│   │                 useProductoLookup · useStripeConfig · useSubscriptionStatus ·
│   │                 useUserScopedStorage · useTheme (wrapper next-themes) (.ts) ·
│   │                 use-mobile · useAudioReady · useGatedAction · useIsTabletOrMobile ·
│   │                 useSoundEnabled · useSubscriptionGateStore (.js/.jsx)
│   ├── components/
│   │   ├── ui/            49 primitivas shadcn (.jsx; Button.tsx tipado) — "use client"
│   │   ├── providers/    Providers.tsx (Theme + Query + Auth + Toaster)
│   │   ├── layout/       MobileQuickNav.jsx · ThemeToggle.tsx
│   │   ├── barcode/      BarcodeScanner · ScanFeedbackOverlay · ScannerMiniCart
│   │   ├── venta/        BuscadorProducto · CarritoVenta · CobroDialog · MobileCartBar ·
│   │   │                 ProductoNoEncontradoDialog · ScanBarcodeInput · TicketVenta · AsignarCodigoDialog
│   │   ├── caja/         AbrirCajaDialog · CierreCajaDialog · TicketViewerDialog
│   │   ├── productos/    ProductoDialog
│   │   ├── egresos/      NuevaCompraDialog · NuevoGastoDialog · ProveedoresTab
│   │   ├── registros/    CortePDF · ResumenFinancieroPDF · PDFStyles
│   │   ├── dashboard/    StatCard · SuscripcionAviso
│   │   ├── configuracion/ BaseDatosTab
│   │   ├── cuenta/       SuscripcionCard
│   │   └── common/       LoadingState · EmptyState · InlineSyncIndicator · ChartTooltip ·
│   │                     ActivarSonidoButton · EnMigracion.tsx (SIN USO — eliminar en Fase 6)
│   └── utils/        audioFeedback · barcodeUtils · currency · dateUtils · deviceId ·
│                     exportData · folioUtils · legalConfig (.js) · index.ts (createPageUrl)
│
├── supabase/migrations/
│   ├── 001_initial_schema.sql   20 tablas, índices, extensiones (uuid-ossp, pg_trgm)
│   ├── 002_rls.sql              RLS + helpers SECURITY DEFINER + políticas por negocio
│   ├── 003_functions.sql        RPC registrar_negocio (alta tenant, SECURITY DEFINER endurecida)
│   └── 004_storage_realtime.sql Bucket negocio-assets + políticas + publicación Realtime
│
└── docs/   ARCHITECTURE · DATABASE · FILE_MAP · DECISIONS · BUGS_PENDING · CHANGELOG · NEXT_STEPS
```

## Notas
- **Páginas** = `.jsx` (no type-checkeadas); **capa de datos / auth / API** = `.ts(x)` tipado.
- Toda lectura/escritura a Supabase pasa por `src/lib/db/*`. Server-only marcado con `import 'server-only'`.
- `EnMigracion.tsx` quedó sin uso tras portar todas las páginas (pendiente de borrar).

<!-- Última actualización: 2026-06-24 — Sesión de migración Base44 → Next.js 14 + Supabase -->
