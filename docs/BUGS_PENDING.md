# BUGS_PENDING — Problemas / pendientes detectados durante la migración

Lista viva de cosas detectadas que **no** se corrigen en la fase actual, para no
mezclar alcances. Cada ítem indica fase de detección y acción sugerida.

---

## UI / UX (detectado en prueba manual — 2026-06-24)

- [x] **El registro exitoso no redirige automáticamente al dashboard** _(RESUELTO 2026-06-24)_
  Tras crear la cuenta hay que ir a `/login` manualmente. La página `register` llama a
  `signInWithPassword` y luego `router.replace('/')`, pero el redirect no ocurre de forma fiable
  (timing: Next prefetchea la RSC de `/` estando deslogueado → sirve el redirect cacheado a `/login`).
  **Fix aplicado:** tras `await signInWithPassword`, se llama `router.refresh()` (invalida el Router
  Cache) antes de `router.replace('/')`. Solo `app/(auth)/register/page.tsx`.

- [x] **ProductoDialog: sin categorías no guía a crear una** _(RESUELTO 2026-06-24)_
  Cuando el negocio no tiene categorías, el `Select` de categoría queda vacío sin call-to-action.
  **Fix aplicado:** con la lista vacía el select muestra "No hay categorías — crea una primero" y
  debajo un botón "+ Nueva categoría" que abre un diálogo inline (nombre + 5 colores predefinidos).
  Al guardar usa `createCategoria` (ya existente en `src/lib/db/categorias.ts`), invalida el query
  `['categorias', negocioId]` y auto-selecciona la nueva. Solo `ProductoDialog.jsx`.

- [ ] **Navegación lenta en la primera carga de cada sección** _(prueba UI)_
  Es la **compilación bajo demanda de Next.js en `dev`** (cada ruta compila al primer acceso).
  No ocurre en `next build`/producción. **Acción:** ninguna en dev; validar tiempos en build de prod.

- [x] **Scrollbar visible en el sidebar en resoluciones menores** _(RESUELTO 2026-06-24)_
  El `nav` del sidebar (`overflow-y-auto`) muestra scrollbar aunque no haga falta.
  **Fix aplicado:** nueva utilidad `.scrollbar-hide` en `app/globals.css` (`scrollbar-width: none` +
  `::-webkit-scrollbar { display: none }`) aplicada al `<nav>` del sidebar en `app/(dashboard)/layout.tsx`.

---

## Base de datos / RLS

- [ ] **Triggers de `updated_at`** _(detectado Fase 1)_
  Varias tablas tienen `updated_at timestamptz default now()` pero **no** se
  actualiza solo en cada UPDATE. Falta una función trigger `set_updated_at()` +
  triggers `before update`. No se añade ahora para no exceder el esquema del prompt.
  **Acción:** migración `003_triggers.sql` con `set_updated_at()` aplicada a
  `negocios`, `usuarios`, `proveedores`, `productos`, `configuracion_negocio`,
  `carritos_activos`, `suscripciones`.

- [ ] **Lectura de `suscripciones` para cajeros** _(detectado Fase 1)_
  La política `dueno_suscripcion` es `for all` y exige `rol = 'dueno'`, así que un
  **cajero no puede leer** el estado de suscripción desde el cliente. El gating por
  acción (`useGatedAction`/`useSubscriptionStatus`) podría fallar para cajeros.
  **Acción:** o bien añadir una política de SELECT para miembros, o exponer el estado
  de suscripción vía una API Route server-side (decidir en Fase 4). Documentar en SECURITY.md.

- [x] **Publicación Realtime** _(RESUELTO 2026-06-24, migración 004)_
  `scan_events`, `carrito_items` y `carritos_activos` añadidas a `supabase_realtime` (BD + `004_storage_realtime.sql`).
  Nota: `Venta` aún consume scan_events por **polling** (1.5s); falta migrar a suscripción Realtime pura (ver Frontend/shell).

- [ ] **Verificación de correo en el registro** _(detectado Fase 2)_
  `/api/negocio/register` crea el usuario con `email_confirm: true` (sin verificación de email)
  para que el alta sea utilizable de inmediato. Si se requiere verificación real, migrar a
  `signUp` + confirmación. **Acción:** decisión de producto (Fase 6).

- [ ] **Rate limiting en `/api/negocio/register`** _(detectado Fase 2)_
  Endpoint público de creación de cuentas sin límite de tasa. **Acción:** añadir rate limiting
  (p.ej. Upstash/Vercel KV) antes de producción.

## Build / runtime

