# BUGS_PENDING — Problemas / pendientes detectados durante la migración

Lista viva de cosas detectadas que **no** se corrigen en la fase actual, para no
mezclar alcances. Cada ítem indica fase de detección y acción sugerida.

---

## UI / UX (detectado en prueba manual — 2026-06-24)

- [x] **El registro exitoso no redirige automáticamente al dashboard** _(RESUELTO 2026-06-24 · VERIFICADO EN NAVEGADOR)_
  Tras crear la cuenta hay que ir a `/login` manualmente. La página `register` llama a
  `signInWithPassword` y luego `router.replace('/')`, pero el redirect no ocurre de forma fiable
  (timing: Next prefetchea la RSC de `/` estando deslogueado → sirve el redirect cacheado a `/login`).
  **Fix aplicado:** tras `await signInWithPassword`, se llama `router.refresh()` (invalida el Router
  Cache) antes de `router.replace('/')`. Solo `app/(auth)/register/page.tsx`.

- [x] **ProductoDialog: sin categorías no guía a crear una** _(RESUELTO 2026-06-24 · VERIFICADO EN NAVEGADOR)_
  Cuando el negocio no tiene categorías, el `Select` de categoría queda vacío sin call-to-action.
  **Fix aplicado:** con la lista vacía el select muestra "No hay categorías — crea una primero" y
  debajo un botón "+ Nueva categoría" que abre un diálogo inline (nombre + 5 colores predefinidos).
  Al guardar usa `createCategoria` (ya existente en `src/lib/db/categorias.ts`), invalida el query
  `['categorias', negocioId]` y auto-selecciona la nueva. Solo `ProductoDialog.jsx`.

- [ ] **Navegación lenta en la primera carga de cada sección** _(prueba UI)_
  Es la **compilación bajo demanda de Next.js en `dev`** (cada ruta compila al primer acceso).
  No ocurre en `next build`/producción. **Acción:** ninguna en dev; validar tiempos en build de prod.

- [x] **Scrollbar visible en el sidebar en resoluciones menores** _(RESUELTO 2026-06-24 · VERIFICADO EN NAVEGADOR)_
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

- [x] **Lectura de `suscripciones` para cajeros** _(RESUELTO 2026-06-24, migración 006, reporte 005)_
  Se aplicó la política `suscripcion_select_cajero` (`FOR SELECT USING (negocio_id = get_negocio_id())`)
  a la BD real (migración `006_rls_cajeros`). Los cajeros del negocio ya pueden leer `suscripciones`.
  Nota (reporte 005): la BD ya tenía `suscripcion_select` con predicado idéntico, así que la nueva es
  **redundante** (RLS hace OR de políticas SELECT) — el acceso de cajeros ya estaba de facto resuelto.

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

## Detectados en reportes colaboradores 002–004 (2026-06-24)

### 🔴 CRÍTICO — Colisión de número de migración `005`
- [x] **Dos migraciones distintas con número `005`** _(RESUELTO 2026-06-24, reporte 005, claude-code)_
  Existían `005_storage_policy.sql` (reporte 002) y `005_rls_cajeros.sql` (reporte 004) con el mismo
  número; además la de cajeros no estaba aplicada a la BD. **Fix aplicado:** `005_rls_cajeros.sql`
  renombrada a `006_rls_cajeros.sql` (`git mv`) y **aplicada a la BD real** (`apply_migration`,
  `version 20260625000839`), verificada por introspección de `pg_policy`. Disco confirmado: un único
  `005` + `006_rls_cajeros`. **repo == BD a nivel de objetos/efectos** (verificado).
  **Caveat de bookkeeping preexistente (NO causado por esta tarea):** el ledger de la BD difiere en 2
  de 6 entradas — `003_functions.sql` figura como `003_register_rpc`, y `004_storage_realtime` no está
  registrado en el ledger aunque sus objetos sí existen. No remediado (manipular `schema_migrations`
  es arriesgado y fuera de scope). Ver ítem nuevo abajo.

- [ ] **Ledger de migraciones ≠ archivos del repo (bookkeeping)** _(detectado reporte 005)_
  El ledger de la BD no registra `004_storage_realtime` y nombra `003` como `003_register_rpc`. Los
  objetos existen, pero `supabase migration list` no coincidirá 1:1 con `supabase/migrations/`.
  **Acción:** reconciliar el ledger (`schema_migrations`) con cuidado, en una ventana controlada.

### Seguridad / backend (reporte 002 — claude-code)
- [ ] **Rate limiting en memoria no es global ni persistente** _(reporte 002)_
  El `Map` en memoria de `/api/negocio/register` vive por instancia; en serverless (Vercel) cada
  instancia tiene el suyo y se reinicia en cold start/redeploy. Freno básico, no garantía a escala.
  **Acción:** mover a un store compartido (Upstash/Vercel KV) antes de producción.
