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

- [x] **Triggers de `updated_at`** _(RESUELTO/VERIFICADO 2026-06-25, reporte 018)_
  El #018 verificó vía `information_schema.triggers` que todas las tablas operativas clave tienen su
  trigger `update_updated_at` activo: `negocios`, `usuarios`, `productos`, `proveedores`,
  `configuracion_negocio`, `carritos_activos`, `suscripciones` y `clientes_fiado` (añadido en `008`).
  No faltaba ninguno; no hizo falta DDL adicional.

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

- [x] **`@/components/common/EnMigracion.tsx`** _(RESUELTO 2026-06-25, reporte 018)_
  Eliminado en la limpieza de Fase 6; verificado que ya no existe ni se referencia.

- [ ] **Tipado estricto de páginas `.jsx`** _(Fase 5)_
  Las páginas se portaron como `.jsx` (no type-checkeadas) para acelerar y evitar el choque de
  tipos de las primitivas shadcn. **Acción opcional:** convertir primitivas + páginas a TSX si se
  quiere cobertura de tipos en la UI.

- [ ] **Nombre del negocio en el layout** _(Fase 5)_
  `configuracion_negocio` no tiene `nombre_negocio` (vive en `negocios.nombre`). El sidebar
  usa el fallback 'POS MH'. **Acción:** exponer el nombre del negocio (p.ej. añadirlo a `useAuth`
  o un hook `useNegocio`) y mostrarlo.

- [x] **Botón de cerrar sesión** _(RESUELTO 2026-06-25, reporte 017)_
  El #017 añadió el botón "Cerrar sesión" (`Button variant="destructive"`) al final de
  `app/(dashboard)/cuenta/page.jsx`, con divider, usando el `signOut` ya expuesto en `useAuth`.

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

- [x] **Dependencias pesadas posiblemente sin uso** _(RESUELTO 2026-06-25, reporte 018)_
  El #018 removió `three` (+`@types/three`), `react-leaflet`, `moment` y `react-quill` tras confirmar
  cero imports. **Verificado por auditoría:** ningún archivo de `src/`/`app/` los importa. `date-fns`
  se conserva (sí se usa). `tsc`/`next build` en verde tras el retiro.

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

### Migración `007_qr_url` — RESUELTO
- [x] **`007_qr_url.sql` aplicada a la BD** _(RESUELTO 2026-06-25 — verificado vía `list_migrations`)_
  La migración ya figura en el ledger (`version 20260625041237`); la columna
  `configuracion_negocio.qr_url` existe. La feature de QR queda funcional y **repo == BD** restaurado.
  (Histórico: el reporte 011 la dejó sin aplicar; se aplicó después, confirmado por el reporte 014 y
  por esta auditoría.)

