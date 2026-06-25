## Tarea recibida

Implementar upload de imagen en `ProductoDialog` con dos opciones visibles: galeria y camara; validar JPG/PNG/WebP, maximo 2MB, subir a `/api/storage/upload`, mostrar estado "Subiendo...", thumbnail 80x80px y boton X para limpiar `imagen_url`. Agregar alerta visual de stock minimo despues de una venta exitosa. Verificar `tsc --noEmit`, `next build` y que el endpoint de upload acepta archivo y devuelve URL.

## Lo que hice (archivo por archivo, cambio exacto)

`src/components/productos/ProductoDialog.jsx`
- Agregue estado y refs para upload de imagen (`uploadingImage`, `imageError`, inputs ocultos de galeria y camara).
- Agregue `imagen_url` al formulario, carga inicial desde `producto.imagen_url` y envio en `onSave`.
- Reemplace el flujo de URL manual por dos botones visibles:
  - `Subir imagen` con `accept="image/jpeg,image/png,image/webp"`.
  - `Tomar foto` con `accept="image/*"` y `capture="environment"`.
- Valide tipo de archivo y limite de 2MB antes de subir.
- Subi el archivo con `FormData` a `/api/storage/upload` usando `folder=productos`.
- Mostre spinner y texto `Subiendo...` durante el upload.
- Mostre thumbnail 80x80px cuando hay `imagen_url`, con boton X que solo limpia el formulario.

`app/api/storage/upload/route.ts`
- Agregue soporte para `folder=productos`.
- Si `folder=productos`, guarda en `<negocio_id>/productos/<timestamp>.<ext>` con `upsert: false`.
- Para `folder=productos`, valide tambien en servidor JPG/PNG/WebP y maximo 2MB.
- Preserve el comportamiento existente de logo como `<negocio_id>/logo.<ext>` con `upsert: true`.

`app/(dashboard)/venta/page.jsx`
- En el callback de cobro, despues de descontar stock con `ajustarStock`, acumule productos cuyo nuevo stock queda `<= stock_minimo`.
- Tras la venta exitosa, muestro `toast.warning` por cada producto:
  `⚠️ Stock bajo: [nombre producto] — quedan [stock_actual] [unidad]`.
- No agregue queries nuevas porque el stock actualizado ya se calcula y persiste en el mismo flujo.

`docs/reports/2026-06-24_008_codex_imagen-producto-stock-alert.md`
- Cree este reporte.

## Lo que NO toqué y por qué

- No toque `supabase/migrations/` porque el endpoint existente y las politicas actuales ya permiten escritura bajo el primer segmento `negocio_id`.
- No toque `src/lib/db/productos.ts` porque no fue necesario crear `getProductosByIds`; el stock actualizado se conoce despues de cada `ajustarStock`.
- No toque diseño global ni componentes fuera de los necesarios.
- No converti `app/(dashboard)/venta/page.jsx` a `.tsx`; el archivo pedido como `.tsx` no existe en este repo y el equivalente real es `.jsx`.

## Bugs detectados fuera de scope

- `npm audit --audit-level=high` sigue fallando por vulnerabilidades existentes en dependencias (`next`, `glob` via `eslint-config-next`, `postcss`, `react-quill/quill`). Los fixes sugeridos requieren cambios mayores/breaking changes y quedan fuera de esta tarea.
- `npm run lint` mantiene warnings preexistentes en `app/(dashboard)/registros/page.jsx` y componentes PDF/ticket por dependencias de hooks e imagenes `<img>`.
- El primer `next build` fallo por un manifiesto generado faltante dentro de `.next`; al limpiar `.next` y repetir, el build paso.
- El worktree contiene cambios ajenos fuera de esta tarea (`docs/BUGS_PENDING.md`, `docs/CHANGELOG.md`, `package.json`, `src/lib/db/scan.ts`, `docs/reports/_AUDIT_LOG.md`). No los toque ni los inclui en el commit de esta tarea.

## Estado final (build, tsc, funcionalidad verificada)

- `npx tsc --noEmit`: exit 0.
- `npm run lint`: exit 0 con warnings preexistentes.
- `npm run build`: exit 0 tras limpiar `.next`.
- Upload verificado end-to-end con tenant temporal autenticado: `POST /api/storage/upload` devolvio HTTP 200, `url` y `path` bajo `<negocio_id>/productos/<timestamp>.png`; tambien rechaza `text/plain` con HTTP 415. El archivo, negocio y usuario temporales fueron limpiados.
- Alerta de stock minimo implementada como aviso visual no bloqueante despues de venta exitosa.

## Número de reporte: 008
