# Reporte 033 - codex - integracion hardware POS

## Tarea recibida

Reconstruir la migracion perdida `014_onboarding_existentes.sql`, integrar escaner fisico y bascula al POS, crear `016_producto_venta_peso.sql` si el modelo aun no tiene campos de venta por peso, verificar `tsc --noEmit` y `next build`, y no aplicar migraciones desde este entorno.

## Auditoria trabajo anterior

Lei `docs/reports/2026-06-26_032_codex_hardware-escaner-bascula.md`.

Verifique en codigo real:
- `src/hooks/useEscanerFisico.js` existe.
- `src/hooks/useBascula.js` existe.
- `src/lib/hardware/escanerFisico.ts` existe.
- `src/lib/hardware/bascula.ts` existe.

Bug corregido de la infraestructura anterior:
- `src/lib/hardware/escanerFisico.ts` escuchaba `document` y podia duplicar un escaneo si el input de busqueda estaba enfocado, porque el input tambien procesa Enter.
- Ajuste el detector para ignorar eventos originados en `input`, `textarea`, `select` o elementos `contentEditable`, y para exigir que Enter llegue rapido despues del ultimo caracter. Asi el input enfocado funciona como fallback sin doble agregado.

## Lo que hice (archivo por archivo)

`supabase/migrations/014_onboarding_existentes.sql`
- Reconstrui el archivo perdido con el SQL exacto solicitado para marcar negocios preexistentes como onboarding completado.
- No lo aplique; segun el prompt ya esta aplicado en BD.

`supabase/migrations/016_producto_venta_peso.sql`
- Cree la migration pendiente para agregar a `productos`:
  - `vendido_por_peso boolean NOT NULL DEFAULT false`
  - `precio_por_kg numeric(10,2)`
- No la aplique.

`src/lib/hardware/escanerFisico.ts`
- Evita capturar teclas cuando el foco esta en un campo editable.
- Valida tambien que Enter llegue dentro del umbral rapido del escaner.

`app/(dashboard)/venta/page.jsx`
- La ruta real del proyecto es `.jsx`; `app/(dashboard)/venta/page.tsx` no existe.
- Importe `useEscanerFisico` y conecte su callback a `handleBarcodeScan`, reutilizando la misma resolucion por codigo de barras que ya usaba el escaner de camara/manual.
- Mantengo el buscador enfocado al montar y despues de procesar escaneos/dialogos, para que el escaner que actua como teclado siga funcionando como fallback.
- Importe `useBascula` e integre flujo para productos con `vendido_por_peso = true`.
- Al seleccionar un producto por peso, se abre un dialogo de confirmacion:
  - Si la bascula esta conectada, intenta leer el peso automaticamente.
  - Muestra el peso leido antes de confirmar.
  - Si no hay bascula conectada o el navegador no soporta Web Serial, permite capturar el peso manualmente.
  - Calcula total con `peso_kg * precio_por_kg`.
  - Agrega al carrito con cantidad igual al peso y precio unitario igual al precio por kg.
- Los productos sin `vendido_por_peso` siguen usando el flujo normal existente.

## Lo que NO toque

- No toque `app/(dashboard)/configuracion/page.tsx` ni `app/(dashboard)/configuracion/page.jsx`.
- No toque `app/vista-cliente/page.jsx`.
- No toque fiado, WhatsApp, layout, ni el filtro de categorias.
- No aplique ninguna migracion.
- No toque cambios ajenos en inventario, docs ni otras migrations de otras IAs.

## Migraciones creadas (y cuales quedan PENDIENTES DE APLICAR)

- `supabase/migrations/014_onboarding_existentes.sql` - creada para restaurar repo == BD. PENDIENTE DE APLICAR: no; el prompt indica que ya esta aplicada en BD y solo habia que reconstruir el archivo.
- `supabase/migrations/016_producto_venta_peso.sql` - creada. PENDIENTE DE APLICAR por el director humano.

## Bugs detectados fuera de scope

- Persisten warnings preexistentes:
  - `app/(dashboard)/registros/page.jsx`: dependencias faltantes `inRange` en `useMemo`.
  - `src/components/registros/CortePDF.jsx`, `src/components/registros/ResumenFinancieroPDF.jsx` y `src/components/venta/TicketVenta.jsx`: warnings por uso de `<img>`.
- `next build` tuvo un fallo intermedio por cache generado inconsistente en `.next/types` (`File ... .next/types/app/(auth)/layout.ts not found`). Verifique que `.next` estaba dentro del workspace, limpie solo ese directorio generado y repeti `tsc` + `build` de forma secuencial; ambos pasaron.
- El worktree contiene cambios ajenos fuera de scope en inventario, docs y una migration de otra IA. No los toque ni los incluire en el commit.

## Estado final

- `npx tsc --noEmit`: exit 0.
- `npm run build`: exit 0.
- Migraciones aplicadas por Codex: ninguna.
- Archivos SQL creados:
  - `014_onboarding_existentes.sql`
  - `016_producto_venta_peso.sql`
- Pendiente operativo: el director humano debe aplicar `016_producto_venta_peso.sql` para que existan `vendido_por_peso` y `precio_por_kg` en la BD.

## Numero de reporte: 033
