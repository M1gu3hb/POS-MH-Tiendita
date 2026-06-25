## Tarea recibida

Agregar un campo `qr_url` para que el negocio guarde una URL, generar un QR de 150x150px en configuracion y mostrar un QR de 80x80px al final del ticket de venta cuando exista `config.qr_url`. Tambien auditar primero el trabajo anterior de upload de imagen y alerta de stock minimo.

## Auditoría trabajo anterior (resultado)

Lei `docs/reports/2026-06-24_008_codex_imagen-producto-stock-alert.md`.

Verifique en el codigo real que:
- `src/components/productos/ProductoDialog.jsx` contiene el flujo de upload con selector de archivo y camara.
- `app/api/storage/upload/route.ts` acepta imagenes de producto y aplica validacion de tipo/tamano.
- `app/(dashboard)/venta/page.jsx` tiene conectada la alerta visual de stock bajo despues de la venta exitosa.

No encontre un bug critico de ese trabajo anterior que corrigiera antes de continuar.

## Lo que hice (archivo por archivo)

`supabase/migrations/007_qr_url.sql`
- Cree la migracion requerida:
  `alter table configuracion_negocio add column if not exists qr_url text;`

`src/lib/db/configuracion.ts`
- Agregue soporte tipado local para `qr_url` en lectura y actualizacion de configuracion.
- Manteni las queries dentro de `src/lib/db/`, sin llamadas directas a Supabase desde componentes.

`app/(dashboard)/configuracion/page.jsx`
- El archivo solicitado como `page.tsx` no existe en el proyecto; el archivo real de la ruta es `page.jsx`.
- Agregue la seccion "Código QR del negocio" en la pestana de tickets.
- Agregue campo de URL, placeholder `https://facebook.com/mi-tienda`, boton "Guardar URL" y generacion frontend con `QRCode.toDataURL()`.
- El QR de configuracion renderiza a 150x150px.

`src/components/venta/TicketVenta.jsx`
- Agregue generacion de QR con `QRCode.toDataURL()` cuando existe `config.qr_url`.
- Muestro el QR al final del ticket, despues del mensaje de agradecimiento, en 80x80px.
- Agregue el texto "Síguenos / Contáctanos".
- Si no hay `qr_url`, no se renderiza nada adicional.

`package.json` y `package-lock.json`
- Instale las dependencias pedidas: `qrcode` y `@types/qrcode`.

## Lo que NO toqué

No toque `app/(dashboard)/venta/page.jsx` para esta tarea.

No toque `src/components/configuracion/BaseDatosTab.jsx`; solo lo lei por contexto.

No toque `src/lib/db/types.ts`; limite el soporte de `qr_url` a `src/lib/db/configuracion.ts`, como indicaba el scope.

No cambie el diseno visual skeuomorphic ni la arquitectura de acceso a datos.

## Bugs detectados fuera de scope

`npm install` reporto 7 vulnerabilidades en dependencias existentes: 3 moderadas y 4 altas. No las corregi porque implicaria cambios de dependencias fuera de scope.

`npm run build` reporta warnings ya existentes de hooks en `app/(dashboard)/registros/page.jsx` y uso de `<img>` en componentes de PDF/ticket. No los corregi por estar fuera de scope.

## Estado final (migration aplicada, build, QR renderiza)

Migration aplicada: NO. El archivo SQL fue creado, pero la columna remota no existe todavia. La comprobacion contra Supabase devolvio `42703`: `column configuracion_negocio.qr_url does not exist`. Tambien se intento operar con Supabase CLI, pero no hay token/conexion disponible en el entorno para aplicar DDL al proyecto `lisjbutidntalmobgjso`.

`npx tsc --noEmit`: exit 0.

`npm run build`: exit 0 despues de limpiar el artefacto generado `.next` que quedo incompleto por un timeout previo.

Generacion QR: verificada con `qrcode`; devuelve un `data:image/png;base64,...` valido.

## Número de reporte: 011
