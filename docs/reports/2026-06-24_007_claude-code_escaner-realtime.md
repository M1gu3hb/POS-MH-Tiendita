# Reporte 007 — claude-code — escáner móvil Realtime puro + fix dev server

## Tarea recibida

REGLA ABSOLUTA: Haz ÚNICAMENTE lo que este prompt indica. Si detectas un bug crítico fuera de scope, corrígelo Y documéntalo. Usa agentes internos para verificar cada paso.

TAREA 1 — Migrar el escáner móvil a Supabase Realtime puro (reemplazar el polling de 1.5s).
- En el consumidor de scan_events: suscripción Realtime (canal scan_events, filtro corte_id=eq.[corteId], evento INSERT); cada scan 'pendiente' → agregar al carrito + marcar 'procesado'. Mantener BroadcastChannel como fallback de mismo dispositivo.
- En venta: suscribirse a carrito_items por carrito_id; INSERT de otro dispositivo → agregar al carrito visual sin duplicar.
- Verificar con tsc y next build después de cada cambio.

TAREA 2 — package.json: agregar script "dev:stable" = "next dev --turbo". No cambiar "dev". Solo tocar package.json.

Commit + push: "feat: escáner móvil Realtime puro + fix dev server estabilidad"

## Lo que hice (archivo por archivo, cambio exacto)

**Hallazgo de mapeo (importante):** las páginas migradas son `.jsx` (no `.tsx`), y los roles que describe el prompt no coinciden con los archivos:
- `app/(dashboard)/escaner/page.jsx` es el **EMISOR** (el teléfono): solo `createScanEvent`. **No tiene polling** ni consume scan_events (confirmado también en la referencia `extracted/src/pages/Escaner.jsx`).
- El **polling de 1.5s** (`setInterval(tick, 1500)` sobre `getScanEventsPendientes`) vivía en **`app/(dashboard)/venta/page.jsx`** (el POS, consumidor).
- La suscripción Realtime a **`carrito_items`** por `carrito_id` **ya existía** en `src/hooks/useCarritoActivo.ts` (que usa `venta`), que refetchea la lista canónica (sin duplicar).
Por eso implementé la intención del prompt en el lugar real (el consumidor = `venta`), preservando la arquitectura.

**`src/lib/db/scan.ts`** — añadí `subscribeScanEvents(corteId, onInsert): () => void`:
- Crea un canal Supabase `scan_events:${corteId}` con `postgres_changes`, `event: 'INSERT'`, `filter: corte_id=eq.${corteId}`; en cada INSERT llama `onInsert(payload.new as ScanEvent)`. Devuelve una función de unsubscribe (`supabase.removeChannel`).
- **Por qué en el repo y no en el page:** la arquitectura exige que ningún componente importe el cliente Supabase directamente (todo pasa por `src/lib/db/*`). El page consume scan_events vía funciones de `scan.ts`; añadir aquí el helper de suscripción mantiene esa regla (el page NO importa supabase). Mismo patrón que ya usa `useCarritoActivo` para carrito_items, pero expuesto desde la capa de datos.

**`app/(dashboard)/venta/page.jsx`** — reemplazé el `useEffect` de polling por **Realtime puro**:
- Import: `subscribeScanEvents` añadido al import de `@/lib/db/scan`.
- Nuevo efecto: define `procesarEvento(ev)` que (1) ignora si no es 'pendiente'; (2) dedup vía `processedEventIdsRef` (check+add síncrono antes de cualquier await); (3) reclama el evento (`marcarScanEvent 'procesado'`); (4) resuelve el producto (por `producto_id` o `codigo_barras`); (5) lo agrega al carrito con la **misma lógica de mayoreo** que ya tenía el efecto previo (preservada del trabajo del otro agente). 
- **Catch-up inicial una sola vez** (NO recurrente): drena `getScanEventsPendientes` al montar/abrir corte, para no perder eventos insertados antes de conectar la suscripción.
- **Suscripción Realtime** vía `subscribeScanEvents`; cleanup llama `unsubscribe()` + `cancelled = true` al desmontar/cambiar de corte.
- Se eliminó el `setInterval(tick, 1500)` y el guard `document.hidden` (innecesario sin polling).
- **`carrito_items` en venta:** NO se añadió suscripción nueva — ya la provee `useCarritoActivo` (refetch canónico, sin duplicar). Duplicarla habría causado doble manejo.
- **BroadcastChannel:** intacto (sync carrito → Vista Cliente, mismo dispositivo). El escaneo en el mismo dispositivo sigue por `handleBarcodeScan/addToCart` (no por scan_events).

