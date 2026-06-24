## Tarea recibida

Implementar audit log server-side para cancelacion de ventas: crear `POST /api/ventas/cancelar`, validar sesion, validar negocio, cancelar la venta, registrar `audit_log`, conectar la UI si existia una llamada directa a BD, no tocar otros archivos, y terminar con commit + push.

## Lo que hice (archivo por archivo)

`app/api/ventas/cancelar/route.ts`
- Cree el endpoint `POST /api/ventas/cancelar`.
- Valida body `{ venta_id, motivo }` con `zod`.
- Valida sesion y perfil de negocio con `getServerAuthContext()`, que usa el cliente server de Supabase.
- Verifica que la venta exista y pertenezca al `negocio_id` del usuario.
- Actualiza la venta a `estado = 'cancelada'` y guarda `motivo_cancelacion`.
- Registra `audit_log` con `logAudit()` usando:
  - `accion: 'cancelar_venta'`
  - `entidad: 'ventas'`
  - `entidad_id: venta_id`
  - `payload: { motivo, venta_total, cajero_nombre }`
  - `usuario_id` y `negocio_id`
- Si falla `audit_log`, intenta revertir la venta a su `estado` y `motivo_cancelacion` previos.

`docs/reports/2026-06-24_003_codex_audit-log-cancelacion.md`
- Cree este reporte con el alcance, cambios, no-cambios, bugs fuera de scope y estado final.

## Lo que NO toque

- No toque `supabase/migrations/`.
- No toque `src/lib/db/audit.ts`.
- No toque `src/lib/db/ventas.ts`.
- No toque componentes ni estilos.
- No toque arquitectura, stack ni configuracion.
- No toque cambios previos no relacionados que ya estaban en el worktree.

## Bugs detectados fuera de scope

- No encontre una UI que cancele una venta ya persistida con `venta_id`. El boton `Cancelar` de `app/(dashboard)/venta/page.jsx` solo limpia el carrito activo antes de cobrar; no existe una venta en BD que mandar al endpoint.
- La transaccion SQL real update venta + insert audit no se puede implementar solo con Supabase REST en dos llamadas separadas. Para atomicidad estricta se requiere una RPC SQL/migracion o una conexion directa a Postgres, pero tocar `supabase/migrations/` no estaba autorizado. El endpoint implementa reversión compensatoria si falla `audit_log`.
- `npm audit --audit-level=high` reporta vulnerabilidades existentes en dependencias (`next`, `glob` via `eslint-config-next`, `postcss`, `react-quill/quill`). El fix sugerido por npm requiere cambios mayores/breaking changes, fuera del scope de este prompt.

## Estado final

Endpoint server-side creado para cancelar ventas persistidas y escribir auditoria. La UI no fue modificada porque no existe llamada directa a BD para cancelar una venta persistida en el flujo actual. `npm run lint` y `npm run typecheck` pasan; `npm audit --audit-level=high` falla por dependencias existentes fuera de scope.

## Número de reporte: 003
