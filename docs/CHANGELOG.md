# CHANGELOG — Migración Base44 → Next.js + Supabase

Formato: cada entrada con fecha y los cambios significativos de la fase.

---

## 2026-06-25 — Features colaboradores (reportes #013–#015) — auditado

Tres features. `tsc`/`next build` en verde; sin Supabase directo en componentes (verificado).
**Migraciones: todas aplicadas** — ledger 001–010 confirmado vía `list_migrations` (repo == BD).
Cada agente auditó su propio reporte previo (013→010, 014→011, 015→012).

- **#013 (claude-code) — Sistema de fiado / crédito a clientes.** Migración `008_fiado.sql`
  (**aplicada y verificada**): tablas `clientes_fiado` y `movimientos_fiado`, RLS por negocio, trigger
  `updated_at`, y `ventas_metodo_pago_check` ampliado con `'fiado'`. Repo `src/lib/db/fiado.ts` +
  hook `useFiado.js`. Página `/fiado` (tabs Clientes/Resumen, alta, historial, abonos; Resumen solo
  rol dueño) + link en el sidebar. En el POS, botón "Cobrar a fiado" → crea venta con
  `metodo_pago='fiado'`, descuenta stock/kardex y registra el cargo; el ticket muestra
  "Fiado - <cliente>". **PASO 0:** corrigió el nombre del negocio en el ticket de WhatsApp (parámetro
  `negocioNombre` vía `useNegocio`) — verificado.
- **#014 (codex) — Devoluciones simples.** Migración `009_devoluciones.sql` (tablas `devoluciones` y
  `detalle_devoluciones` + RLS). Repo `src/lib/db/devoluciones.ts` + endpoint `POST /api/devoluciones`
  (valida sesión/negocio, venta `pagada`, repone stock + `movimientos_inventario` tipo `devolucion`,
  escribe `audit_log`). Botón "Devolver" en Registros (solo ventas pagadas) + Dialog de selección de
  productos/cantidades/motivo/regreso a inventario. La migración `009` quedó sin aplicar por el #014 y
  **la aplicó el #015** (ver nota).
- **#015 (antigravity) — Historial de precios.** Migración `010_historial_precios.sql` (**aplicada**):
  tabla `historial_precios` + RLS + trigger `productos_precio_changed` que registra cambios de
  `precio_venta`/`costo_unitario`. `getHistorialPrecios(productoId, negocioId)` (últimos 20) en
  `productos.ts`. Sección colapsable "Historial de precios" en `ProductoDialog` (modo edición), tabla
  con precios/costos anterior↔nuevo, o "Sin cambios de precio registrados".

