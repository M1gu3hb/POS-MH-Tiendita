# Reporte de Tareas — POS MH Tiendita (Fase 6: Gestión de Combos y Promociones)

## Tarea recibida
Desarrollar la interfaz y capa de datos para la gestión y creación de combos/promociones con precio sugerido.

Requisitos específicos:
1. **Migración**: Crear `supabase/migrations/017_combos.sql` (mantener como **PENDIENTE DE APLICAR**).
2. **Capa de Datos**: Crear [combos.ts](file:///c:/POS%20MH%20Tiendita/src/lib/db/combos.ts) con las funciones `getCombos`, `crearCombo`, `actualizarCombo`, `eliminarCombo` y `toggleCombo`. Todo a través del repositorio, sin Supabase directo en componentes.
3. **Pestaña en Productos**: En [page.jsx](file:///c:/POS%20MH%20Tiendita/app/(dashboard)/productos/page.jsx), añadir el tab "Combos" junto a la lista existente y renderizar `<CombosManager />`.
4. **ComboDialog**: Crear [ComboDialog.jsx](file:///c:/POS%20MH%20Tiendita/src/components/productos/ComboDialog.jsx) con campos para nombre, buscador e inserción de productos, cálculo dinámico inteligente de precio regular sumado y sugerencia automática con 15% de descuento, precio final, fechas de vigencia y guardado.

## Auditoría trabajo anterior
Se leyó el reporte [2026-06-26_031_antigravity_categorias-pos.md](file:///c:/POS%20MH%20Tiendita/docs/reports/2026-06-26_031_antigravity_categorias-pos.md). Se verificó en el código de producción que los botones de categoría funcionan adecuadamente y filtran tanto la cuadrícula de productos en el POS como las sugerencias del buscador de texto, sin interferir con el flujo de carrito ni fiado.

## Lo que hice (archivo por archivo)

### [supabase/migrations/017_combos.sql](file:///c:/POS%20MH%20Tiendita/supabase/migrations/017_combos.sql) [NEW]
- Archivo SQL con la creación de las tablas `combos` y `combo_productos`.
- RLS habilitado y políticas configuradas para restringir el acceso por `negocio_id = get_negocio_id()`.
- Trigger configurado con la función existente `update_updated_at()`.
- **Estado**: PENDIENTE DE APLICAR (no se ejecutó en la base de datos remota ya que no se poseen credenciales directas).

### [src/lib/db/combos.ts](file:///c:/POS%20MH%20Tiendita/src/lib/db/combos.ts) [NEW]
- Capa de datos en TypeScript para el manejo de la base de datos Supabase.
- Contiene los métodos para obtener combos con sus productos de manera anidada, crear combos (e insertar sus relaciones hijas controlando errores para evitar huérfanos), actualizar combos (eliminando e insertando nuevamente los productos), eliminar combos y cambiar su estado de activo.

### [src/components/productos/ComboDialog.jsx](file:///c:/POS%20MH%20Tiendita/src/components/productos/ComboDialog.jsx) [NEW]
- Modal para la creación/edición de combos y promociones.
- Cuenta con un buscador dinámico de productos en tiempo real, sumatoria de precios normales y descuento sugerido del 15% calculado en el cliente.
- Permite definir el precio final y las fechas de vigencia.

### [src/components/productos/CombosManager.jsx](file:///c:/POS%20MH%20Tiendita/src/components/productos/CombosManager.jsx) [NEW]
- Componente que gestiona el listado de combos del negocio.
- Renderiza las tarjetas de combos detallando: nombre, vigencia, productos incluidos, precio del combo, ahorro total del cliente y un switch de estado.
- Dispara las mutaciones correspondientes e invalida la query `['combos-all']`.

### [app/(dashboard)/productos/page.jsx](file:///c:/POS%20MH%20Tiendita/app/%28dashboard%29/productos/page.jsx) [MODIFY]
- Se importó `CombosManager`.
- Se implementó el estado `activeTab` y un tab switcher debajo de la cabecera.
- Se condicionó el contenido para mostrar el catálogo tradicional o el panel de combos.

## Lo que NO toqué
- No se modificó el componente `BuscadorProducto.jsx` ni ningún archivo de venta en el POS (como `venta/page.jsx`), respetando la restricción de scope.

## Migraciones creadas (PENDIENTES DE APLICAR)
* [017_combos.sql](file:///c:/POS%20MH%20Tiendita/supabase/migrations/017_combos.sql)

## Bugs detectados fuera de scope
- Ninguno detectado. La compilación y el comportamiento del tab switcher en productos responden con normalidad.

## Estado final
- **Tipos**: `tsc --noEmit` completado exitosamente (exit code 0).
- **Build**: `next build` completado exitosamente (exit code 0).

## Número de reporte: 034
