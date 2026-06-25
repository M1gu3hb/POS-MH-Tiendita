# Reporte 010 — claude-code — compartir ticket por WhatsApp

## Tarea recibida

REGLA ABSOLUTA: Haz ÚNICAMENTE lo que el prompt indica. No features extra, no refactor fuera de scope, no cambiar arquitectura, no Supabase directo desde componentes, no cambiar diseño skeuomorphic. Bug crítico fuera de scope: documéntalo y corrígelo.

Archivos permitidos: `app/(dashboard)/venta/page.tsx`, `src/components/venta/TicketVenta.jsx`, `src/utils/whatsapp.ts` (nuevo), `docs/reports/`. No tocar ningún otro archivo.

PASO 0 — Auditoría: leer reporte 007, verificar que `subscribeScanEvents` funciona sin imports rotos; corregir bugs propios previos.

TAREA — Compartir ticket por WhatsApp tras una venta exitosa:
1. `src/utils/whatsapp.ts`: `generarMensajeTicket(venta, items, config) → string` con nombre del negocio (config.nombre o 'Mi Tienda'), folio, fecha/hora, lista de productos (nombre, cantidad, precio unitario, subtotal), total, método de pago, cambio si aplica, mensaje de agradecimiento (config.mensaje_ticket). Texto plano con emojis simples (🛒 📋 💰).
2. `venta/page`: botón "Compartir por WhatsApp" junto a "Imprimir", solo tras venta completada; abre `https://wa.me/?text=[mensaje_codificado]`.
3. `TicketVenta.jsx`: no cambiar diseño; solo exponer los props necesarios.

Verificación: tsc 0, next build 0. Commit + push: "feat: compartir ticket por WhatsApp".

## Auditoría trabajo anterior (resultado)

- Leí `docs/reports/2026-06-24_007_claude-code_escaner-realtime.md`.
- Verifiqué en el código real: `src/lib/db/scan.ts` **exporta** `subscribeScanEvents` (línea 54); `app/(dashboard)/venta/page.jsx` lo **importa y usa** (líneas 14 y 384). `scan.ts` está commiteado limpio → el import roto que dejó `cf9d03c` (otro agente) ya quedó **reparado** por mi commit `e8f9aec`. `tsc --noEmit` exit 0 consistente.
- **Falsa alarma transitoria:** un `next build` intermedio salió en 1 apuntando a `app/(dashboard)/registros/page.jsx` y al dashboard `page.jsx` (**archivos del agente concurrente, no míos**), mientras dicho agente editaba en vuelo `package.json` (añadió `qrcode`/`@types/qrcode`), `configuracion.ts` (`qr_url`) y `TicketVenta.jsx` (QR). Al estabilizarse, `next build` volvió a **exit 0**. **No es bug de mi trabajo anterior**; era ruido por edición concurrente / dependencia recién agregada. No requirió corrección de mi parte.
- Conclusión: sin bugs propios pendientes. Continué con la tarea.

## Lo que hice (archivo por archivo)

**`src/utils/whatsapp.ts`** (NUEVO) — `generarMensajeTicket(venta, items, config): string`:
- Tipado `any`-free con interfaces estructurales mínimas (`TicketItem`, `TicketVentaData`, `TicketConfig`) para desacoplar del esquema y aceptar la forma que ya tiene el POS (`lastVenta`, `lastDetalles`, `config`).
- Construye texto plano legible en WhatsApp con emojis simples **🛒 📋 💰**:
  - `🛒 *<config.nombre || 'Mi Tienda'>*`
  - `📋 Ticket: <folio>`
  - `Fecha: <dd/mm/aaaa hh:mm>` (es-MX)
  - Lista de productos: `• <nombre> x<cantidad> — <precio unitario> c/u = <subtotal>`
  - `💰 *Total: <total>*`
  - `Pago: <método capitalizado>`
  - Si efectivo y cambio > 0: `Recibido:` y `Cambio:`
  - Mensaje de agradecimiento: `config.mensaje_ticket || '¡Gracias por su compra!'`
- Importa `formatMoney` de `@/utils/currency` (mismo formato que el ticket). Sin React, sin Supabase: función pura.

