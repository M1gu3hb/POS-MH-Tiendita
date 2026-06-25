## Tarea recibida

Preparar el proyecto para deploy en Vercel sin tocar codigo fuente: verificar `next.config.mjs`, crear `vercel.json`, actualizar `.env.example`, crear `docs/DEPLOYMENT.md`, correr build de produccion y dejar reporte 020.

## Auditoria trabajo anterior (resultado)

Lei `docs/reports/2026-06-25_017_codex_ux-mejoras.md`.

Verifique en codigo real:
- `src/components/venta/CobroDialog.jsx` contiene el campo "Nombre del cliente", estado `nombreCliente` y envio de `notas: "Cliente: [nombre]"`.
- `src/components/venta/TicketVenta.jsx` lee `venta.nombre_cliente` o `venta.notas` con prefijo `Cliente: ` y muestra `Cliente: [nombre]`.
- `app/(dashboard)/cuenta/page.jsx` usa `signOut` existente y tiene el boton "Cerrar sesion" al final, separado por `border-t border-border`.

No encontre bug critico que requiriera tocar codigo fuente.

## Lo que hice (archivo por archivo)

`next.config.mjs`
- Verifique que no hay configuraciones que rompan deploy en Vercel.
- Agregue el dominio exacto de Supabase Storage `lisjbutidntalmobgjso.supabase.co` a `images.remotePatterns`.
- Conserve los patrones existentes para `*.supabase.co` y `*.supabase.in`.

`vercel.json`
- Cree configuracion de Vercel con framework `nextjs`.
- Defini `buildCommand`, `outputDirectory`, `installCommand` y `NEXT_PUBLIC_APP_URL` placeholder.

`.env.example`
- Actualice las variables requeridas de Supabase, Stripe y App.
- Agregue comentarios para cada variable.
- Deje valores placeholder seguros, sin secretos reales.

`docs/DEPLOYMENT.md`
- Cree guia completa de deploy en Vercel.
- Documente pre-requisitos, pasos, variables de entorno requeridas, post-deploy y configuracion de Stripe cuando se active.
- Documente el webhook de Stripe en `/api/stripe/webhook` y los eventos que usa la app.

`docs/reports/2026-06-25_020_codex_deploy-prep.md`
- Cree este reporte.

## Lo que NO toque

No toque archivos de codigo fuente.

No toque migrations.

No toque formularios, galerias, componentes, rutas de negocio ni integraciones existentes.

No toque reportes de otras IAs.

No cree `.env.local` ni agregue secretos reales.

## Bugs detectados fuera de scope

No detecte bug critico nuevo.

`npm ci` reporto 5 vulnerabilidades existentes (1 moderate, 4 high) y paquetes deprecados. No lo corregi porque requiere actualizaciones de dependencias fuera del scope.

Un primer `npm run build` sin variables de entorno fallo por faltar `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` en el clon local. No modifique codigo fuente; confirme el build con las variables requeridas cargadas temporalmente en el entorno, como ocurriria en Vercel.

Warnings existentes durante build:
- `app/(dashboard)/registros/page.jsx`: dependencias faltantes de `useMemo` para `inRange`.
- `src/components/registros/CortePDF.jsx`, `src/components/registros/ResumenFinancieroPDF.jsx` y `src/components/venta/TicketVenta.jsx`: uso de `<img>`.

## Estado final (build prod, archivos creados)

`npm ci`: exit 0.

`npm run build` con variables requeridas cargadas temporalmente en el entorno, despues de rebase sobre `origin/main`: exit 0.

Archivos creados:
- `vercel.json`
- `docs/DEPLOYMENT.md`
- `docs/reports/2026-06-25_020_codex_deploy-prep.md`

Archivos actualizados:
- `next.config.mjs`
- `.env.example`

## Numero de reporte: 020
