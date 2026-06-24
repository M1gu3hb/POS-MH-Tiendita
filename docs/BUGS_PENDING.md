# BUGS_PENDING — Problemas / pendientes detectados durante la migración

Lista viva de cosas detectadas que **no** se corrigen en la fase actual, para no
mezclar alcances. Cada ítem indica fase de detección y acción sugerida.

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

- [ ] **Publicación Realtime** _(detectado Fase 1)_
  El sync escáner↔POS (sección 8) usa `postgres_changes` sobre `scan_events` (y el
  carrito sobre `carrito_items`). Hay que añadir esas tablas a la publicación
  `supabase_realtime` (`alter publication supabase_realtime add table scan_events, carrito_items, carritos_activos;`).
  **Acción:** migración de Realtime o configuración en el panel (Fase 5/8).

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

- [ ] **Bucket de Storage `negocio-assets`** _(Fase 4)_
  `/api/storage/upload` requiere un bucket público `negocio-assets` en Supabase Storage.
  **Acción:** crearlo (panel o migración de storage) y definir políticas por carpeta `negocio_id/`.

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
