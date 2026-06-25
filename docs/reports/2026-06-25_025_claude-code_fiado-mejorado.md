# Reporte 025 — claude-code — Fiado mejorado (alta desde POS + UI sin límite)

## Tarea recibida

REGLA ABSOLUTA: solo lo indicado; no features extra, no refactor fuera de scope, no cambiar arquitectura, no Supabase directo desde componentes, no cambiar diseño skeuomorphic. NO aplicar migrations sin documentar.

Archivos exclusivos: `app/(dashboard)/fiado/page.tsx`, `app/(dashboard)/venta/page.tsx` (solo flujo de fiado), `src/lib/db/fiado.ts`, `app/api/fiado/`, `supabase/migrations/012_fiado_mejoras.sql` (si necesaria), `docs/reports/`.

- TAREA 1 — Botón "Fiado" en el POS con modal: buscar/seleccionar cliente (por nombre o teléfono) o crear uno inline (nombre, teléfono, notas, **sin límite**); al confirmar: venta con `metodo_pago='fiado'` que **descuenta stock** + `registrarCargo`; mensaje "Fiado registrado para [nombre]. Debe: $[saldo]".
- TAREA 2 — Página de Fiado: quitar `limite_credito` del form y del perfil; botón "Abonar" (monto libre) + "Liquidar todo" (confirmación → abona el saldo completo); historial.
- TAREA 3 — Migration `012` solo si el check `ventas.metodo_pago` no incluye `'fiado'`.

## Auditoría trabajo anterior

Leí `docs/reports/2026-06-25_022_claude-code_auditoria-final.md`. Verifiqué el sistema de fiado actual en código real:
- `app/(dashboard)/fiado/page.tsx` existe (tabs Clientes/Resumen, alta, abono, historial).
- `src/lib/db/fiado.ts` tiene `registrarCargo` (114) y `registrarAbono` (150), además de `createCliente`, `getClientes`, `getMovimientos`.
- **`handleCobroFiado` (venta/page.jsx) ya crea la venta con `metodo_pago='fiado'` y descuenta stock + kardex** (vía `ajustarStock`, líneas 508–525) + `registrarCargo`. Es decir, el fiado ya funcionaba y ya descontaba stock.
- **Sin bugs críticos**; no hubo que corregir nada antes de continuar.

## Lo que hice (archivo por archivo)

**`app/(dashboard)/venta/page.jsx`** (solo flujo de fiado):
- Botón del carrito renombrado **"Cobrar a fiado" → "Fiado"**; al abrir, resetea el estado del modal.
- **Modal de fiado rediseñado en 3 estados** (mismo estilo skeuomorphic, sin shadcn):
  1. *Buscar/seleccionar*: input que filtra por **nombre o teléfono**, lista con saldo (rojo>0/verde=0); click → selecciona (ya no cobra de inmediato).
  2. *Alta inline* ("+ Nuevo cliente de fiado"): formulario con **nombre, teléfono, notas — SIN límite de crédito**; al guardar usa `crearCliente` (del hook `useFiado`) y selecciona automáticamente al nuevo cliente.
  3. *Confirmar*: muestra nombre + saldo actual y botón **"Confirmar fiado a [nombre]"** (+ "← Elegir otro").
- Al confirmar: se llama el `handleCobroFiado` existente (crea venta `pagada`/`fiado`, descuenta stock+kardex, `registrarCargo` con descripción "Venta [folio]"). **Mensaje cambiado a** `Fiado registrado para [nombre]. Debe: $[nuevo saldo]` (saldo previo + total) y limpia el carrito. No navega a la página de fiado.
- Handlers nuevos: `cerrarFiadoModal` (resetea estado) y `handleCrearClienteFiado` (alta inline). Se obtuvo `crearCliente` de `useFiado` (vía repo, sin Supabase directo).

