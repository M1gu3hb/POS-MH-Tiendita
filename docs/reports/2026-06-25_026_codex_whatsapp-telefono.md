## Tarea recibida

Agregar un campo temporal de telefono WhatsApp en el modal de ticket de venta para enviar el ticket a un numero especifico sin guardar ese dato. El campo debe aceptar solo numeros, maximo 10 digitos de Mexico, y el boton WhatsApp debe usar `wa.me/52[numero]?text=...` si hay numero valido o `wa.me/?text=...` si esta vacio.

## Auditoría trabajo anterior

Lei `docs/reports/2026-06-25_023_codex_auditoria-final.md`.

Verifique en el codigo real:
- `app/(dashboard)/venta/page.tsx` no existe; la ruta real del proyecto es `app/(dashboard)/venta/page.jsx`.
- En `app/(dashboard)/venta/page.jsx` existe el boton "WhatsApp" en el modal de ticket.
- `src/utils/whatsapp.ts` contiene `generarMensajeTicket`.

No encontre un bug critico en el Paso 0 que corregir antes de continuar.

## Lo que hice (archivo por archivo)

`src/utils/whatsapp.ts`
- Agregue `construirUrlWhatsApp(mensaje, telefono?)`.
- Si `telefono` tiene 10 digitos, construye `https://wa.me/52${telefono}?text=${encodeURIComponent(mensaje)}`.
- Si no hay telefono valido, mantiene el comportamiento anterior: `https://wa.me/?text=${encodeURIComponent(mensaje)}`.
- No modifique `generarMensajeTicket`.

`app/(dashboard)/venta/page.jsx`
- Actualice el import para usar `construirUrlWhatsApp` junto con `generarMensajeTicket`.
- Agregue estado local `whatsappTelefono`.
- Agregue input `type="tel"` antes del boton WhatsApp en el area del ticket.
- El input usa placeholder `Número WhatsApp (opcional)`, `inputMode="numeric"` y `maxLength={10}`.
- El `onChange` elimina caracteres no numericos y limita el valor a 10 digitos.
- El boton WhatsApp ahora abre la URL generada por `construirUrlWhatsApp(mensaje, whatsappTelefono)`.
- Agregue `closeTicket()` para cerrar el ticket y limpiar `whatsappTelefono`.
- Cambie el cierre por overlay y el boton "Cerrar" para usar `closeTicket()`.

## Lo que NO toqué

- No toque `src/components/venta/TicketVenta.jsx`; no era necesario para esta funcionalidad.
- No toque fiado.
- No toque layout.
- No toque archivos de Claude Code ni cambios ajenos.
- No toque Supabase ni la capa de datos.
- No cambie el diseño general de la pantalla; solo agregue el input en el mismo grupo visual de WhatsApp/Imprimir.

## Bugs detectados fuera de scope

- `npm run build` conserva warnings preexistentes:
  - `app/(dashboard)/registros/page.jsx`: dependencias faltantes de `useMemo` para `inRange`.
  - `src/components/registros/CortePDF.jsx`, `src/components/registros/ResumenFinancieroPDF.jsx` y `src/components/venta/TicketVenta.jsx`: uso de `<img>`.
- El worktree tenia cambios ajenos antes y durante esta ronda en archivos fuera de scope, incluidos `app/(dashboard)/layout.tsx`, `app/globals.css`, `src/components/layout/MobileQuickNav.jsx` y varios docs. No los toque ni los incluire en el commit.

## Estado final

- `npx tsc --noEmit`: exit 0.
- `npm run build` (`next build`): exit 0.
- `_AUDIT_LOG.md` indica ultimo reporte auditado #024; este reporte usa el numero solicitado por el prompt: 026.
- Funcionalidad implementada: numero temporal opcional para WhatsApp en el ticket, sin persistirlo.

## Número de reporte: 026