- [ ] **`/api/storage/upload` no valida MIME real ni extensión** _(reporte 002)_
  Solo valida tamaño (5 MB); `accept="image/*"` es solo del cliente. Un autenticado puede subir
  no-imágenes a su propia carpeta. Riesgo bajo (acotado a su `negocio_id`). **Acción:** validar tipo MIME/extensión server-side.
- [ ] **Logo huérfano por cambio de extensión** _(reporte 002)_
  Con nombre fijo `logo.<ext>`, subir `logo.png` y luego `logo.jpg` deja el `.png` sin referencia
  (cruft menor, sin riesgo). **Acción:** borrar el anterior o normalizar la extensión.

### Auditoría / cancelación de ventas (reporte 003 — codex)
- [ ] **Endpoint `/api/ventas/cancelar` sin consumidor en la UI** _(reporte 003)_
  El endpoint existe y escribe `audit_log`, pero **no hay UI que cancele una venta ya persistida**
  (el botón "Cancelar" de `venta/page.jsx` solo limpia el carrito antes de cobrar). Queda inalcanzable
  hasta conectar una UI. **Acción:** decidir flujo de cancelación de venta persistida y conectarlo.
- [ ] **Cancelación no atómica (2 llamadas REST)** _(reporte 003)_
  `update venta` + `insert audit_log` son dos llamadas REST separadas; usa reversión compensatoria si
  falla el audit, no una transacción real. **Acción:** mover a una RPC SQL para atomicidad estricta.
- [ ] **`npm audit --audit-level=high` falla** _(reporte 003)_
  Vulnerabilidades en dependencias existentes (`next`, `glob` vía `eslint-config-next`, `postcss`,
  `react-quill`/`quill`). El fix de npm implica cambios breaking. **Acción:** evaluar upgrades en Fase 6.

### Arquitectura (reporte 004 — antigravity)
- [x] **`layout.tsx` llama a Supabase directo desde componente cliente** _(RESUELTO 2026-06-24, reporte 005, claude-code)_
  El `useQuery` con fetch directo a `supabase` se eliminó de `app/(dashboard)/layout.tsx` (más sus
  imports huérfanos `useQuery`/`supabase`/`useAuth`). Verificado: el archivo ya no referencia Supabase;
  conserva `useConfig` solo para el logo. **Efecto secundario:** el nombre del negocio vuelve al
  fallback `'POS MH'` → ver regresión reabierta abajo.

- [ ] **Nombre del negocio en el sidebar (regresión reabierta)** _(reporte 005)_
  Al quitar el fetch directo, el sidebar vuelve a mostrar `'POS MH'` en vez del nombre real
  (`negocios.nombre`, que `useConfig`/`configuracion_negocio` no expone). El arreglo correcto exige
  exponerlo por la capa de datos. **Acción:** crear `useNegocio` (o añadir `nombre` a `useAuth`) en
  `src/lib/db/` y consumirlo en el layout.

## Detectados en reportes colaboradores 007–009 (2026-06-24)

### Escáner Realtime / mayoreo (reporte 007 — claude-code)
- [ ] **[HIGH] Stale closure de `items`/`config` en el cálculo de mayoreo** _(reporte 007, preexistente)_
  El efecto que aplica precio de mayoreo en `venta/page.jsx` lee `items`/`config` del closure pero sus
  deps son `[cajaAbierta?.id, productos, addItem]` (+ `eslint-disable`). Un scan Realtime que llega tras
  cambios manuales del carrito puede calcular el mayoreo sobre `items` obsoleto. Lo introdujo la lógica
  de mayoreo del reporte 009; la migración Realtime no lo empeora. **Acción:** leer `items`/`config`
  desde refs sincronizadas (`itemsRef`) o añadirlos a deps, en una tarea dedicada de mayoreo.
- [ ] **[LOW] Errores silenciados + canal Realtime sin sufijo único** _(reporte 007)_
  `catch {}` en catch-up/marcado, `void supabase.removeChannel(...)` sin `.catch`, y nombre de canal
  `scan_events:${corteId}` sin sufijo único (coincide con el estilo de `useCarritoActivo`). **Acción:**
  endurecer manejo de errores y unicidad de canal si se observan colisiones.

### Dashboard / mayoreo (reporte 009 — antigravity)
- [ ] **[LOW/perf] `getTopProductos` agrega en memoria en el cliente** _(reporte 009)_
  PostgREST no hace `GROUP BY`/agregación nativa desde el cliente, así que `getTopProductos` trae los
  renglones de `detalle_ventas` de la semana y agrega en JS. Aceptable hoy; puede degradar con alto
  volumen de ventas. **Acción:** mover la agregación a una RPC/vista SQL si crece el volumen.
