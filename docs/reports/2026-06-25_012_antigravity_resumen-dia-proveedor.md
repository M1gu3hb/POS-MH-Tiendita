# Reporte de Tareas — POS MH Tiendita

## Tarea recibida
1. **Corte rápido del día en Dashboard**:
   - Agregar función `getResumenHoy(negocioId)` en `src/lib/db/ventas.ts` filtrando ventas con `fecha >=` inicio del día de hoy y `estado = 'pagada'`.
   - Mostrar el botón "📊 Resumen de hoy" en el dashboard solo para el rol `'dueno'`.
   - Al hacer clic, abrir un Dialog que muestre: total vendido, número de tickets, utilidad bruta y desglose de formas de pago.
2. **Recordatorio de pedido a proveedor**:
   - Agregar función `getProductosStockBajo(negocioId)` en `src/lib/db/productos.ts` realizando left join con `proveedores` para obtener `proveedor_nombre` de los productos activos en stock bajo (`stock_actual <= stock_minimo`).
   - Agrupar por proveedor y si un proveedor tiene $\ge 3$ productos en stock bajo, mostrar un banner de advertencia expandible arriba de las StatCards en el Dashboard.

## Auditoría trabajo anterior (resultado)
- Se auditó el reporte `009` (`docs/reports/2026-06-24_009_antigravity_top-productos-mayoreo.md`).
- Se verificó en el código de producción que `getTopProductos` está correctamente implementado en `src/lib/db/ventas.ts`.
- Se verificó que el badge visual animado `MAYOREO` está correctamente implementado en `src/components/venta/CarritoVenta.jsx` al lado de los precios unitarios.
- No se encontraron bugs o inconsistencias en la implementación previa.

## Lo que hice (archivo por archivo)

### `src/lib/db/ventas.ts` [MODIFY]
- Se agregó la interfaz `ResumenHoy` y la función `getResumenHoy(negocioId)`.
- Se filtra por `negocio_id`, `estado = 'pagada'` y `fecha >=` inicio del día de hoy en formato ISO (calculando el medianoche local y convirtiéndolo a ISO).
- Sumariza en memoria los campos financieros para evitar subconsultas repetitivas.

### `src/lib/db/productos.ts` [MODIFY]
- Se agregó la interfaz `ProductoStockBajo` y la función `getProductosStockBajo(negocioId)`.
- Se seleccionan campos específicos y se utiliza la relación `.returns<DBProductoConProveedor[]>()` para realizar el mapeo de proveedores de manera limpia y tipada en TypeScript.
- Filtra por productos activos con `stock_actual <= stock_minimo`, ordenando por proveedor y luego por nombre.

### `app/(dashboard)/page.jsx` [MODIFY]
- Se importaron `useState`, `Button`, `Dialog`, `getResumenHoy` y `getProductosStockBajo`.
- Se agregaron las consultas `useQuery` de TanStack y se agruparon en memoria los productos de stock bajo por proveedor (o `'Sin proveedor asignado'`).
- Se insertaron los banners de advertencia expandibles de proveedores con $\ge 3$ productos en stock bajo arriba de las StatCards.
- Se agregó el botón `"📊 Resumen de hoy"` restringido al rol `'dueno'`.
- Se implementó el modal Dialog para renderizar los acumulados financieros y el desglose de métodos de pago utilizando estilos skeuomórficos y componentes existentes.

## Lo que NO toqué
- No se modificó `app/(dashboard)/venta/page.jsx` ni `configuracion/page.jsx`.
- No se alteró ningún archivo fuera de la lista exclusiva (`app/(dashboard)/page.jsx`, `src/lib/db/ventas.ts`, `src/lib/db/productos.ts`).
- No se cambió la arquitectura del proyecto, todas las consultas a la base de datos se mantuvieron a través de la capa de datos en `src/lib/db/*`.
- No se alteró el diseño skeuomórfico del POS.

## Bugs detectados fuera de scope
- Se detectó un error recurrente de empaquetado en Next.js (`ENOENT: no such file or directory, rename ... 500.html`) debido a bloqueos de archivos causados por procesos Webpack/Next en caché. Se solucionó eliminando de forma recursiva y forzada el directorio `.next/` antes de ejecutar la compilación.

## Estado final
- **Verificación de tipos**: `tsc --noEmit` completado de forma **exitosa** (exit code 0).
- **Compilación**: `next build` compilado al **100% de manera exitosa** (exit code 0).

## Número de reporte: 012
