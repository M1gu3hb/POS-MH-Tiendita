# NEXT_STEPS — Estado actual y tareas pendientes

## Estado actual (2026-06-25)

🟢 **Migración y limpieza (Fase 6) completas.**

- **Limpieza de dependencias**: Se removieron dependencias pesadas sin uso (`three`, `react-leaflet`, `react-quill`, `moment`) y `@types/three` de `package.json`, liberando espacio y reduciendo vulnerabilidades.
- **Componente huérfano**: Se eliminó `src/components/common/EnMigracion.tsx` ya que todas las páginas del sistema han sido portadas exitosamente y no tenía dependencias activas.
- **Triggers de base de datos**: Se verificaron y confirmaron los triggers automáticos de `updated_at` para todas las 8 tablas requeridas: `negocios`, `usuarios`, `productos`, `proveedores`, `configuracion_negocio`, `carritos_activos`, `suscripciones` y `clientes_fiado`.
- **Compilación en verde**: `tsc --noEmit` y `next build` resuelven sin errores de compilación de forma exitosa.

---

## Pendientes para Producción

### 1. Despliegue en Vercel
- [ ] Configurar proyecto en Vercel apuntando al repositorio de GitHub.
- [ ] Configurar variables de entorno de producción en Vercel (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`).
- [ ] Validar que la compilación y optimización final en Vercel completen sin problemas de caché o permisos.

### 2. Configuración y Activación de Stripe
- [ ] Reemplazar las credenciales vacías en el entorno local/producción con las llaves reales de Stripe.
- [ ] Probar el flujo de checkout de suscripción en modo sandbox.
- [ ] Probar el webhook de Stripe para confirmar la correcta actualización de suscripciones en la tabla `suscripciones` al procesar eventos firmados.
- [ ] Validar el portal de facturación del cliente de Stripe.

### 3. Pruebas de Runtime Pendientes
- [ ] **Escáner Móvil Realtime (Cross-Device)**: Verificar en dispositivos físicos móviles y computadoras en paralelo que los escaneos de código de barras alimenten el carrito de venta de escritorio mediante el canal de Supabase Realtime.
- [ ] **Vista Cliente de Segundo Monitor**: Probar el comportamiento de transmisión del carrito en vivo a través de BroadcastChannel o Realtime en dos pantallas independientes.
- [ ] **Corte rápido y Resúmenes**: Simular ventas en efectivo, tarjeta y transferencia bajo una caja abierta y validar el desglose del Dialog "Resumen de hoy" del dueño.
- [ ] **Kardex y Stock**: Validar que la compra de mercancía e inventario incrementen stock de forma correcta, y las ventas y devoluciones lo descuenten.

<!-- Última actualización: 2026-06-25 — Limpieza Fase 6 y preparación para deploy -->