### Tickets / WhatsApp (reporte 010 — claude-code)
- [x] **El ticket de WhatsApp muestra 'Mi Tienda' en vez del nombre real** _(RESUELTO 2026-06-25, reporte 013 PASO 0)_
  El #013 añadió el parámetro `negocioNombre` a `generarMensajeTicket` (fallback `negocioNombre ||
  config?.nombre || 'Mi Tienda'`) y en `venta/page.jsx` pasa `negocio?.nombre` vía `useNegocio`.
  Verificado en `src/utils/whatsapp.ts` (líneas 51, 57). El ticket de WhatsApp ya muestra el nombre real.
  Nota: `TicketVenta.jsx` (impreso) sigue con `config?.nombre_negocio` — ese sí persiste (ver abajo).

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

## Detectados en reportes colaboradores 013–015 (2026-06-25)

> **Migraciones: TODAS aplicadas.** Ledger de `lisjbutidntalmobgjso` verificado vía `list_migrations`:
> 001–010 presentes, incl. `008_fiado`, `009_devoluciones`, `010_historial_precios`. **No hay
> migraciones pendientes.** Disco (10 archivos) == BD (10 entradas).

### Fiado / crédito (reporte 013 — claude-code)
- [ ] **[HIGH] `registrarCargo`/`registrarAbono` no son atómicos** _(reporte 013)_
  Sin RPC, son insert-movimiento + update-saldo (read-modify-write) en 2 operaciones. Cargos/abonos
  concurrentes al mismo cliente pueden competir y descuadrar el `saldo_pendiente`. Aceptable para una
  tiendita de 1 cajero. **Acción:** función plpgsql `registrar_movimiento_fiado` para atomicidad real.
- [ ] **Venta a fiado no valida `limite_credito`** _(reporte 013)_
  Se puede vender a fiado por encima del límite del cliente (el límite solo se muestra informativo).
  No se pidió bloquear. **Acción:** validar saldo + nuevo cargo contra `limite_credito` si se desea gating.
- [ ] **"Cobrar a fiado" no está en la barra de carrito móvil** _(reporte 013)_
  El botón está solo en el footer de escritorio (`venta/page.jsx`); `MobileCartBar.jsx` no estaba en
  los archivos permitidos. **Acción:** añadir la opción de fiado en móvil.
- [ ] **Opción de fiado fuera de `CobroDialog`** _(reporte 013)_
  La spec pedía la opción dentro de `CobroDialog.jsx`, pero no estaba permitido tocarlo; quedó como
  botón/selector propio en `venta/page.jsx`. Mismo resultado funcional. **Acción:** consolidar en
  `CobroDialog` si se quiere un único punto de cobro.
- [ ] **`TicketVenta.jsx` (impreso) aún muestra `config?.nombre_negocio`** _(auditoría 013)_
  El fix del nombre real fue solo para el ticket de WhatsApp; el ticket impreso sigue con el campo
  inexistente `nombre_negocio`. **Acción:** pasar `negocio.nombre` también al `TicketVenta`.

### Devoluciones (reporte 014 — codex)
- [ ] **`procesarDevolucion` depende de `/api/devoluciones` (server-side)** _(reporte 014)_
  Bien encapsulado (valida sesión/negocio, venta `pagada`, repone stock + kardex, escribe `audit_log`).
  Sin caveat de arquitectura. Falta **prueba runtime** (devolver una venta real, confirmar reposición
  de stock y registro de auditoría).

### 🟠 Coordinación / migraciones cruzadas (reportes 014 y 015)
- [ ] **`009_devoluciones` la aplicó el #015 (antigravity), no su autor #014 (codex)** _(auditoría)_
  El #014 dejó `009` sin aplicar (sin credenciales/CLI). El #015, fuera de su tarea (era
  `010_historial_precios`), aplicó `009` "vía `psql`" para evitar runtime roto de devoluciones.
  El ledger confirma ambas aplicadas. **Discrepancia a aclarar:** el #014 reportó que NO había acceso
  Postgres/credenciales, pero el #015 sí aplicó DDL por `psql` — conviene confirmar qué credenciales se
  usaron y quién las tiene. **Riesgo de proceso:** un agente aplicando migraciones de otro a la BD real.

### Entorno (reportes 013, 014, 015)
- [ ] **Builds concurrentes corrompen `.next/` (recurrente)** _(reportes 013, 014, 015)_
  Varios agentes corriendo `next build` a la vez causan `ENOENT`/`ENOTEMPTY` en `.next`. Se resuelve con
  `.next` limpio y sin builds concurrentes. No es bug de código. **Acción:** serializar builds.

## Detectados en reportes colaboradores 016–018 (2026-06-25)

> **Migraciones: sin novedad.** Los reportes 016–018 no crearon migraciones. Disco = `001`–`010`
> (10 archivos), todas en el ledger (verificado el turno previo). **No hay migraciones pendientes.**
> Ninguna migración fue aplicada por un agente que no fuera su autor en este lote.

### Modo offline (reporte 016 — claude-code)
- [x] **[HIGH] Ventas offline no descuentan stock/kardex al sincronizar** _(RESUELTO 2026-06-25, reporte 019)_
  El #019 reescribió `sincronizarVentas` para hacer `POST /api/ventas` → RPC transaccional
  `crear_venta_completa` (venta + detalle + **descuento de stock + kardex** atómico), en vez del antiguo
  `createVenta`. `negocio_id`/`cajero_id` salen de la sesión; el RPC se invoca server-side con el cliente
  admin. Las ventas offline ya descuentan inventario al sincronizar. Verificado a nivel código + build +
  introspección del RPC (falta runtime real). **Ver bug crítico de la migración 011 abajo.**
- [ ] **Cobro offline siempre `metodo_pago='efectivo'` y sin nombre de cliente** _(reporte 016)_
  Offline no abre `CobroDialog`, así que no se elige método de pago ni se captura el nombre de cliente
  (la feature del #017). **Acción:** permitir método/cliente en el cobro offline si se requiere.
- [ ] **Gating de suscripción omitido en modo offline** _(reporte 016, decisión consciente)_
  Sin red no se valida la suscripción; se permite seguir vendiendo (modo degradado). **Acción:**
  revalidar al reconectar; documentar como comportamiento esperado en SECURITY.md.
- [ ] **Service Worker registrado en `venta/page.jsx`, no en el root layout** _(reporte 016)_
  STEP pedía registrarlo en `app/layout.tsx` (no permitido); se registró en `/venta`. El SW controla
  todo el origen una vez instalado, pero solo se instala al visitar `/venta`. **Acción:** mover el
  registro al root layout para cobertura desde la primera carga.

### UX / nombre de cliente (reporte 017 — codex)
- [ ] **Nombre de cliente guardado en `ventas.notas` con prefijo `Cliente: `** _(reporte 017)_
  Para no crear columna, el nombre se persiste en `notas` y `TicketVenta` lo parsea por prefijo (o lee
  `venta.nombre_cliente` si existe). Funciona, pero es frágil (parsing de string) y mezcla datos en
  `notas`. **Acción:** si se formaliza, añadir columna `nombre_cliente` en una migración.

### 🟠 Proceso — colaborador editó docs de planeación (reporte 018)
- [ ] **#018 reescribió `PROJECT_CONTEXT.md`, `NEXT_STEPS.md` y `ARCHITECTURE.md`** _(auditoría)_
  La limpieza de Fase 6 incluyó reescribir docs de planeación que solapan con el dominio del auditor.
  No es bug de código, pero conviene que el director confirme que el nuevo `NEXT_STEPS.md` refleja los
  pendientes reales (esta lista `BUGS_PENDING.md` sigue siendo la fuente de detalle técnico). **Acción:**
  revisar coherencia entre `NEXT_STEPS.md` (reescrito por #018) y `BUGS_PENDING.md` (auditor).

## Detectados en reporte colaborador 019 (2026-06-25)

### Migración `011` faltante en el repo — RESUELTO
- [x] **El RPC `crear_venta_completa` (migración 011) ya está en el repo** _(RESUELTO 2026-06-25, reporte 020 claude-code)_
  El #020 (claude-code) agregó `supabase/migrations/011_rpc_crear_venta_completa.sql` (commit `0afe289`).
  **Verificado por auditoría:** el archivo existe y contiene el RPC real; su firma (16 parámetros +
  `SECURITY DEFINER` + `REVOKE`/`GRANT service_role`) **coincide con la función desplegada** en la BD
  (`pg_get_function_arguments`). Disco `001`–`011` == ledger `001`–`011`. **repo == BD restaurado.**

<details><summary>Histórico (hallazgo original del reporte 019)</summary>

El RPC figuraba aplicado en la BD (ledger `011`, `version 20260625060825`) y el código lo invocaba
desde `app/api/ventas/route.ts`, pero `supabase/migrations/` solo tenía `001`–`010` y ningún `.sql`
contenía `crear_venta_completa`. Era bloqueante de deploy (un entorno nuevo no tendría el RPC).
</details>

### Offline sync (reporte 019 — notas menores)
- [ ] **Costo/utilidad de ventas offline se recalculan en el server al sincronizar** _(reporte 019)_
  El RPC deriva `costo_total`/`utilidad_bruta` del producto al momento del sync; ignora los snapshots
  de costo del payload offline. Aceptable para una tiendita; anotado por trazabilidad.
- [ ] **`corte_id` de una venta offline puede apuntar a un corte ya cerrado al sincronizar** _(reporte 019)_
  La FK sigue válida; la venta queda asociada a ese corte. Comportamiento aceptable; anotado.

## Detectados en reportes 021–024 (deploy + auditorías finales) — 2026-06-25

> **Estado de deploy verificado por el auditor vía Vercel API** (no documentado en ningún reporte):
> el proyecto `mh-astral-systems/pos-mh-tiendita` tiene un deployment **READY en producción**
> (`dpl_8SCP4af3djuW3C7HyPvfhEGLUEZn`, commit `d92714e` "migration 011", redeploy de codex). Es
> **posterior** a los intentos BLOCKED/ERROR que reportó el #021. Es decir: el deploy del #021 quedó
> BLOCKED, pero un redeploy posterior **sí llegó a READY**. `READY` = build OK + sirviendo; **no**
> garantiza correctitud funcional en runtime.

### 🔴 Deploy / runtime
- [ ] **Funcionalidad en producción sin verificar (runtime cero)** _(auditoría 021–024)_
  Hay un deploy READY, pero **ningún flujo se ha probado E2E** contra el entorno desplegado (login,
  venta, Supabase, RLS, offline). Las 3 auditorías finales lo reconocen. **Acción (bloqueante para
  usuarios reales):** smoke test en la URL de producción — login, registro, una venta completa.
- [ ] **SSO Deployment Protection desactivada en el proyecto Vercel** _(reporte 021)_
  El #021 desactivó la protección de deployment para poder hacer fetch HTTP directo y la dejó así.
  **Acción:** re-confirmar y re-activar la protección si el preview/prod no debe ser público.
- [ ] **Notas de config de Vercel** _(auditoría)_ `framework` a nivel de proyecto = `null` (se apoya en
  `vercel.json`); `nodeVersion = 24.x` para un Next 14 (oficialmente soportado hasta Node 20/22).
  Riesgo bajo; **verificar** que no cause comportamiento raro. `live: false` en el proyecto — confirmar
  que la URL de producción esté realmente sirviendo el deploy READY.

### 🟠 Calidad de auditoría (reportes 022, 023, 024)
- [ ] **Las 3 "auditorías finales" son auto-auditorías y ninguna detectó el fallo de deploy** _(meta)_
  El #022 (claude-code), #023 (codex) y #024 (antigravity) auditaron **solo el trabajo de su propia
  IA** y los tres declararon "LISTO PARA PRODUCCIÓN" basándose en código + build, **sin** validar el
  deploy ni runtime. El #023 incluso **leyó el #021** (deploy BLOCKED) y aun así no lo reflejó en su
  veredicto. **Implicación:** los tres "LISTO" cubren código/build, no un deploy funcional verificado.
  **Acción:** una verificación cruzada independiente (esta auditoría) + smoke test real antes de abrir.

### Dependencias (reporte 021, recurrente)
- [ ] **`npm` reporta 5 vulnerabilidades (1 moderada, 4 altas)** _(reportes 020b, 021)_
  Sin resolver. **Acción:** evaluar/upgradear antes de tráfico real.

## Detectados en reportes colaboradores 025–027 (2026-06-25)

> **Migraciones: sin novedad.** 025 evaluó la `012` pero NO la creó (el check `ventas.metodo_pago` ya
> incluye `'fiado'` desde `008`). 026/027 no crearon migraciones. Ledger sigue en `001`–`011`,
> **ninguna pendiente**.

### 🟠 Conflicto multi-agente (reportes 025 y 026) — sin pérdida de datos
- [ ] **025 y 026 editaron `app/(dashboard)/venta/page.jsx` en paralelo** _(auditoría)_
  El #025 (fiado) y el #026 (teléfono WhatsApp) modificaron el mismo archivo concurrentemente.
  **Verificado: el merge preservó ambos cambios** — coexisten en el archivo (`construirUrlWhatsApp`/
  `whatsappTelefono` del 026 y `handleCobroFiado`/`handleCrearClienteFiado`/"Fiado registrado para" del
  025). No hubo ediciones perdidas, pero es el patrón de riesgo ya señalado. **Acción:** serializar
  tareas que toquen `venta/page.jsx`.

### Fiado (reporte 025)
- [ ] **Atomicidad venta↔cargo en fiado (preexistente)** _(reporte 025)_
  `createVenta` + `ajustarStock` + `registrarCargo` son operaciones separadas; si `registrarCargo`
  falla tras crear la venta, la venta queda pero el saldo del cliente no sube. Riesgo bajo para una
  tiendita. **Acción:** un RPC `crear_venta_fiado` (venta + stock + cargo atómico) si se quiere robustez.
- [ ] **`limite_credito` oculto en UI pero la columna sigue en BD** _(reporte 025)_
  Se quitó el límite del formulario/perfil de fiado, pero la columna `clientes_fiado.limite_credito` no
  se eliminó (solo se oculta). Sin impacto; anotado por trazabilidad.

### UX móvil (reporte 027)
- [ ] **`globals.css`: `main > * { padding !important }` en móvil** _(reporte 027)_
  La regla (dentro de `@media max-width:767px`) fuerza padding horizontal a TODOS los hijos directos de
  `<main>`. Solo afecta móvil (desktop intacto), pero el `!important` sobre todos los hijos puede
  deformar elementos full-bleed o duplicar padding en páginas que ya lo tienen. **Acción:** validar en
  navegador móvil; acotar el selector si alguna página se ve mal.

<!-- Última actualización: 2026-06-25 — Auditoría de reportes 021–024 (deploy + auditorías finales) -->

<!-- Última actualización: 2026-06-25 — Auditoría de reportes colaboradores 025–027 -->