- [ ] **Aviso de Edge Runtime con Supabase en el middleware** _(detectado Fase 2)_
  `next build` advierte: `A Node.js API is used (process.version) … not supported in the Edge
  Runtime`, a través de `@supabase/ssr` → `supabase-js` en `middleware.ts`. Es un **warning
  conocido y benigno** del patrón oficial Supabase+middleware; el build pasa (exit 0) y funciona.
  **Acción:** monitorear; si Next habilita runtime Node para middleware de forma estable, evaluarlo.

## Frontend / shell (Fase 5)

- [x] **Cuerpos de página portados** _(Fase 5, hecho)_ — las 17 páginas migradas a `.jsx`
  sobre repositorios/hooks. Falta **verificación funcional con BD viva**.

- [ ] **Escáner: polling → Realtime puro** _(Fase 5/8)_
  `Venta` consume `scan_events` por polling (1.5s) vía `getScanEventsPendientes`. Cambiar a
  suscripción Realtime (`postgres_changes` sobre `scan_events` filtrado por `corte_id`).
  Requiere la publicación `supabase_realtime` (ver ítem de Realtime).

- [ ] **Vista Cliente cross-device** _(Fase 5/8)_
  Hoy sincroniza por `BroadcastChannel`/`localStorage` (mismo dispositivo/navegador), igual que el
  original. Para segunda pantalla en otro dispositivo: endpoint público + Realtime del carrito.

- [ ] **`createReporte` necesita `referencia_id` UUID válido** _(Fase 5)_
  En Registros, el resumen financiero usaba `referencia_id = periodo` (string como '7dias').
  `reportes_generados.referencia_id` es `uuid`; se omitió ese campo para el resumen. Revisar si
  se quiere otra columna para el identificador de periodo.

- [ ] **`@/components/common/EnMigracion.tsx`** quedó sin uso tras portar todas las páginas.
  **Acción:** eliminar en limpieza (Fase 6).

- [ ] **Tipado estricto de páginas `.jsx`** _(Fase 5)_
  Las páginas se portaron como `.jsx` (no type-checkeadas) para acelerar y evitar el choque de
  tipos de las primitivas shadcn. **Acción opcional:** convertir primitivas + páginas a TSX si se
  quiere cobertura de tipos en la UI.

- [ ] **Nombre del negocio en el layout** _(Fase 5)_
  `configuracion_negocio` no tiene `nombre_negocio` (vive en `negocios.nombre`). El sidebar
  usa el fallback 'POS MH'. **Acción:** exponer el nombre del negocio (p.ej. añadirlo a `useAuth`
  o un hook `useNegocio`) y mostrarlo.

- [ ] **Botón de cerrar sesión** _(Fase 5)_
  `signOut()` existe en `useAuth` pero aún no hay UI; irá en la página `cuenta` al portarla.

## Infra / despliegue

- [x] **Bucket de Storage `negocio-assets`** _(RESUELTO 2026-06-24, migración 004)_
  Bucket público creado + políticas en `storage.objects` (lectura pública, escritura `authenticated`).
  Pendiente menor: acotar escritura por carpeta `negocio_id/` (hoy cualquier autenticado puede escribir en el bucket).

- [x] **Registro funcional** _(RESUELTO 2026-06-24)_
  Se corrigió la llamada al RPC (`crear_negocio_inicial` → `registrar_negocio` con 4 params) y se endureció
  la función. Registro + login + flujo de venta verificados contra la BD real.

## Frontend / migración de código

- [ ] **Directivas `"use client"`** _(detectado Fase 1)_
  Los ~80 componentes shadcn/ui y la mayoría de páginas usan hooks/estado/eventos y
  necesitan `"use client"` al portarse al App Router.
  **Acción:** añadir la directiva al migrar cada archivo (Fases 3–5).

- [ ] **Páginas huérfanas `Compras.jsx` y `Gastos.jsx`** _(detectado Fase 1)_
  En el original, las rutas `/compras` y `/gastos` ya redirigen a `Egresos`. Las
  páginas `Compras.jsx`/`Gastos.jsx` quedan huérfanas (no enrutadas).
  **Acción (rule 6):** decidir en Fase 5 si se fusionan en `Egresos` o se eliminan;
  registrar la decisión en `docs/DECISIONS.md`.

- [ ] **Dependencias pesadas posiblemente sin uso** _(detectado Fase 1)_
  `three`, `react-leaflet`, `react-quill`, `moment` se conservan (regla: mantener
  todas las deps del original), pero conviene verificar su uso real en Fase 6 y, de
  no usarse, proponer su retiro (`react-quill`/`react-leaflet` además requieren
  cuidado de SSR en Next).
  **Acción:** auditar con la migración de páginas; anotar hallazgos aquí.

<!-- Última actualización: 2026-06-24 — Sesión de migración Base44 → Next.js 14 + Supabase -->