**`app/(dashboard)/fiado/page.tsx`** (TAREA 2):
- **Quitado `limite_credito`**: del formulario de nuevo cliente (input + estado `limite`), de la llamada `crearCliente`, y de la vista del perfil ("Límite: $X" eliminado). El form ahora solo tiene nombre, teléfono, notas. (La columna NO se borra en BD; solo se oculta en la UI.)
- Perfil del cliente: botón **"Abonar"** (antes "Registrar abono") → dialog con monto libre; nuevo botón **"Liquidar todo"** (deshabilitado si saldo = 0) → **dialog de confirmación** que abona el saldo completo (`abonar(id, saldo_pendiente)`).
- Saldo en rojo (>0) / verde (=0) y el historial (fecha, tipo, monto, descripción) se conservan.

## Lo que NO toqué

- **`src/lib/db/fiado.ts`**: no requirió cambios. `createCliente` ya acepta `limite_credito` opcional (con default en BD), así que omitirlo desde la UI basta; `registrarCargo`/`registrarAbono` ya hacen lo necesario.
- **`app/api/fiado/`**: NO se creó ninguna ruta (ver decisión sobre el RPC abajo).
- **`supabase/migrations/012_fiado_mejoras.sql`**: NO creada — el check `ventas_metodo_pago_check` **ya incluye `'fiado'`** (migración `008_fiado`, verificado en mi auditoría #022 y en el ledger). La condición "si no incluye 'fiado'" es falsa → migración innecesaria. No se aplicó ninguna migration.
- **`CobroDialog.jsx`, `useCarritoActivo`, `handleCobro` (efectivo)**: intactos. El fiado entra por su propio botón/modal.

## Bugs detectados fuera de scope

1. **Contradicción en el prompt (RPC vs "igual que efectivo") — decisión documentada.** TAREA 1 pedía a la vez "Ejecuta el flujo normal de venta (**igual que efectivo**)" y "**Llama al RPC `crear_venta_completa`**". Pero el flujo de efectivo **online** (`handleCobro`) usa `createVenta` + `ajustarStock`, **no** el RPC; el RPC `crear_venta_completa` solo lo usa `POST /api/ventas` para el **sync offline**. Mantuve `createVenta`+`ajustarStock` para el fiado porque: (a) es literalmente "igual que efectivo"; (b) **ya descuenta stock + kardex** (el objetivo del negocio); (c) cambiarlo al RPC haría que el fiado **diverja** del efectivo y requeriría una ruta `/api/fiado` nueva (el `/api/ventas` existente fija `monto_efectivo = total`, incorrecto para fiado, y no está en los archivos permitidos). Resultado funcional idéntico al pedido (venta `pagada`/`fiado`, stock descontado, cargo registrado).
2. **Atomicidad venta↔cargo (preexistente, no nuevo).** `createVenta`+`ajustarStock`+`registrarCargo` son operaciones separadas; si `registrarCargo` falla tras crear la venta, la venta queda pero el saldo no sube. Riesgo bajo para una tiendita; igual que rondas previas. No corregido (excede el alcance y aplica a todo el flujo de venta).

## Estado final

- **`tsc --noEmit`:** exit 0. **`next build`:** exit 0 (`✓ Compiled successfully`). `/fiado` 5.8 kB, `/venta` 22.2 kB.
- **Check constraint** `ventas.metodo_pago` ya incluye `'fiado'` (no se necesitó migración 012; no se aplicó nada en BD).
- **Funcionalidad:** desde el POS, "Fiado" abre el modal para buscar/seleccionar o **crear un cliente inline (sin límite)** y confirmar; la venta descuenta stock como una venta normal y carga el saldo del cliente, mostrando el nuevo adeudo. En la sección Fiado: alta sin límite, "Abonar" (monto libre) y "Liquidar todo" (confirmación), sin referencias a límite de crédito.
- **Verificación a nivel de código + build.** No se hizo prueba runtime en navegador (crear cliente desde POS, confirmar fiado y ver el stock bajar, liquidar saldo contra la BD viva).

## Número de reporte: 025