- [ ] **Mayoreo sin datos reales para probar** _(reporte 009)_
  No hay productos con `precio_mayoreo > 0` y `cantidad_minima_mayoreo > 0` en la BD, así que la lógica
  de mayoreo solo se validó a nivel de build, no en runtime. **Acción:** cargar un producto de prueba
  con mayoreo y verificar el badge "MAYOREO" y el recálculo de precio en el POS.

### Entorno / proceso de build (reportes 008 y 009)
- [ ] **Proceso `next dev` fantasma en la máquina del usuario** _(reportes 008, 009)_
  Un `next dev` persistente (PID 11356 en Windows) bloqueaba `.next/` y causaba `ENOENT` de manifest en
  `next build` (lo vieron ambos agentes; 009 lo mató para desbloquear). **Acción:** cerrar procesos
  `next dev` colgados antes de compilar; no es bug de código.

### Incidente de coordinación multi-agente (RESUELTO — reporte 007)
- [x] **Commit `cf9d03c` quedó con import roto temporalmente** _(RESUELTO 2026-06-24, reporte 007)_
  El commit de mayoreo (reporte 009) arrastró la edición de `venta/page.jsx` (que importa
  `subscribeScanEvents`) **sin** el helper en `src/lib/db/scan.ts` → build roto en ese commit del
  remoto. El reporte 007 lo reparó añadiendo `subscribeScanEvents` a `scan.ts` (verificado en disco:
  el helper existe y el import resuelve; `tsc`/`build` en verde). **Riesgo de proceso:** agentes
  concurrentes editando el mismo archivo. **Acción:** serializar tareas que tocan `venta/page.jsx`.

## Detectados en reportes colaboradores 010–012 (2026-06-25)

### 🔴 IMPORTANTE — Migración `007_qr_url` sin aplicar (repo ≠ BD)
- [ ] **`007_qr_url.sql` no está aplicada a la BD real** _(reporte 011, codex — verificado por auditoría)_
  El código ya referencia `config.qr_url` (`src/lib/db/configuracion.ts`, `configuracion/page.jsx`,
  `TicketVenta.jsx`), pero la columna `configuracion_negocio.qr_url` **no existe en la BD**
  (`list_migrations` muestra solo 001–006; el reporte confirma error `42703`). Efecto: **guardar la URL
  del QR fallará en runtime** (`updateConfiguracion` con `qr_url` → `42703`) y el QR no se renderiza
  (lectura `select('*')` no trae la columna → `qr_url` undefined, degradación elegante). La feature de
  QR queda **no funcional** hasta aplicar la migración. **Acción:** aplicar `007_qr_url.sql` a
  `lisjbutidntalmobgjso` (SQL Editor) y reconfirmar repo == BD.

### Tickets / WhatsApp (reporte 010 — claude-code)
- [ ] **El ticket de WhatsApp muestra 'Mi Tienda' en vez del nombre real** _(reporte 010)_
  `generarMensajeTicket` usa `config.nombre`, que no existe en `configuracion_negocio` (el nombre vive
  en `negocios.nombre`), así que cae al fallback 'Mi Tienda'. Es la misma limitación que ya tiene
  `TicketVenta.jsx` (`config?.nombre_negocio`). **Acción:** pasar `negocio.nombre` (vía `useNegocio`,
  ya existente desde el reporte 006) a `generarMensajeTicket` en una tarea con acceso a esos archivos.

### Dependencias / entorno (reportes 011, 012)
- [ ] **`npm install`/`audit` reporta 7 vulnerabilidades (3 moderadas, 4 altas)** _(reporte 011)_
  Consistente con el ítem de `npm audit` del reporte 003. Tras añadir `qrcode`/`@types/qrcode`.
  **Acción:** evaluar upgrades en Fase 6 (ya registrado).
- [ ] **Bloqueos de `.next/` por procesos colgados (recurrente)** _(reportes 012, ya en 008/009)_
  Reaparecen `ENOENT`/`rename ... 500.html` en `next build` por handles de Webpack/Next en caché;
  se resuelve borrando `.next/` antes de compilar. No es bug de código. **Acción:** limpiar `.next/`
  y cerrar `next dev` colgados antes de builds de prod.

### 🟠 Coordinación multi-agente (reportes 010 y 011)
- [ ] **`TicketVenta.jsx` asignado a DOS agentes concurrentes** _(auditoría 010/011)_
  `src/components/venta/TicketVenta.jsx` estaba en la lista de archivos permitidos del reporte 010
  (WhatsApp) **y** fue editado por el reporte 011 (QR), ambos en paralelo. No hubo conflicto de merge
  **solo porque 010 decidió no editarlo**. Riesgo de proceso: el director asignó el mismo archivo a dos
  tareas simultáneas. **Acción:** evitar solapar archivos entre tareas concurrentes; serializar las que
  toquen `TicketVenta.jsx` o `venta/page.jsx`.

<!-- Última actualización: 2026-06-25 — Auditoría de reportes colaboradores 010–012 -->