> Nota de auditoría: el #015 aplicó la migración `009` (de #014) a la BD real, fuera de su tarea, para
> evitar runtime roto — hay discrepancia sobre el acceso `psql` (el #014 reportó no tener credenciales).
> Verificación a nivel build + introspección de BD; falta runtime (fiado, devoluciones, historial).

---

## 2026-06-25 — Features colaboradores (reportes #010–#012) — auditado

Tres tareas de feature concurrentes. `tsc`/`next build` en verde; sin Supabase directo en componentes
(verificado). Cada agente auditó su propio reporte previo (010→007, 011→008, 012→009) sin hallazgos.

- **#010 (claude-code) — Compartir ticket por WhatsApp.** Nuevo `src/utils/whatsapp.ts` con
  `generarMensajeTicket(venta, items, config)` (función pura, texto plano con emojis 🛒📋💰: negocio,
  folio, fecha, productos, total, método de pago, cambio, agradecimiento). En `venta/page.jsx`, botón
  "WhatsApp" junto a "Imprimir" dentro del modal de ticket (solo tras venta completada); abre
  `wa.me/?text=...`. `TicketVenta.jsx` no se modificó (ya exponía los props necesarios).
- **#011 (codex) — QR del negocio en configuración y ticket.** `configuracion/page.jsx`: sección
  "Código QR del negocio" con campo URL + generación frontend (`QRCode.toDataURL()`, 150×150).
  `TicketVenta.jsx`: renderiza QR 80×80 al final del ticket si existe `config.qr_url`. Soporte de
  `qr_url` en `src/lib/db/configuracion.ts`. Deps `qrcode`/`@types/qrcode`. Migración
  `007_qr_url.sql` creada **pero NO aplicada a la BD** → feature no funcional hasta aplicarla
  (ver `BUGS_PENDING.md`).
- **#012 (antigravity) — Corte rápido del día + recordatorio a proveedor.** `getResumenHoy(negocioId)`
  en `ventas.ts` (ventas `pagada` desde medianoche). Dashboard: botón "📊 Resumen de hoy" (solo rol
  `dueno`) → Dialog con total, nº tickets, utilidad bruta y desglose de pagos.
  `getProductosStockBajo(negocioId)` en `productos.ts` (left join a `proveedores`); banner expandible
  arriba de las StatCards cuando un proveedor tiene ≥ 3 productos en stock bajo.

> Nota de auditoría: `007_qr_url` sin aplicar (repo ≠ BD); el ticket de WhatsApp muestra 'Mi Tienda'
> (no el nombre real). `TicketVenta.jsx` estuvo asignado a #010 y #011 a la vez (conflicto evitado solo
> porque #010 no lo editó). Verificación a nivel build; falta runtime (QR, WhatsApp, resumen del día).

---

## 2026-06-24 — Features colaboradores (reportes #007–#009) — auditado

Tres tareas de feature de agentes concurrentes. Build final en verde (`tsc`/`next build` exit 0);
sin Supabase directo en componentes (verificado). Detalle de pendientes en `docs/BUGS_PENDING.md`.

- **#007 (claude-code) — Escáner móvil a Realtime puro.** Se reemplazó el polling de 1.5s del POS
  (`venta/page.jsx`) por suscripción Realtime: nuevo helper `subscribeScanEvents(corteId, onInsert)`
  en `src/lib/db/scan.ts` (canal `postgres_changes` INSERT filtrado por `corte_id`), con catch-up
  inicial una sola vez, dedup síncrono y cleanup del canal. `carrito_items` Realtime ya lo cubría
  `useCarritoActivo`. `package.json`: nuevo script `dev:stable` = `next dev --turbo` (`dev` intacto).
  **Reparó** el import roto que dejó el commit `cf9d03c` (ver #009).
- **#008 (codex) — Imagen de producto + alerta de stock bajo.** `ProductoDialog` ahora sube imagen
  con dos opciones (galería y cámara), valida JPG/PNG/WebP ≤ 2 MB y muestra thumbnail 80×80 con botón
  de limpiar. `app/api/storage/upload/route.ts`: soporta `folder=productos`
  (`<negocio_id>/productos/<timestamp>.<ext>`) **con validación server-side de MIME y tamaño**
  (rechaza no-imagen con 415; verificado E2E con tenant temporal). Tras venta exitosa, `toast.warning`
  por cada producto que queda en/bajo `stock_minimo`.
- **#009 (antigravity) — Top 5 productos + mayoreo automático.** Dashboard (`page.jsx`) muestra "Más
  vendidos esta semana" vía `getTopProductos(negocioId, limite)` en `ventas.ts` (agregación en memoria
  por límite de PostgREST). POS aplica precio de mayoreo automático cuando `config.activar_mayoreo`,
  `cantidad >= cantidad_minima_mayoreo`; vuelve a precio normal al bajar la cantidad, con badge
  "MAYOREO" en `CarritoVenta.jsx` y `MobileCartBar.jsx`. Cambios en `carrito.ts`/`useCarritoActivo.ts`
  para propagar `precio_unitario`/`es_mayoreo` por la capa de datos.

> Nota de auditoría: el commit `cf9d03c` (#009) rompió temporalmente el build del remoto (import de
> `subscribeScanEvents` sin el helper); #007 lo reparó. Verificación de #007–#009 a nivel build; falta
> prueba runtime (Realtime con 2 dispositivos, badge de mayoreo con datos reales).

---

## 2026-06-24 — fix-bugs-ui (reporte colaborador #001, claude-code) — auditado

Commit `ec760d4` "fix: registro auto-redirect + categorías vacías + scrollbar sidebar" (5 archivos).
Tres bugs de UI corregidos (detalle y estado en `docs/BUGS_PENDING.md`):

1. **Registro no auto-redirige** · `app/(auth)/register/page.tsx`: tras `await signInWithPassword`
   se añadió `router.refresh()` (invalida el Router Cache de Next) antes de `router.replace('/')`.
   Nota: la causa real fue el Router Cache, no el sign-in (ya presente); se desvió de la consigna
   original —que pedía añadir el `signInWithPassword`— pero el fix es correcto y está justificado.
2. **ProductoDialog sin categorías** · `src/components/productos/ProductoDialog.jsx`: con la lista
   vacía el select muestra aviso + botón "+ Nueva categoría" → diálogo inline (nombre + 5 colores),
   usa `createCategoria` (ya existente), invalida `['categorias', negocioId]` y auto-selecciona.
3. **Scrollbar del sidebar** · `app/globals.css` (utilidad `.scrollbar-hide`) + `app/(dashboard)/layout.tsx`
   (clase aplicada al `<nav>`).

**Auditoría:** los 3 cambios verificados en el código; coinciden con lo reportado. La clave de
invalidación `['categorias', negocioId]` coincide con la del padre (`productos/page.jsx`). Sin
cambios fuera de `docs/`, `app/` y `src/components`. **Pendiente:** verificación solo a nivel de
build/`tsc` (exit 0); **no** hubo prueba runtime en navegador contra la BD real — recomendado antes
de cerrar definitivamente. Sin bugs nuevos detectados.

---

## 2026-06-24 — Cierre de sesión: BD real conectada, fix de registro, hardening y prueba de venta

### Infra / Git
- `git init` + primer push a GitHub (`M1gu3hb/POS-MH-Tiendita`). 3 commits en `main`:
  `49092a1` migración · `868650d` fix RPC · `c179368` hardening + bucket + realtime + prueba.
- **`.env.local`** creado con las claves reales de Supabase (gitignored, nunca commiteado).
- **`npm run dev` verificado:** arranca (Ready ~15s), carga `.env.local`, sin errores; solo 2
  warnings benignos de caché de webpack. `/login` 200, `/` → 307 a `/login`, `/api/stripe/status` 401.

### Fix de registro (RPC) — daba 500
- La ruta llamaba a `crear_negocio_inicial`, pero la BD tiene
  `registrar_negocio(p_auth_user_id, p_nombre_negocio, p_nombre_visible, p_email)` (returns `json`).
- Corregido `app/api/negocio/register/route.ts`: llama a `registrar_negocio` con los 4 parámetros y
  lee `{ negocio_id, usuario_id }`. `003_functions.sql` alineado al nombre/firma reales (repo == BD).

### Seguridad — hardening del RPC (BD + `003_functions.sql`)
- `registrar_negocio`: `set search_path = public` + `revoke execute from anon, authenticated, public`
  + `grant execute to service_role`. Antes era `SECURITY DEFINER` ejecutable por `anon` (riesgo:
  crear negocios/usuarios con la anon key saltándose la API route). El route sigue funcionando (service role).

### Storage + Realtime (BD + nueva migración `004_storage_realtime.sql`)
- Bucket público **`negocio-assets`** + 3 políticas en `storage.objects` (lectura pública, escritura
  `authenticated`) — habilita la subida de logo.
- **Realtime activado**: `scan_events`, `carrito_items`, `carritos_activos` añadidas a `supabase_realtime`.

### Verificación funcional contra la BD real
- **Registro end-to-end:** crea negocio + usuario (dueño) + config + suscripción; login con JWT OK.
- **Flujo de venta completo** (como usuario autenticado, bajo RLS real): 2 productos → abrir caja →
  venta efectivo $90 → detalle (2 renglones) → stock 10→8 y 5→4 + kardex → cerrar caja (diferencia $0).
  **Todos los pasos ✓.** Datos de prueba eliminados al terminar.
- **Migraciones aplicadas en Supabase: 001, 002, 003, 004.** Triggers de `updated_at` creados.

### Bugs de UI detectados (ver `docs/BUGS_PENDING.md`)
- Registro no auto-redirige al dashboard · ProductoDialog sin categorías no guía a crear una ·
  navegación lenta en primera carga (Next dev) · scrollbar del sidebar visible en resoluciones menores.

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

<!-- Última actualización: 2026-06-24 — Sesión de migración Base44 → Next.js 14 + Supabase -->