**`app/(dashboard)/venta/page.jsx`** (la página migrada es `.jsx`, no `.tsx`):
- Import `generarMensajeTicket` de `@/utils/whatsapp` e icono `MessageCircle` de `lucide-react`.
- Handler `shareWhatsApp()`: si hay `lastVenta`, arma el mensaje con `generarMensajeTicket(lastVenta, lastDetalles, config)` y abre `https://wa.me/?text=<encodeURIComponent(mensaje)>` con `window.open(..., '_blank', 'noopener,noreferrer')`. (wa.me sin número → móvil abre la app; escritorio abre WhatsApp Web.)
- Botón **"WhatsApp"** (verde marca `#25D366`, icono `MessageCircle`, `title="Compartir por WhatsApp"`) en el header del modal de ticket, **junto a "Imprimir"**. Al estar dentro del bloque `{showTicket && lastVenta && (...)}`, **solo aparece tras una venta completada**, nunca antes.
- No se modificó ninguna otra lógica de la página (cobro, stock, mayoreo, Realtime, BroadcastChannel intactos).

## Lo que NO toqué

- **`src/components/venta/TicketVenta.jsx`**: **sin cambios**. Ya recibe los props `{ venta, detalles, config }` del padre, y el padre (`venta/page.jsx`) ya posee `lastVenta`/`lastDetalles`/`config` (los mismos que pasa al ticket), por lo que construye el mensaje **sin necesitar nada de vuelta del ticket**. No hizo falta exponer props nuevos. Diseño del ticket intacto (regla "no cambies el diseño").
- **Cualquier archivo fuera de los permitidos**: no tocado. El nombre real del negocio (`negocios.nombre`) requeriría `useNegocio`/`useAuth` u otro archivo → fuera de scope (ver bugs).
- **Archivos del agente concurrente** en el working tree (`docs/BUGS_PENDING.md`, `docs/CHANGELOG.md`, `docs/reports/_AUDIT_LOG.md`): excluidos del commit (pathspec acotado).

## Bugs detectados fuera de scope

1. **`config.nombre` no existe en `configuracion_negocio`.** El nombre del negocio vive en `negocios.nombre`, no en `configuracion_negocio` (lo que devuelve `useConfig`/`config`). Por eso `generarMensajeTicket` cae al fallback **'Mi Tienda'** (seguí la firma literal del prompt: `config.nombre o 'Mi Tienda'`). **Es la misma limitación que ya tiene `TicketVenta.jsx`**, que muestra `config?.nombre_negocio || 'Mi Tienda'` (campo también ausente). **No corregido** porque exponer el nombre real exige tocar otros archivos (p. ej. `useNegocio`, ya existente desde el reporte 006) fuera de los permitidos. **Recomendación:** en una tarea con acceso a `venta/page` + datos de negocio, pasar `negocio.nombre` a `generarMensajeTicket` en vez de `config`.
2. **`page.jsx` vs `page.tsx`:** el prompt nombró `app/(dashboard)/venta/page.tsx`, pero la página migrada es `.jsx` (decisión documentada en `docs/DECISIONS.md`). Trabajé sobre el `.jsx` real.
3. **Build transitoriamente rojo por edición concurrente** (ver Auditoría): otro agente agregó `qrcode` a `package.json`; entre su edición y el `npm install`, un build intermedio falló en archivos suyos. Se autorresolvió. No es mío; no lo toqué.

## Estado final

- **`tsc --noEmit`:** exit 0.
- **`next build`:** exit 0 (warning benigno conocido de Edge Runtime + `@supabase/ssr` en middleware, preexistente y documentado en `BUGS_PENDING.md`).
- **Funcionalidad:** tras una venta exitosa, el modal de ticket muestra el botón **WhatsApp** junto a Imprimir; al pulsarlo abre `wa.me` con el ticket en texto plano (negocio, folio, fecha, productos, total, pago, cambio si efectivo, agradecimiento). El botón no existe antes de completar una venta. **Verificación a nivel de código + build**; no se probó el `window.open` en runtime/dispositivo real.
- **No se modificó** arquitectura, diseño skeuomorphic, ni se usó Supabase directo desde componentes (la utilidad es pura).

## Número de reporte: 010
