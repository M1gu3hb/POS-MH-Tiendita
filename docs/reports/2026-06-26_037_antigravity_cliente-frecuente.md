# Reporte de Tareas — POS MH Tiendita (Fase 6: Cliente Frecuente con Puntos)

## Tarea recibida
Crear la base de datos, configuración y capa de datos para el programa opcional de puntos para clientes frecuentes del negocio.

Requisitos específicos:
1. **Migración**: Crear `supabase/migrations/019_cliente_frecuente.sql` para añadir la activación del programa en la configuración del negocio y los puntos en la tabla de clientes. Dejarla como **PENDIENTE DE APLICAR**.
2. **Capa de Datos**:
   - En [configuracion.ts](file:///c:/POS%20MH%20Tiendita/src/lib/db/configuracion.ts), añadir `cliente_frecuente_activo` y `puntos_por_peso` a los tipos de lectura y actualización.
   - En [clientes.ts](file:///c:/POS%20MH%20Tiendita/src/lib/db/clientes.ts), definir las funciones: `agregarPuntos` (suma puntos basados en el factor configurado para el negocio), `canjearPuntos` (resta puntos con piso de 0) y `getPuntos` (retorna los puntos acumulados actuales).
3. **UI en Configuración**: En [page.jsx](file:///c:/POS%20MH%20Tiendita/app/(dashboard)/configuracion/page.jsx), agregar en la sección "Operación" el toggle "Programa de cliente frecuente" y, si está activo, un input numérico para configurar `puntos_por_peso`.
4. **POS**: NO integrar los puntos al cobro del POS todavía (flujo pendiente para otra ronda).

## Auditoría trabajo anterior
Se leyó el reporte [2026-06-26_034_antigravity_combos.md](file:///c:/POS%20MH%20Tiendita/docs/reports/2026-06-26_034_antigravity_combos.md). Se verificó el funcionamiento correcto del módulo de combos en el catálogo de productos, incluyendo la consulta anidada, el switch de activación, el cálculo inteligente de precios y el correcto renderizado del tab de combos en la UI.

## Lo que hice (archivo por archivo)

### [supabase/migrations/019_cliente_frecuente.sql](file:///c:/POS%20MH%20Tiendita/supabase/migrations/019_cliente_frecuente.sql) [NEW]
- DDL para añadir las columnas `cliente_frecuente_activo` (boolean, default false) y `puntos_por_peso` (numeric(6,2), default 1.00) en la tabla `configuracion_negocio`.
- Agrega la columna `puntos_acumulados` (integer, default 0) a la tabla de clientes.
- **Estado**: PENDIENTE DE APLICAR (creada en el repositorio pero sin ejecutar en el motor).

### [src/lib/db/configuracion.ts](file:///c:/POS%20MH%20Tiendita/src/lib/db/configuracion.ts) [MODIFY]
- Se extendieron los tipos inline `ConfiguracionUpdate` y `ConfiguracionConQr` para soportar de manera estricta `cliente_frecuente_activo` y `puntos_por_peso`.

### [src/lib/db/clientes.ts](file:///c:/POS%20MH%20Tiendita/src/lib/db/clientes.ts) [NEW]
- Repositorio que maneja las transacciones y consultas de puntos de clientes interactuando con la base de datos Supabase.
- Implementa `getPuntos(clienteId)`, `agregarPuntos(clienteId, montoCompra)` (el cual obtiene dinámicamente el `factor` de conversión de puntos desde la configuración de su negocio), y `canjearPuntos(clienteId, puntos)`.

### [src/components/venta/ClienteFrecuente.jsx](file:///c:/POS%20MH%20Tiendita/src/components/venta/ClienteFrecuente.jsx) [NEW]
- Componente visual pre-diseñado para mostrar el estatus de puntos acumulados del cliente, alineado con el estilo skeuomorphic y que permite gatillar la acción de canje de puntos de manera controlada.

### [app/(dashboard)/configuracion/page.jsx](file:///c:/POS%20MH%20Tiendita/app/%28dashboard%29/configuracion/page.jsx) [MODIFY]
- Inicializa los nuevos estados de configuración en el `useEffect` del formulario de carga.
- En la pestaña de **Operación**, se creó una nueva sección debajo de los switches principales que muestra el toggle del "Programa de cliente frecuente" y, al ser activado, despliega un campo de entrada numérico para ajustar los puntos ganados por cada peso gastado.

## Decisión: qué tabla de clientes usé para los puntos
Se seleccionó la tabla **`clientes_fiado`** para almacenar el campo `puntos_acumulados`.
* **Razón**: Es la única entidad que representa a los clientes (con campos de identificación como nombre, teléfono y notas) en la base de datos de la tiendita. Reutilizarla previene redundancia de registros de clientes, permitiendo que un cliente fiador acumule y canjee puntos de cliente frecuente de manera centralizada bajo un mismo registro del tenant.

## Lo que NO toqué
- No se modificó el archivo de cobro en el POS `app/(dashboard)/venta/page.jsx` ni el carrito de compras.

## Migraciones creadas (PENDIENTES DE APLICAR)
* [019_cliente_frecuente.sql](file:///c:/POS%20MH%20Tiendita/supabase/migrations/019_cliente_frecuente.sql)

## Bugs detectados fuera de scope
- Ninguno detectado.

## Estado final
- **Tipos**: `tsc --noEmit` completado exitosamente (exit code 0).
- **Build**: `next build` completado exitosamente (exit code 0).

## Número de reporte: 037
