# NEXT_STEPS — Estado actual y tareas pendientes

## Estado actual (2026-06-25)

🟡 **Migración y limpieza (Fase 6) completas; quedan bloqueantes y endurecimiento antes del deploy.**

- **Limpieza de dependencias**: removidas `three` (+`@types/three`), `react-leaflet`, `react-quill` y
  `moment` (cero imports verificados). `date-fns` se conserva.
- **Componente huérfano**: eliminado `src/components/common/EnMigracion.tsx`.
- **Triggers de base de datos**: verificados los `updated_at` en las 8 tablas clave (`negocios`,
  `usuarios`, `productos`, `proveedores`, `configuracion_negocio`, `carritos_activos`, `suscripciones`,
  `clientes_fiado`).
- **Features entregadas** (reportes 001–019, auditadas): fix de bugs UI, seguridad (rate limit +
  bucket por `negocio_id`), audit log de cancelación, RLS cajeros, escáner Realtime, imagen de
  producto + alerta de stock, top productos + mayoreo, resumen del día + aviso a proveedor, QR del
  negocio, WhatsApp del ticket, fiado, devoluciones, historial de precios, nombre de cliente + cerrar
  sesión, y **modo offline (SW + IndexedDB) con sincronización transaccional vía RPC**.
- **Compilación**: `tsc --noEmit` y `next build` en verde.

> El detalle técnico de cada pendiente vive en `docs/BUGS_PENDING.md` (fuente de verdad del auditor).
> Esta lista resume lo que falta para producción y enlaza con esos ítems.

---

## 🔴 Bloqueantes de deploy

- [x] **Migración `011` en el repo (repo == BD).** _(RESUELTO 2026-06-25, reporte 020)_ Se agregó
  `supabase/migrations/011_rpc_crear_venta_completa.sql`; su firma coincide con la función desplegada
  (verificado). Disco `001`–`011` == ledger. **Ya no hay bloqueantes críticos de deploy.**

## Preparación de deploy entregada (reporte 020b — codex)

- [x] `vercel.json` (framework nextjs, build/install commands) y `docs/DEPLOYMENT.md` (guía de deploy).
- [x] `next.config.mjs`: `images.remotePatterns` con el dominio de Supabase Storage.
- [x] `.env.example` actualizado con todas las variables y comentarios.

---

## 🟠 Endurecimiento de seguridad (antes de producción)

- [ ] **Rate limiting de `/api/negocio/register` no es global** (Map en memoria, por instancia en
  serverless). Mover a un store compartido (Upstash/Vercel KV).
- [ ] **`npm audit --audit-level=high` falla** por vulnerabilidades en deps (`next`, `glob` vía
  `eslint-config-next`, `postcss`, `react-quill`/`quill` — revisar si el retiro de `react-quill` ya
  redujo esto). Evaluar upgrades.
- [ ] **Escritura del bucket `negocio-assets`**: confirmar que toda escritura quede acotada a la
  carpeta `negocio_id/` (la política se endureció en `005`; validar el caso del logo).
- [ ] **`/api/storage/upload`**: la validación MIME server-side se añadió para `folder=productos`;
  confirmar que también cubra el logo.
- [ ] **Verificación de correo en el registro** (`email_confirm: true` hoy): decisión de producto.
- [ ] **Proceso multi-agente**: aclarar qué credenciales se usaron para aplicar DDL por `psql` (el #015
  aplicó la migración `009` de otro agente). Definir quién aplica migraciones a la BD real.

---

## 🟢 Despliegue en Vercel

- [ ] Configurar el proyecto en Vercel apuntando al repo de GitHub.
- [ ] Variables de entorno de producción (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`,
  `STRIPE_WEBHOOK_SECRET`).
- [ ] Validar que la compilación final en Vercel complete sin problemas de caché/permisos.
- [ ] Nota: el warning benigno de Edge Runtime + `@supabase/ssr` en el middleware es preexistente y no
  bloquea el build.

## Configuración y activación de Stripe

- [ ] Rellenar las credenciales reales de Stripe en el entorno.
- [ ] Probar checkout de suscripción en sandbox.
- [ ] Probar el webhook (valida firma) → actualiza `suscripciones` con eventos firmados.
- [ ] Validar el portal de facturación del cliente.

---

## Features incompletas / pendientes de cerrar (ver BUGS_PENDING.md)

- [ ] **Cancelación de venta persistida**: el endpoint `/api/ventas/cancelar` existe pero **no hay UI**
  que lo consuma; además la operación no es atómica (2 llamadas REST + reversión). Conectar UI y/o
  mover a RPC.
- [ ] **Fiado**: `registrarCargo`/`registrarAbono` no son atómicos (sin RPC); no se valida
  `limite_credito` al vender; falta el botón "Cobrar a fiado" en la barra de carrito móvil.
- [ ] **Nombre real del negocio en el ticket impreso**: `TicketVenta.jsx` aún usa
  `config?.nombre_negocio` (inexistente); el de WhatsApp ya se corrigió. Pasar `negocio.nombre`.
- [ ] **Cobro offline**: siempre `metodo_pago='efectivo'` y sin nombre de cliente (no abre CobroDialog
  sin red). Mejorar si se requiere.
- [ ] **Service Worker** registrado en `/venta`, no en el root layout (cobertura desde la 1ª carga).
- [ ] **Ledger de migraciones**: `003` figura como `003_register_rpc` (vs archivo `003_functions.sql`);
  reconciliar nombre en una ventana controlada.

---

## Pruebas de runtime pendientes (no ejecutadas; todo verificado solo a nivel build/BD)

- [ ] **Flujo de venta en navegador**: efectivo / tarjeta / transferencia / mixto bajo caja abierta.
- [ ] **Modo offline real**: cortar red, vender, reconectar y confirmar el descuento de stock + kardex
  vía el RPC (depende del bloqueante de la migración 011).
- [ ] **Escáner móvil Realtime (cross-device)** y **Vista Cliente en segundo monitor**.
- [ ] **Compra/inventario** suben stock + kardex; **ventas y devoluciones** lo descuentan.
- [ ] **Fiado, QR, historial de precios, resumen del día, nombre de cliente en ticket** en navegador.
- [ ] **Reportes/PDF** (corte de caja, resumen financiero) y **subida de logo**.

<!-- Última actualización: 2026-06-25 — Reconciliado con BUGS_PENDING.md por el auditor (tras reporte 019) -->
