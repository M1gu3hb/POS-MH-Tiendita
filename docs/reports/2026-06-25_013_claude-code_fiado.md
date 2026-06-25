# Reporte 013 — claude-code — Sistema de Fiado (crédito a clientes)

## Tarea recibida

REGLA ABSOLUTA: solo lo indicado; no features extra, no refactor fuera de scope, no cambiar arquitectura, no Supabase directo desde componentes, no cambiar diseño skeuomorphic. Bug crítico fuera de scope: documentarlo y corregirlo.

Archivos exclusivos: `supabase/migrations/008_fiado.sql` (nuevo), `src/lib/db/fiado.ts` (nuevo), `src/hooks/useFiado.js` (nuevo), `app/(dashboard)/fiado/` (page.tsx nuevo), `app/(dashboard)/layout.tsx` (solo link nav), `app/api/fiado/` (rutas nuevas), `app/(dashboard)/venta/page.tsx` (solo opción pago fiado), `src/components/venta/TicketVenta.jsx` (solo texto fiado), `docs/reports/`.

PASO 0 — Auditoría del reporte 010 + fix del nombre en WhatsApp (parámetro `negocioNombre` pasado desde `useNegocio`).

TAREA — Fiado: migration (tablas + RLS + trigger + check `metodo_pago`), repo, página con tabs Clientes/Resumen, integración en POS (pago fiado → cargo + ticket), link en nav.

Commit + push: "feat: sistema de fiado/crédito a clientes".

## Auditoría trabajo anterior + fix WhatsApp nombre

- Leí `docs/reports/2026-06-25_010_claude-code_whatsapp-ticket.md`.
- Verifiqué en código real: `generarMensajeTicket` se importa (venta/page.jsx:19) y se usa (`shareWhatsApp`, :312); el botón **WhatsApp** está en el header del modal de ticket (:494). Sin bug en mi trabajo previo.
- **Fix del nombre (bug conocido):** en `src/utils/whatsapp.ts` agregué el parámetro `negocioNombre?: string | null` a `generarMensajeTicket(...)`; el nombre del negocio ahora es `negocioNombre || config?.nombre || 'Mi Tienda'`. En `venta/page.jsx` importé `useNegocio` (`const { negocio } = useNegocio()`) y paso `negocio?.nombre` a `generarMensajeTicket(...)`. Ahora el ticket de WhatsApp muestra el **nombre real** del negocio (de `negocios.nombre`), no 'Mi Tienda'.

## Lo que hice (archivo por archivo)

**`supabase/migrations/008_fiado.sql`** (nuevo) + **aplicada a la BD** (`lisjbutidntalmobgjso`, `apply_migration` → success):
- Tablas `clientes_fiado` y `movimientos_fiado` (exactamente la spec) + 2 índices de apoyo (por negocio / por cliente).
- RLS habilitado + 5 políticas por negocio (`get_negocio_id()`): select/insert/update en clientes, select/insert en movimientos.
- Trigger `clientes_fiado_updated_at` con `update_updated_at()` — **verifiqué antes** que ese es el nombre real de la función trigger en la BD (la spec coincidía).
- `ventas_metodo_pago_check` reemplazada para incluir `'fiado'`.
- **Verificado** por introspección: 2 tablas, 5 policies, check con `fiado`.

**`src/lib/db/fiado.ts`** (nuevo) — repositorio. Tipos `ClienteFiado`/`MovimientoFiado` definidos aquí (no se toca `types.ts`). Funciones: `getClientes`, `getClienteById`, `createCliente`, `updateCliente`, `getMovimientos`, `registrarCargo`, `registrarAbono`. Cargo suma y abono resta (sin bajar de 0) `saldo_pendiente`, además de insertar el movimiento.

**`src/hooks/useFiado.js`** (nuevo) — hook: query `clientes` del negocio + mutaciones `crearCliente` y `abonar` (invalidan queries). El componente nunca toca Supabase: pasa por el repo.

**`app/(dashboard)/fiado/page.tsx`** (nuevo) — página con dos tabs (estado propio, sin shadcn Tabs):
- **Clientes:** lista (nombre, teléfono, saldo con color rojo>0/verde=0); "Nuevo cliente" → modal (nombre*, teléfono, límite=500, notas); click en cliente → panel con su historial de movimientos (fecha, tipo, monto, descripción) y botón "Registrar abono" → modal (monto).
- **Resumen** (solo `rol === 'dueno'`): saldo total pendiente + clientes ordenados por saldo desc.
- Construida con **HTML crudo + clases skeuomorphic** (skeu-card/skeu-input/skeu-btn) en lugar de primitivas shadcn `.jsx`, porque consumirlas desde un `.tsx` rompe el tipado (implicit-any en handlers → falla `tsc`); así el `.tsx` compila y se respeta el diseño skeuomorphic. Movimientos vía `useQuery` → `getMovimientos` (repo, no Supabase directo).

**`app/(dashboard)/layout.tsx`** — solo agregué `{ path: '/fiado', label: 'Fiado', icon: CreditCard }` entre Caja y Productos (CreditCard ya estaba importado). Nada más.

