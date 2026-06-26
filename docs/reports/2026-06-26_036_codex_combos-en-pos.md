# Reporte 036 - codex - combos en POS

## Tarea recibida

Corregir/verificar `supabase/migrations/017_combos.sql` para que el trigger use `update_updated_at()`, integrar la venta de combos en el POS usando `getCombos`, descontar stock de los productos incluidos en `combo_productos`, mantener el ticket como una sola linea de combo, no tocar fiado/WhatsApp/categorias/hardware y no aplicar migraciones.

## Auditoría trabajo anterior

Lei `docs/reports/2026-06-26_033_codex_integracion-hardware-pos.md`.

Verifique en codigo real:
- `src/hooks/useEscanerFisico.js` existe.
- `src/hooks/useBascula.js` existe.
- `src/lib/hardware/escanerFisico.ts` existe.
- `src/lib/hardware/bascula.ts` existe.
- `app/(dashboard)/venta/page.jsx` mantiene `useEscanerFisico(config, handleBarcodeScan)` conectado al flujo existente de codigo de barras.
- `app/(dashboard)/venta/page.jsx` mantiene `useBascula(config)` y el dialogo de producto por peso.

No detecte bug critico en la integracion anterior durante esta auditoria.

## Lo que hice (archivo por archivo)

`supabase/migrations/017_combos.sql`
- Verifique que el trigger ya usa la funcion correcta:
  `FOR EACH ROW EXECUTE FUNCTION update_updated_at();`
- No aplique la migration.
- No deje cambios en este archivo porque ya estaba alineado.

`src/lib/db/combos.ts`
- Agregue `ProductoComboStock`.
- Agregue `getProductosComboStock(negocioId, productoIds)` para leer, desde la capa de datos, el stock/costo/unidad de los productos que componen un combo.
- No cambie la firma ni el comportamiento existente de `getCombos`.

`src/components/venta/CombosDisponibles.jsx`
- Cree un componente visual para mostrar combos vigentes en el POS.
- Muestra nombre y `precio_combo`.
- Al tocar un combo, llama al handler recibido para agregarlo al carrito.
- Usa clases skeuomorphic existentes e icono de `lucide-react`.

`app/(dashboard)/venta/page.jsx`
- Importe `getCombos` y `getProductosComboStock` desde `src/lib/db/combos.ts`.
- Cargue combos con React Query usando `getCombos(negocioId)`.
- Filtre combos vigentes: `activo = true`, `fecha_inicio <= hoy` si existe y `fecha_fin >= hoy` si existe.
- Agregue una linea especial al carrito con nombre `COMBO: [nombre]`, precio `precio_combo` y `sku` interno `COMBO:[id]`.
- En el cobro normal, detecto lineas de combo por ese `sku`.
- Antes de descontar stock, traigo los productos componentes del combo con `getProductosComboStock`.
- Por cada producto en `combo_productos`, descuento `cantidad_del_combo * cantidad_del_renglon` usando `ajustarStock`.
- Mantengo el ticket como una sola linea `COMBO: [nombre]`; no agrego los productos del combo como renglones visibles.
- Mantengo el flujo normal de productos de precio fijo y productos por peso.

## Decisión: cómo integré los combos al POS (sección o categoría)

Integre los combos como una seccion horizontal "Combos" debajo de `CategoriaTabs` y antes del grid de productos.

Motivo: asi no toque el filtro de categorias ni cambie su logica. Los combos quedan visibles y separados, sin mezclar categorias ni alterar el flujo existente del POS.

## Lo que NO toqué

- No toque fiado.
- No toque WhatsApp.
- No toque el filtro de categorias.
- No toque hardware.
- No toque `configuracion/page`.
- No aplique migraciones.
- No cree nuevas migraciones.
- No toque cambios ajenos en `docs/BUGS_PENDING.md` ni `docs/CHANGELOG.md`.

## Migraciones (solo corrección de archivo 017, NO reaplicada)

- `supabase/migrations/017_combos.sql`: verificada. Ya contiene `update_updated_at()`.
- Estado: PENDIENTE DE APLICAR por el director humano si aun no fue aplicada.
- Acciones de Codex sobre BD: ninguna. No aplique migraciones.

Nota: `docs/reports/_AUDIT_LOG.md` muestra reportes auditados hasta #037, pero esta ronda solicito explicitamente crear el reporte #036; este reporte llena ese numero.

## Bugs detectados fuera de scope

- Persisten warnings preexistentes en `next build`:
  - `app/(dashboard)/registros/page.jsx`: dependencias faltantes `inRange` en varios `useMemo`.
  - `src/components/registros/CortePDF.jsx`, `src/components/registros/ResumenFinancieroPDF.jsx` y `src/components/venta/TicketVenta.jsx`: warnings por uso de `<img>`.
- El worktree contiene cambios ajenos fuera de scope en `docs/BUGS_PENDING.md` y `docs/CHANGELOG.md`; no los toque.

## Estado final

- `npx tsc --noEmit`: exit 0.
- `npm run build`: exit 0.
- Combos vigentes visibles en POS en seccion propia.
- Tap en combo agrega linea `COMBO: [nombre]` al carrito con `precio_combo`.
- Cobro normal descuenta stock de cada producto de `combo_productos` mediante `ajustarStock`.
- Ticket mantiene el combo como un solo renglon.
- Migraciones aplicadas por Codex: ninguna.

## Número de reporte: 036
