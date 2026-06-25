## Tarea recibida

Agregar nombre opcional de cliente en el cobro/ticket sin crear columnas nuevas, guardandolo en `ventas.notas` con prefijo `Cliente: `. Agregar boton "Cerrar sesion" visible al final de Cuenta, separado con divider, usando el cierre de sesion existente.

## Auditoría trabajo anterior (resultado)

Lei `docs/reports/2026-06-25_014_codex_devoluciones.md`.

Verifique en codigo real:
- `app/api/devoluciones/route.ts` existe y contiene `POST`.
- `app/(dashboard)/registros/page.jsx` contiene el boton "Devolver".
- El dialog de devolucion contiene lista de productos, checkbox por producto, cantidad a devolver, tipo de devolucion, motivo y regreso a inventario.

No encontre bug critico del trabajo anterior que corregir.

## Lo que hice (archivo por archivo)

`src/components/venta/CobroDialog.jsx`
- Agregue campo opcional "Nombre del cliente".
- Use placeholder `Opcional — para el ticket`.
- Al confirmar cobro, si hay nombre, envio `notas: "Cliente: [nombre]"` en los datos de venta. No envio `nombre_cliente` como columna para no romper el insert en `ventas`.

`src/components/venta/TicketVenta.jsx`
- Agregue lectura de cliente desde `venta.nombre_cliente` si existe.
- Tambien leo `venta.notas` cuando empieza con `Cliente: `, que es el flujo actual sin columna nueva.
- Si hay cliente, muestro `Cliente: [nombre]` debajo del cajero.
- Si no hay cliente, no renderizo nada.

`app/(dashboard)/cuenta/page.jsx`
- El archivo solicitado como `page.tsx` no existe; la ruta real es `page.jsx`.
- Use `signOut` existente de `useAuth`, sin tocar `AuthContext.tsx`.
- Movi el bloque de cierre de sesion al final de la pagina.
- Agregue divider con `border-t border-border`.
- Use `Button variant="destructive"` para el boton rojo "Cerrar sesion".

## Lo que NO toqué

No toque `app/(dashboard)/venta/page.jsx`.

No toque `src/lib/auth/AuthContext.tsx` porque `signOut` ya estaba expuesto.

No toque migrations, devoluciones, fiado, layout, docs generales ni ningun archivo fuera del scope de esta ronda.

## Bugs detectados fuera de scope

`npm audit --audit-level=high` sigue fallando por vulnerabilidades existentes en `next`, `eslint-config-next`/`glob` y `postcss`; la correccion requiere upgrades mayores fuera de scope.

`npm run lint` mantiene warnings existentes de dependencias de hooks en Registros y uso de `<img>` en componentes de PDF/ticket.

El worktree tenia cambios ajenos antes de esta tarea, incluido un borrado staged de `src/components/common/EnMigracion.tsx`; no lo toque.

## Estado final

`npx tsc --noEmit`: exit 0.

`npm run lint`: exit 0 con warnings existentes.

`npm run build`: exit 0.

Nombre de cliente: se captura en CobroDialog, se guarda en `ventas.notas` con prefijo `Cliente: ` y se muestra en TicketVenta.

Cerrar sesion: visible al final de Cuenta, con divider y boton destructivo.

## Número de reporte: 017
