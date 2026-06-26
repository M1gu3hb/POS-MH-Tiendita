# Reporte 035 — claude-code — Conteo de inventario + registro de mermas (anti robo hormiga)

## Tarea recibida

REGLA ABSOLUTA: solo lo indicado; no features extra, no refactor fuera de scope, no cambiar arquitectura, no Supabase directo desde componentes, no cambiar diseño skeuomorphic. Migraciones: archivo `.sql` en `supabase/migrations/`, **NO aplicar** (las aplica el director).

Archivos exclusivos: `app/(dashboard)/inventario/page.tsx`, `src/components/inventario/ConteoInventario.jsx` (nuevo), `src/components/inventario/MermaDialog.jsx` (nuevo), `src/lib/db/inventario.ts`, `supabase/migrations/018_conteo_mermas.sql` (nuevo), `docs/reports/`. NO tocar `venta/page.tsx`, `productos/page.tsx`, ni archivos de otras IAs.

Dos features contra robo hormiga / merma:
1. **CONTEO/ARQUEO**: el tendero cuenta físicamente y el sistema compara con lo que debería haber → detecta faltantes.
2. **REGISTRO DE MERMAS**: botón rápido para sacar producto dañado/caducado.

## Auditoría trabajo anterior

Leí `docs/reports/2026-06-26_030_claude-code_vista-cliente.md` (vista-cliente con identidad + letras grandes; build verde). **Sin bugs pendientes** de mi ronda anterior.

Revisé la estructura existente antes de tocar nada:
- `app/(dashboard)/inventario/page.jsx` (es `.jsx`, no `.tsx`): lista productos + ajuste manual de stock (entrada/salida/ajuste) vía `ajustarStock`. Usa primitivas shadcn y diseño skeuomorphic (`skeu-card`, `skeu-panel`).
- `src/lib/db/inventario.ts`: repo del kardex `movimientos_inventario` con `getMovimientos`, `createMovimiento` y `ajustarStock` (actualiza `productos.stock_actual` + inserta el movimiento).
- **El kardex YA soporta `tipo_movimiento = 'merma'`** (en `MovimientoInventario`). Por tanto las mermas NO requieren tabla nueva: se reutiliza `ajustarStock(... tipoMovimiento: 'merma')`. Documentado en la migración.
- Migraciones existentes llegan hasta `017_combos` → `018` libre. `_AUDIT_LOG.md` llega a #032; el director me asignó el #035 (evita colisión con #033/#034 concurrentes).

## Lo que hice (archivo por archivo)

**`supabase/migrations/018_conteo_mermas.sql`** (nuevo, PENDIENTE DE APLICAR):
- Tablas `conteos_inventario` (cabecera: totales, valor de diferencia, notas) y `conteo_detalle` (por producto: stock_sistema, stock_contado, diferencia, valor) — exactamente el DDL indicado.
- Índices de apoyo `(negocio_id, fecha DESC)` y `(conteo_id)`.
- RLS habilitado + políticas `conteos_negocio` y `conteo_detalle_negocio` por `get_negocio_id()`.
- Comentario explícito: las **mermas NO crean tabla** — usan el kardex `movimientos_inventario` existente.

**`src/lib/db/inventario.ts`** (capa de datos — repo, sin Supabase desde componentes):
- `iniciarConteo(negocioId)`: devuelve productos activos con `stock_sistema` y `costo_unitario`.
- `guardarConteo(negocioId, { usuarioNombre, notas, detalles })`: re-lee el stock autoritativo del servidor, calcula diferencia y valor (a **costo**) por producto, guarda cabecera + detalle. **NO ajusta el stock** (solo reporta — el ajuste lo decide el dueño).
- `getConteos(negocioId)`: historial de conteos.
- `registrarMerma(negocioId, { producto_id, cantidad, motivo, usuarioNombre })`: descuenta del stock Y registra el movimiento `merma` en el kardex vía `ajustarStock` (reutiliza lo que ya hay). `motivo: 'roto' | 'caducado' | 'echado_a_perder' | 'otro'`.
- Tipos exportados: `ProductoConteo`, `ConteoInventario`, `ConteoDetalleInput`, `GuardarConteoInput`, `MotivoMerma`.

