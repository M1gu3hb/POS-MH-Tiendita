## Tarea recibida

Implementar devoluciones simples con:
- Migracion `009_devoluciones.sql` para tablas `devoluciones` y `detalle_devoluciones`.
- API `POST /api/devoluciones`.
- Repositorio `src/lib/db/devoluciones.ts`.
- Boton "Devolver" en la lista de ventas pagadas de Registros.
- Dialog para seleccionar productos, cantidades, tipo de devolucion, motivo y regreso a inventario.

## Auditoría trabajo anterior + estado migration 007

Lei `docs/reports/2026-06-25_011_codex_qr-configuracion-ticket.md`.

Verifique en codigo real que:
- `src/lib/db/configuracion.ts` contiene soporte de `qr_url`.
- `app/(dashboard)/configuracion/page.jsx` genera y muestra el QR de configuracion con `qrcode`.
- `src/components/venta/TicketVenta.jsx` muestra QR al final del ticket cuando existe `config.qr_url`.

Verifique la BD remota con service role: `configuracion_negocio.qr_url` existe. La migration 007 ya esta aplicada.

No encontre bug critico del trabajo anterior que corrigiera.

## Lo que hice (archivo por archivo)

`supabase/migrations/009_devoluciones.sql`
- Cree la migracion solicitada con las tablas `devoluciones` y `detalle_devoluciones`.
- Active RLS en ambas tablas.
- Agregue las policies `dev_select`, `dev_insert`, `det_dev_select`, `det_dev_insert`.

`src/lib/db/devoluciones.ts`
- Cree los tipos locales de devolucion.
- Agregue `getDevoluciones(negocioId)`.
- Agregue `getDevolucionesByVenta(ventaId)`.
- Agregue `procesarDevolucion(data)`, que llama `POST /api/devoluciones`.

`app/api/devoluciones/route.ts`
- Cree el endpoint POST.
- Valida sesion y `negocio_id` con el contexto server-side.
- Verifica que la venta pertenece al negocio y esta en estado `pagada`.
- Calcula `monto_devuelto`.
- Inserta `devoluciones` y `detalle_devoluciones`.
- Si corresponde, suma stock en `productos` e inserta `movimientos_inventario` con tipo `devolucion`.
- Escribe `audit_log` con accion `devolucion`, entidad `ventas`, `entidad_id` de la venta y payload `{ motivo, monto_devuelto }`.

`app/(dashboard)/registros/page.jsx`
- El archivo solicitado como `page.tsx` no existe; la ruta real del proyecto es `page.jsx`.
- Agregue boton "Devolver" solo para ventas con estado `pagada`.
- Agregue Dialog con lista de productos, checkbox por producto, cantidad a devolver, tipo de devolucion, motivo requerido, checkbox de regreso a inventario y confirmacion del monto devuelto.

## Lo que NO toqué

No toque `app/(dashboard)/venta/page.jsx`.

No toque `src/components/venta/TicketVenta.jsx`.

No toque archivos de fiado, layout, whatsapp ni docs generales que aparecen modificados por trabajo concurrente de otra IA en el mismo workspace.

No cambie el diseno visual skeuomorphic ni la arquitectura general.

## Bugs detectados fuera de scope

La migracion 009 no se pudo aplicar remotamente desde este entorno. No hay `SUPABASE_ACCESS_TOKEN`, no hay `supabase/config.toml` y no hay URL Postgres en `.env.local`. `npx supabase link --project-ref lisjbutidntalmobgjso --yes` falla con `LegacyPlatformAuthRequiredError`.

La verificacion remota confirma que `devoluciones` no existe todavia: `PGRST205 Could not find the table 'public.devoluciones' in the schema cache`.

`npm audit --audit-level=high` falla por vulnerabilidades existentes en `next`, `eslint-config-next`/`glob` y `react-quill`/`quill`; corregirlas requiere upgrades mayores fuera de scope.

`npm run lint` conserva warnings existentes de dependencias de hooks en Registros y uso de `<img>` en PDF/ticket.

Durante `next build` quedaron procesos huérfanos de build que provocaban errores de manifiestos faltantes en `.next`. Los detuve, limpie `.next` y el build limpio paso.

## Estado final (migrations aplicadas, build verde)

Migration 007: aplicada y verificada en BD remota.

Migration 009: archivo creado, pero NO aplicada a BD remota por falta de credenciales/conexion para DDL.

`npx tsc --noEmit`: exit 0.

`npm run lint`: exit 0 con warnings existentes.

`npm run build`: exit 0 despues de limpiar `.next` y detener procesos huérfanos de build.

API/UI de devoluciones: compila y queda conectada desde Registros hacia `POST /api/devoluciones`.

## Número de reporte: 014