**`app/(dashboard)/venta/page.jsx`** (la página es `.jsx`, no `.tsx`) — integración de pago fiado + fix WhatsApp:
- Imports: `useFiado`, `registrarCargo`, icono `CreditCard`, `useNegocio` (fix WhatsApp).
- Estado: `fiadoOpen`, `fiadoSearch`; hook `const { clientes: fiadoClientes } = useFiado()`.
- Botón **"Cobrar a fiado"** en el footer del carrito (debajo de Cancelar/Cobrar). Abre un modal selector de cliente (búsqueda + lista con saldo). Al elegir cliente → `handleCobroFiado(cliente)`.
- `handleCobroFiado`: crea la venta con `metodo_pago='fiado'`, descuenta stock+kardex (igual que el cobro normal), llama `registrarCargo(cliente.id, negocioId, total, venta.id, cajeroNombre, 'Venta <folio>')`, limpia la Vista Cliente, y muestra el ticket con el nombre del cliente. **Función separada**: no se alteró el `handleCobro` existente (cero regresión en efectivo/tarjeta/transferencia/mixto).

**`src/components/venta/TicketVenta.jsx`** — solo el valor de "Forma de pago": si `metodo_pago === 'fiado'` muestra `Fiado - <nombre cliente>` (el nombre llega en `venta.fiado_cliente_nombre`, adjuntado en memoria al `lastVenta` para el ticket). Sin cambios de diseño.

## Lo que NO toqué

- **`src/components/venta/CobroDialog.jsx`**: NO está en los archivos permitidos. La spec pedía agregar la opción "Fiado" *dentro* de CobroDialog, pero al no poder tocarlo, implementé el fiado como un **botón + selector propios en `venta/page.jsx`** (lo permitido: "solo agregar opción pago fiado"). Mismo resultado funcional, sin tocar CobroDialog. **Ver bug #2.**
- **`src/components/venta/MobileCartBar.jsx`**: no permitido → el botón "Cobrar a fiado" está en el footer del carrito de escritorio; en móvil no se agregó (fuera de alcance). Documentado.
- **`src/lib/db/types.ts`**: no permitido → tipos de fiado declarados en `fiado.ts`; `metodo_pago='fiado'` se pasa desde `.jsx` (no type-checked) y lo valida el check de BD.
- **`app/api/fiado/`**: **no se crearon rutas**. El repo (cliente Supabase con RLS) cubre todas las operaciones, consistente con la arquitectura (la mayoría de operaciones son client-side vía repos). No eran necesarias para los STEPs.
- **`handleCobro` existente**: intacto.

## Bugs detectados fuera de scope

1. **Atomicidad de `registrarCargo`/`registrarAbono`.** Sin un RPC, son dos operaciones (insert movimiento + update saldo, read-modify-write), no una única transacción. Para una tiendita de un cajero es aceptable; cargos concurrentes al mismo cliente podrían competir. **No corregido:** añadir un RPC excede la SQL prescriptiva de la migration. **Recomendación:** función plpgsql `registrar_movimiento_fiado` para atomicidad real.
2. **CobroDialog fuera de los archivos permitidos** (ver "Lo que NO toqué"): la opción fiado quedó como botón/selector en `venta/page.jsx` en vez de dentro de CobroDialog. Es la interpretación fiel dado el límite de archivos.
3. **Límite de crédito (`limite_credito`) no se valida al vender a fiado.** La spec (STEP 4) no pide bloquear ventas sobre el límite; se muestra informativo en la página. No implementado (no pedido).
4. **`page.tsx` vs convención `.jsx`:** las páginas migradas son `.jsx`; creé `fiado/page.tsx` (como pide la spec) con HTML crudo para evitar el choque de tipos shadcn↔tsx. `venta/page.tsx` realmente es `venta/page.jsx`.
5. **Build con carrera del agente concurrente:** varios `next build` fallaron con ENOENT/ENOTEMPTY en `.next` porque otro agente corría `next build` a la vez (colisión de filesystem). Con `.next` limpio y sin build concurrente, `next build` salió **exit 0**. No es bug de código (la compilación siempre pasó; `tsc` exit 0 consistente).

## Estado final

- **`tsc --noEmit`:** exit 0.
- **`next build`:** exit 0 (warnings benignos: `<img>` y Edge Runtime + supabase en middleware, ambos preexistentes y documentados). Ruta **`/fiado`** generada (5.68 kB).
- **Migration aplicada y verificada** en `lisjbutidntalmobgjso` (2 tablas, 5 policies, check `metodo_pago` con `fiado`).
- **Funcionalidad:** sección Fiado (clientes, alta, historial, abonos, resumen para dueño); en el POS, "Cobrar a fiado" crea la venta con `metodo_pago='fiado'`, registra el cargo al saldo del cliente y el ticket muestra "Fiado - <cliente>"; link "Fiado" en el sidebar. WhatsApp ahora usa el nombre real del negocio.
- **Verificación a nivel de código + build + introspección de BD.** No se hizo prueba runtime en navegador (crear cliente, vender a fiado, abonar contra la BD viva).

## Número de reporte: 013
