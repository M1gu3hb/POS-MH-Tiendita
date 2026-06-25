# Reporte 019 — claude-code — Offline sync vía RPC `crear_venta_completa`

## Tarea recibida

REGLA ABSOLUTA: solo lo indicado; no features extra, no refactor fuera de scope, no cambiar arquitectura, no Supabase directo desde componentes, no cambiar diseño skeuomorphic. NO aplicar migrations (ya existe la 011 con el RPC `crear_venta_completa`; usarla).

Archivos exclusivos: `src/lib/offline/ventas.ts`, `app/api/ventas/route.ts` (nuevo), `src/hooks/useOffline.js`, `docs/reports/`.

PASO 0 — Auditoría del reporte 016: verificar `public/sw.js`, los 4 archivos de `src/lib/offline/`, `useOffline`, y `OfflineBanner` en venta.

TAREA — Conectar la sincronización offline al RPC transaccional:
- STEP 1: `app/api/ventas/route.ts` (POST) que valida sesión, toma negocio_id/cajero_id del usuario y llama `crear_venta_completa` con el cliente admin (service_role).
- STEP 2: `sincronizarVentas()` hace POST a `/api/ventas` por cada venta pendiente; 200 → `marcarVentaSincronizada`; error → reintentar; retorna `{ sincronizadas, fallidas }`.
- STEP 3: `useOffline` muestra toasts ("X ventas sincronizadas" / error con conteo de fallidas) al reconectar.

Commit + push: "fix: offline sync usa RPC crear_venta_completa — stock se descuenta correctamente".

## Auditoría trabajo anterior (resultado)

Verificado en código real — **todo intacto, sin bugs**:
- `public/sw.js` existe.
- `src/lib/offline/` tiene los 4 archivos: `db.ts`, `productos.ts`, `ventas.ts`, `config.ts`.
- `src/hooks/useOffline.js` existe.
- `OfflineBanner` importado (`venta/page.jsx:40`) y renderizado (`:669`). (La página es `.jsx`, no `.tsx`.)

Además, verifiqué por introspección (solo lectura, sin aplicar nada) que el RPC `crear_venta_completa` existe en la BD con la firma exacta del prompt (16 parámetros, `p_items jsonb`). No se aplicó ninguna migration.

## Lo que hice (archivo por archivo)

**`app/api/ventas/route.ts`** (NUEVO) — `POST`:
1. `getServerAuthContext()` valida la sesión (vía `createServerSupabase`); si no hay sesión/negocio → **401**.
2. `negocioId = ctx.negocioId`, `cajeroId = ctx.usuario?.id` (tomados de la SESIÓN, no del body).
3. Valida que el body traiga `folio` e `items` no vacío → si no, **400**.
4. `createAdminClient()` (service_role) llama `crear_venta_completa` con el mapeo del prompt
   (`p_metodo_pago = body.metodo_pago || 'efectivo'`, `p_monto_efectivo = total`, `p_monto_tarjeta/transferencia = 0`, etc.).
5. Error del RPC → **500** con el mensaje; OK → **200** con `data` (`{ venta_id, folio, total, costo_total, utilidad_bruta }`).
- Tipado `any`-free (interfaces `VentaBody`/`VentaItemBody`). Patrón consistente con `app/api/storage/upload` y `app/api/negocio/register` (auth context + admin client).

**`src/lib/offline/ventas.ts`** — `sincronizarVentas()` reescrita:
- Antes usaba el repo `createVenta` (insertaba venta+detalle pero **no** descontaba stock). Ahora hace **`POST /api/ventas`** por cada venta pendiente.
- Helper `toRequestBody()` mapea el payload guardado (`{ venta, detalle }`, que es lo que `guardarVentaPendiente` recibe del POS y NO puedo cambiar) al **body plano** que espera el endpoint: `items[]` con `{ producto_id, producto_nombre, cantidad, precio_unitario (= precio_unitario_snapshot), subtotal, descuento, total }`.
- `res.ok` → `marcarVentaSincronizada(id)` y `sincronizadas++`; error/excepción → `fallidas++` (se deja en la cola para reintentar).
- Devuelve **`{ sincronizadas, fallidas }`** (antes devolvía `number`). Se eliminó el import de `createVenta`. `guardarVentaPendiente`/`getVentasPendientes`/`marcarVentaSincronizada` sin cambios.

**`src/hooks/useOffline.js`** — `sincronizar()`:
- Importa `toast` de `sonner`.
- Captura `{ sincronizadas, fallidas }` de `sincronizarVentas()`: si `sincronizadas > 0` → `toast.success("N ventas sincronizadas")`; si `fallidas > 0` → `toast.error("N ventas no se pudieron sincronizar")`.
- `sincronizando = true` mientras corre (sin cambios en esa parte). Se sigue llamando en el evento `'online'`.

## Lo que NO toqué

- **`app/(dashboard)/venta/page.jsx`**: no permitido esta ronda. `guardarVentaPendiente` sigue recibiendo el mismo payload `{ venta, detalle }`; el mapeo al body del endpoint se hace en `sincronizarVentas` (mi archivo), sin tocar el POS.
- **`public/sw.js`**: el SW ya **no intercepta `/api/*`** (se configuró en la ronda anterior), así que el POST a `/api/ventas` va siempre a la red. No requirió cambios.
- **Migrations / BD**: ninguna; el RPC `crear_venta_completa` (migration 011) ya estaba aplicado, solo lo consumí.
- **Resto de la capa offline** (`db.ts`, `productos.ts`, `config.ts`), `OfflineBanner`, otros archivos: sin cambios.

## Bugs detectados fuera de scope

1. **RESUELTO el bug crítico del reporte 016** (documentado entonces): las ventas offline ahora **sí descuentan stock y registran kardex** al sincronizar, porque van por el RPC transaccional `crear_venta_completa` en vez del antiguo `createVenta` (que solo insertaba venta+detalle). Esto era el "fuera de scope #1" del 016; esta ronda lo cierra.
2. **Costo/utilidad se recalculan en el servidor al sincronizar** (el RPC los deriva del producto al momento del sync; devuelve `costo_total`/`utilidad_bruta`). Los snapshots de costo del payload offline se ignoran. Para una tiendita es correcto; lo anoto por trazabilidad. No es bug.
3. **`corte_id` de una venta offline podría apuntar a un corte ya cerrado** al sincronizar (la FK sigue siendo válida; la venta queda asociada a ese corte). Comportamiento aceptable; anotado.

## Estado final

- **`tsc --noEmit`:** exit 0. **`next build`:** exit 0 (`✓ Compiled successfully`).
- **`/api/ventas`** aparece como ruta dinámica (ƒ) en el build → compila correctamente.
- **Flujo:** offline el POS encola la venta; al volver internet `useOffline` llama `sincronizarVentas()` → `POST /api/ventas` por cada una → el RPC crea venta + detalle + **descuenta stock + kardex** atómicamente → se elimina de IndexedDB → toast con el conteo. Las que fallan se reintentan en la próxima reconexión.
- **Seguridad:** `negocio_id`/`cajero_id` salen de la sesión validada; el RPC (solo `service_role`) se invoca server-side con el cliente admin. El cliente nunca llama al RPC directo.
- **Verificación a nivel de código + build + introspección del RPC.** No se hizo prueba runtime (cortar red real, vender offline, reconectar y observar el descuento de stock).

## Número de reporte: 019