**`src/components/inventario/ConteoInventario.jsx`** (nuevo): modo conteo en modal.
- Lista todos los productos con un campo numérico grande para el conteo físico.
- **Conteo a ciegas por defecto** (no muestra stock del sistema) + toggle "Mostrar stock del sistema".
- Buscador para filtrar. Contador de productos contados.
- "Finalizar conteo" → guarda (sin ajustar stock) y muestra **resultado**: solo los productos con diferencia ("Coca-Cola: sistema 20, contaste 17, faltan 3 −$45"), ordenados por mayor faltante, con total de faltantes en dinero y aviso **"Posible merma o robo detectado"**. Si todo cuadra, mensaje "¡Todo cuadra!".
- Nota visible: "El stock NO se ajustó automáticamente".

**`src/components/inventario/MermaDialog.jsx`** (nuevo): registro rápido de merma.
- Selector de producto (buscador) o producto preseleccionado; campo de cantidad grande; **botones rápidos de motivo**: "Se rompió" / "Caducó" / "Se echó a perder" / "Otro".
- Confirmar → `registrarMerma` (descuenta stock + kardex) y toast "Merma registrada: 2 yogurts (caducó)".

**`app/(dashboard)/inventario/page.jsx`**:
- Imports de los dos componentes nuevos + íconos `ClipboardList`, `PackageX`.
- Estado `conteoOpen` / `mermaOpen` + helpers `abrirConteo`/`abrirMerma` (gated por `useGatedAction`, igual que el ajuste) e `invalidarProductos` (invalida `productos-inventario`/`-pos`/`-all`).
- Dos botones en el header: **"Iniciar conteo"** y **"Registrar merma"**.
- Render de `<ConteoInventario>` y `<MermaDialog>` (este último recibe la lista de productos ya cargada para seleccionar).

## Lo que NO toqué

- `venta/page.tsx`, `productos/page.tsx` — prohibidos.
- El flujo de ajuste manual existente (entrada/salida/ajuste) quedó intacto.
- `movimientos_inventario` / kardex: reutilizado, sin cambios de esquema (las mermas entran como `tipo_movimiento='merma'`).
- `docs/reports/_AUDIT_LOG.md`: solo lectura (lo mantiene el director; otros agentes lo editan en paralelo — no lo contamino).
- Sin cambios de arquitectura ni de diseño skeuomorphic; toda la BD pasa por el repo `inventario.ts`.

## Migraciones creadas (PENDIENTES DE APLICAR)

- **`supabase/migrations/018_conteo_mermas.sql`** — tablas `conteos_inventario` + `conteo_detalle` con RLS por `get_negocio_id()`. **NO aplicada.** Hasta que el director la aplique, "Iniciar conteo → Finalizar" fallará al guardar (las tablas no existen) y `getConteos` no devolverá historial. El **registro de mermas SÍ funciona sin esta migración** (usa el kardex existente). El conteo carga y calcula bien en pantalla; solo el guardado depende de la migración.

## Bugs detectados fuera de scope

Ninguno. El kardex ya soportaba `'merma'`, así que no hubo que corregir nada para reutilizarlo.

## Estado final

- **`tsc --noEmit`:** exit 0.
- **`next build`:** exit 0 (`✓ Compiled successfully`); `/inventario` 10.8 kB. (Los 2 primeros intentos fallaron por la carrera de `.next` con un build concurrente de otra IA; el 3º compiló limpio — patrón ya conocido, no es un error del código.)
- Verificación a nivel de código + build. Sin prueba runtime contra BD viva (las tablas de conteo aún no están aplicadas).

## Número de reporte: 035
