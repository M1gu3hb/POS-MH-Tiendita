# Reporte 032 - codex - hardware escaner fisico + bascula

## Tarea recibida

Crear la infraestructura base para soporte de hardware desde Configuracion: campos `escaner_fisico_activo` y `bascula_activa` en `configuracion_negocio`, helpers/hooks para escaner fisico USB/Bluetooth y bascula por Web Serial API, y una seccion de Hardware en Configuracion. No integrar al POS en esta ronda y no tocar `venta/page.tsx`.

## Auditoria trabajo anterior

Lei `docs/reports/2026-06-25_026_codex_whatsapp-telefono.md`.

Resultado:
- El reporte 026 no dejo bug critico pendiente de esa tarea.
- El reporte indica que el cambio de WhatsApp quedo en `app/(dashboard)/venta/page.jsx`, que no toque en esta ronda.
- `_AUDIT_LOG.md` marca ultimo reporte auditado #029. Este reporte usa el numero solicitado por el prompt: 032.

## Lo que hice (archivo por archivo)

`supabase/migrations/015_hardware_config.sql`
- Cree la migration solicitada para agregar `escaner_fisico_activo boolean NOT NULL DEFAULT false` y `bascula_activa boolean NOT NULL DEFAULT false` a `configuracion_negocio`.

`src/lib/db/configuracion.ts`
- Agregue `escaner_fisico_activo` y `bascula_activa` a los tipos locales usados por `getConfiguracion` y `updateConfiguracion`.
- No cambie la arquitectura de datos: la pantalla sigue usando la capa `src/lib/db/`.

`src/lib/hardware/escanerFisico.ts`
- Cree detector de escaner fisico por eventos `keydown` a nivel `document`.
- Acumula caracteres y emite el codigo cuando llegan con menos de 50ms entre teclas y terminan con Enter.
- Expone `iniciar(callback)` y `detener()`.

`src/hooks/useEscanerFisico.js`
- Cree hook que lee `config.escaner_fisico_activo`.
- Si esta activo, inicia el listener del escaner y ejecuta `onScan`.
- Limpia el listener al desmontar.

`src/lib/hardware/bascula.ts`
- Cree utilidades para Web Serial API:
  `verificarSoporte`, `conectarBascula`, `leerPeso` y `desconectarBascula`.
- `conectarBascula` usa `navigator.serial.requestPort()` y abre el puerto a 9600 baud.
- `leerPeso` lee texto del stream serial, parsea el primer numero recibido y lo retorna como kg.
- Los errores devuelven mensajes claros para navegador no soportado, conexion, lectura y desconexion.

`src/hooks/useBascula.js`
- Cree hook que lee `config.bascula_activa`.
- Expone `{ soportada, conectada, conectar, leerPeso, desconectar, pesoActual }`.
- Cierra la conexion si se desactiva la bascula o se desmonta el componente.

`app/(dashboard)/configuracion/page.jsx`
- La ruta real del proyecto es `.jsx`; `app/(dashboard)/configuracion/page.tsx` no existe.
- Agregue pestaña/seccion `Hardware`.
- Agregue toggle `Escáner físico (USB/Bluetooth)` con texto de ayuda y guardado via `updateConfiguracion`.
- Agregue toggle `Báscula conectada` con texto de ayuda y guardado via `updateConfiguracion`.
- Si la bascula esta activa, se muestra boton `Conectar báscula`, estado conectado/no conectado y aviso si el navegador no soporta Web Serial.

## Lo que NO toque

- No toque `app/(dashboard)/venta/page.tsx` ni `app/(dashboard)/venta/page.jsx`.
- No integre escaner fisico ni bascula al POS; esta ronda solo crea infraestructura.
- No toque fiado, layout ni archivos en scope de otros agentes.
- No modifique `app/vista-cliente/page.jsx`, `docs/BUGS_PENDING.md`, `docs/CHANGELOG.md` ni cambios ajenos que ya estaban en el worktree.
- No cambie el stack, arquitectura, ni diseño skeuomorphic.

## Bugs detectados fuera de scope

- No detecte bug critico fuera de scope que debiera corregirse en esta ronda.
- Persisten warnings preexistentes de lint/build:
  - `app/(dashboard)/registros/page.jsx`: dependencias faltantes `inRange` en `useMemo`.
  - `src/components/registros/CortePDF.jsx`, `src/components/registros/ResumenFinancieroPDF.jsx` y `src/components/venta/TicketVenta.jsx`: warnings por uso de `<img>`.
- El worktree tenia cambios ajenos fuera de scope en `app/vista-cliente/page.jsx`, `docs/BUGS_PENDING.md` y `docs/CHANGELOG.md`; no los toque ni los incluire en el commit.

## Estado final (migration aplicada, build verde)

- `npx tsc --noEmit`: exit 0.
- `npm run build`: exit 0.
- `npm run lint`: exit 0, con warnings preexistentes listados arriba.
- Migration remota: NO aplicada desde este entorno.
  - `npx supabase link --project-ref lisjbutidntalmobgjso --yes` fallo con `LegacyPlatformAuthRequiredError`: no hay `SUPABASE_ACCESS_TOKEN`.
  - Verificacion REST con service role a `configuracion_negocio?select=escaner_fisico_activo,bascula_activa&limit=1` devolvio `400 / 42703`: `column configuracion_negocio.escaner_fisico_activo does not exist`.
  - El archivo `supabase/migrations/015_hardware_config.sql` queda listo para aplicarse con credencial de administracion o SQL Editor.
- Build local verde; la funcionalidad de Configuracion compilada queda bloqueada en runtime hasta aplicar la migration en la BD remota.

## Numero de reporte: 032
