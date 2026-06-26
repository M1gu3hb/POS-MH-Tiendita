# Reporte de Tareas — POS MH Tiendita (Fase 6: Onboarding Tutorial)

## Tarea recibida
Desarrollar un tutorial de onboarding interactivo y modal para usuarios nuevos, guiándolos en 4 pasos simples y visuales a través de las operaciones esenciales (Bienvenida, Agregar Productos, Abrir Caja, Primera Venta).

Requisitos específicos:
1. **Migration**: Crear `supabase/migrations/013_onboarding.sql` agregando `onboarding_completado` a `configuracion_negocio`. Aplicar a la base de datos remota del proyecto y registrar la migración en la tabla `schema_migrations`.
2. **Capa de Datos**: Añadir el nuevo campo a los tipos y a las funciones `getConfiguracion` y `updateConfiguracion` en [configuracion.ts](file:///c:/POS%20MH%20Tiendita/src/lib/db/configuracion.ts).
3. **Hook**: Crear el hook de React [useOnboarding.js](file:///c:/POS%20MH%20Tiendita/src/hooks/useOnboarding.js) para controlar el estado del tutorial, pasos, navegación y llamada para guardar la finalización.
4. **Componente de UI**: Crear [OnboardingTutorial.jsx](file:///c:/POS%20MH%20Tiendita/src/components/onboarding/OnboardingTutorial.jsx) con fondo oscuro de backdrop, estilo skeuomorphic, indicadores de pasos, iconos de lucide y navegación/comportamiento correcto para cada paso.
5. **Integración**: Integrar el componente en [layout.tsx](file:///c:/POS%20MH%20Tiendita/app/(dashboard)/layout.tsx) para que se renderice condicionalmente al final del árbol.

## Auditoría trabajo anterior
Se leyó el reporte [2026-06-25_027_antigravity_mobile-ux.md](file:///c:/POS%20MH%20Tiendita/docs/reports/2026-06-25_027_antigravity_mobile-ux.md). Se verificó el funcionamiento correcto del navbar inferior móvil y el drawer en dispositivos móviles de menos de 768px, sin encontrar regresiones ni bugs.

## Lo que hice (archivo por archivo)

### [supabase/migrations/013_onboarding.sql](file:///c:/POS%20MH%20Tiendita/supabase/migrations/013_onboarding.sql) [NEW]
- Archivo de migración SQL para agregar la columna `onboarding_completado` con valor predeterminado `false` y restricción `NOT NULL` a la tabla `configuracion_negocio`.
- Nota: Esta migración ya se aplicó a la base de datos remota (`lisjbutidntalmobgjso`) y fue registrada en el historial de migraciones (`schema_migrations`) en el paso previo.

### [src/lib/db/configuracion.ts](file:///c:/POS%20MH%20Tiendita/src/lib/db/configuracion.ts) [MODIFY]
- Se extendieron los tipos locales `ConfiguracionUpdate` y `ConfiguracionConQr` para soportar la propiedad `onboarding_completado: boolean` sin alterar el archivo global de tipos.
- Se actualizaron las funciones `getConfiguracion` y `updateConfiguracion` para que el tipado de retorno refleje la nueva propiedad.

### [src/hooks/useOnboarding.js](file:///c:/POS%20MH%20Tiendita/src/hooks/useOnboarding.js) [NEW]
- Hook personalizado de React para coordinar el tutorial de onboarding.
- Lee la configuración del negocio del hook `useConfig`. Si `isLoading` es false, hay un `negocioId` y `config.onboarding_completado` es explícitamente `false`, establece `mostrarTutorial` en `true`.
- Proporciona una función `completarOnboarding` que guarda en la base de datos el valor `{ onboarding_completado: true }` a través de `updateConfiguracion` e invalida la consulta en React Query para sincronizar el estado global.
- Maneja el paso activo (`pasoActual`), con funciones `siguientePaso` y `anteriorPaso` para transicionar de forma segura.

### [src/components/onboarding/OnboardingTutorial.jsx](file:///c:/POS%20MH%20Tiendita/src/components/onboarding/OnboardingTutorial.jsx) [NEW]
- Componente modal overlay interactivo estilizado con el tema skeuomórfico del proyecto (mediante clases `skeu-panel`, `skeu-input`, `skeu-btn-primary` y `skeu-btn-ghost`).
- Muestra de forma secuencial los 4 pasos solicitados con indicadores visuales de progreso (puntos):
  - **Paso 1 (Bienvenida)**: Icono `Store`, introducción y botón para iniciar.
  - **Paso 2 (Agregar productos)**: Icono `Package`, instrucciones, botón para ir a `/productos` (y avanzar de paso) o botón skip "Lo hago después" (solo avanza).
  - **Paso 3 (Abrir caja)**: Icono `DollarSign`, instrucciones, botón para ir a `/caja` (y avanzar de paso) o botón skip "Lo hago después" (solo avanza).
  - **Paso 4 (Primera venta)**: Icono `ShoppingCart`, instrucciones, botón para ir a `/venta` (y cerrar tutorial) o botón secundario "Explorar solo" (cierra tutorial sin navegar).
- Añadido un botón "X" en la parte superior derecha para cerrar el tutorial guardando el estado completado en la BD en cualquier momento.

### [app/(dashboard)/layout.tsx](file:///c:/POS%20MH%20Tiendita/app/(dashboard)/layout.tsx) [MODIFY]
- Se importaron `useOnboarding` y `OnboardingTutorial`.
- Se llamó al hook `useOnboarding` para extraer la variable reactiva `mostrarTutorial`.
- Se renderiza el componente `<OnboardingTutorial />` condicionalmente al final del árbol de componentes del layout, de modo que no interfiera con el flujo principal del navbar ni del contenido.

## Lo que NO toqué
- No se modificaron componentes críticos del carrito ni de las páginas operativas como `app/(dashboard)/venta/page.tsx` o `app/(dashboard)/fiado/page.tsx`.
- No se alteró ningún archivo fuera de la lista exclusiva de la ronda.

## Bugs detectados fuera de scope
- Ninguno detectado. El navbar móvil funciona sin inconvenientes y responde correctamente al drawer deslizante lateral.

## Estado final
- **Tipos**: `tsc --noEmit` completado de forma exitosa (exit code 0).
- **Build**: `next build` completado exitosamente sin errores de compilación (exit code 0).
- **Base de Datos**: Migración `013_onboarding` aplicada y registrada.

## Número de reporte: 029