**`package.json`** (TAREA 2) — añadí `"dev:stable": "next dev --turbo"` entre `"dev"` y `"build"`. `"dev"` sin cambios. Nada más tocado en el archivo.

## Lo que NO toqué y por qué

- **`app/(dashboard)/escaner/page.jsx`**: es el emisor; no tiene polling que migrar. Añadirle un consumidor Realtime sería una feature no pedida (el teléfono ya muestra su lista local "enviados"; el que "ve los productos en tiempo real" es el POS = venta).
- **`src/hooks/useCarritoActivo.ts`**: ya cumple el requisito de carrito_items Realtime; no se duplica.
- **Lógica de mayoreo** (del agente concurrente): preservada tal cual, no modificada.
- **Archivos de otros agentes en el working tree** (`docs/BUGS_PENDING.md`, `docs/CHANGELOG.md`, `docs/reports/_AUDIT_LOG.md`): excluidos del commit (pathspec acotado).

## Bugs detectados fuera de scope

Verificación con agente interno (`react-reviewer`) sobre el cambio. Confirmó: (a) el canal se limpia sin fugas en unmount/cambio de corte; (b) no hay doble-procesamiento real (guard síncrono + filtro `estado='pendiente'` en BD). Hallazgos:

1. **[HIGH, PREEXISTENTE] Stale closure de `items`/`config` en el cálculo de mayoreo.** El efecto lee `items`/`config` del closure pero sus deps son `[cajaAbierta?.id, productos, addItem]` (+ `eslint-disable`). Un scan Realtime que llega tras cambios manuales del carrito puede calcular el precio de mayoreo sobre `items` obsoleto. **No corregido:** este patrón es **idéntico** al que ya tenía el efecto de polling previo (lo introdujo el otro agente con la lógica de mayoreo); mi migración no lo introdujo ni lo empeora (en ambas versiones el closure se recrea solo con esas deps). Es HIGH (no CRITICAL) y corregirlo implicaría alterar la lógica de mayoreo de otro agente activo → fuera de mi alcance. **Recomendación:** leer `items`/`config` desde refs sincronizadas (`itemsRef`) o añadirlos a deps, en una tarea dedicada de mayoreo.
2. **[MEDIUM/LOW, convención del repo] Errores silenciados** (`catch {}` en catch-up y marcado), **`void supabase.removeChannel(channel)`** sin `.catch`, y **nombre de canal sin sufijo único**. Coinciden con el estilo ya existente (`useCarritoActivo` hace lo mismo). No modificados por consistencia y por estar fuera del alcance del prompt.

## Estado final (build, tsc, Realtime verificado o solo código)

- **`tsc --noEmit`:** exit 0 (tras TAREA 1 y tras TAREA 2).
- **`next build`:** exit 0 (tras TAREA 1 y tras TAREA 2).
- **Verificación de Realtime: SOLO A NIVEL DE CÓDIGO + BUILD + revisión por agente.** NO se probó en runtime con dos dispositivos (requeriría teléfono + POS + sesión real contra la BD). La publicación `supabase_realtime` ya incluye `scan_events` (migración 004) y el mecanismo es el mismo que `useCarritoActivo` ya usa en producción para `carrito_items`, por lo que la base está habilitada. **Recomendado:** prueba E2E manual — escanear desde el teléfono (misma cuenta) con el POS abierto en otra pantalla y confirmar que el producto aparece en el carrito sin recargar.
- **TAREA 2:** `npm run dev:stable` ejecuta `next dev --turbo` (verificado a nivel de definición del script; no se dejó corriendo el dev server).

## Nota de coordinación (multi-agente)

Durante esta tarea, un agente concurrente commiteó `cf9d03c` ("feat: top productos… + mayoreo automático") y **arrastró mi edición de `app/(dashboard)/venta/page.jsx`** (la migración Realtime, que importa `subscribeScanEvents`) **sin** mi helper de `src/lib/db/scan.ts` que lo exporta. Resultado: `cf9d03c` quedó con un **import roto** (`subscribeScanEvents` no existía en el `scan.ts` commiteado) → el build falla en ese commit del remoto. **Este commit repara la integridad** al añadir `subscribeScanEvents` a `scan.ts`. Por eso `venta/page.jsx` no aparece en mi commit (ya estaba en `cf9d03c`); mi commit aporta `scan.ts` (el faltante), `package.json` y este reporte. Verificado localmente: con `scan.ts` aplicado, `tsc` y `next build` salen en 0.

## Número de reporte: 007
