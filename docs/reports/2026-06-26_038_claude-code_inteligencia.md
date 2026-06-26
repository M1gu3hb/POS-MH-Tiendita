# Reporte 038 — claude-code — Inteligencia del negocio (qué surtir + comparativa días + predicción quiebre)

## Tarea recibida

REGLA ABSOLUTA: solo lo indicado; no features extra, no refactor fuera de scope, no cambiar arquitectura, no Supabase directo desde componentes, no cambiar diseño skeuomorphic. Sin migraciones (solo lectura/cálculo sobre datos existentes).

Archivos exclusivos: `app/(dashboard)/page.tsx` (dashboard — agregar sección), `src/components/dashboard/InteligenciaNegocio.jsx` (nuevo), `src/lib/db/inteligencia.ts` (nuevo), `docs/reports/`. NO tocar `venta/page.tsx`, configuracion, productos, inventario.

Tres análisis (sin IA externa, solo cálculo sobre ventas/productos) en el dashboard:
1. "Qué me conviene surtir" — `getQueConvieneSurtir`
2. "Comparativa de días" — `getComparativaDias`
3. "Predicción de quiebre de stock" — `getPrediccionQuiebre`
4. UI en el dashboard con tres bloques.

## Auditoría trabajo anterior

Leí `docs/reports/2026-06-26_035_claude-code_conteo-mermas.md`. **Conteo y mermas funcionan a nivel de código** (`tsc`/build verdes en su ronda): el registro de mermas opera ya (usa el kardex `movimientos_inventario` existente); el guardado del conteo depende de la migración `018_conteo_mermas.sql`, que quedó **PENDIENTE DE APLICAR** (responsabilidad del director). **No es un bug de mi código** — es la regla de migraciones de esa ronda. Nada que corregir.

Revisé el modelo de datos real antes de calcular:
- `ventas`: `negocio_id`, `fecha` (timestamptz), `estado` ('pagada'), `total`, `costo_total_snapshot`, `utilidad_bruta_snapshot`, montos por método.
- `detalle_ventas`: `producto_id`, `producto_nombre`, `cantidad`, `utilidad_snapshot` (ganancia ya calculada por renglón), y `created_at` (timestamp de inserción ≈ momento de la venta; lo usa `getTopProductos`).
- `productos`: `stock_actual`, `costo_unitario`, `precio_venta`, `activo`.
- El dashboard real es `app/(dashboard)/page.jsx` (no `.tsx`). El "Resumen de hoy" se gatea con `usuario?.rol === 'dueno'`.

## Lo que hice (archivo por archivo)

**`src/lib/db/inteligencia.ts`** (nuevo — capa de datos, sin Supabase desde componentes):
- `getQueConvieneSurtir(negocioId)`: agrega `detalle_ventas` de los últimos 30 días por producto (unidades + ganancia vía `utilidad_snapshot`). Devuelve `surteMas` (top 5 por ganancia, desempate por rotación) y `dejarDeSurtir` (productos **activos** sin ventas en 30 días). Si no hay ventas: `sinDatos: true` con mensaje amable.
- `getComparativaDias(negocioId)`: suma `ventas` pagadas de HOY vs. el mismo día de la semana pasada (rango día completo). Devuelve `totalHoy`, `totalSemanaPasada`, `porcentaje` (null si la semana pasada fue 0), y `hayDatos`.
- `getPrediccionQuiebre(negocioId)`: velocidad = unidades últimas 14 días / 14; `dias_restantes = stock_actual / velocidad`. Devuelve productos que se agotan en ≤ 5 días, ordenados por urgencia. **Ignora productos sin ventas** (velocidad 0).
- Constantes nombradas (30/14/5 días, top 5, máx 12) y tipos exportados (`ProductoSurtir`, `QueConvieneSurtir`, `ComparativaDias`, `ProductoQuiebre`). Todo con `.returns<T>()` (sin `any`).

**`src/components/dashboard/InteligenciaNegocio.jsx`** (nuevo): sección "Inteligencia del negocio" con 3 bloques (`skeu-panel`, variables del tema):
1. **"Qué te conviene surtir"** — lista "Surte más" (unidades + ganancia en verde) y chips "Considera dejar de surtir".
2. **"¿Cómo vas hoy?"** — total de hoy grande + % vs. semana pasada con flecha **verde si arriba / rojo si abajo**, y el total del mismo día anterior.
3. **"Se te van a acabar"** — productos próximos a agotarse con badge de días restantes (rojo ≤ 2 días, ámbar el resto; "hoy" si 0).
- Cada bloque maneja su estado de carga y el caso "sin datos suficientes" con mensaje amable.

**`app/(dashboard)/page.jsx`**:
- Import de `InteligenciaNegocio` y render **gateado para `rol === 'dueno'`** (decisión documentada: igual que el "Resumen de hoy"; los cajeros no ven esta inteligencia), colocado entre los StatCards y "Más vendidos esta semana".

## Lo que NO toqué

- `venta/page.tsx`, `configuracion`, `productos`, `inventario` — prohibidos. (Leí los tipos de `productos`/`ventas` y consulté esas tablas **solo desde la capa de datos** `inteligencia.ts`, sin editar sus repos ni páginas.)
- Sin migraciones (no hacían falta). Sin cambios de arquitectura ni de diseño skeuomorphic.
- `docs/reports/_AUDIT_LOG.md`: solo lectura (lo mantiene el director).

## Bugs detectados fuera de scope

Ninguno.

**Limitación documentada (no es bug):** la agregación por producto (surtir/quiebre) filtra `detalle_ventas.created_at` sin unir con `ventas.estado`, igual que el `getTopProductos` existente; incluiría renglones de ventas canceladas (evento raro en una tiendita). La comparativa de días sí filtra `estado='pagada'` porque consulta la cabecera `ventas`.

## Estado final

- **`tsc --noEmit`:** exit 0.
- **`next build`:** exit 0 (`✓ Compiled successfully`); ruta `/` (dashboard) 117 kB. (Solo el aviso benigno de caché de webpack por el `.next` compartido con builds concurrentes; no afecta el resultado.)
- Verificación a nivel de código + build. Sin prueba runtime contra BD viva.

## Número de reporte: 038
