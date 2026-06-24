# Reporte 002 — claude-code — security: rate limiting register + bucket policy por negocio_id

## Tarea recibida

REGLA ABSOLUTA: Haz ÚNICAMENTE lo que este prompt indica. Nada más. No agregues features, no refactorices código fuera de scope, no cambies arquitectura. Si detectas un bug crítico fuera de scope, documéntalo en el reporte pero no lo corrijas.

TAREA 1 — Rate limiting en /api/negocio/register
Archivo: app/api/negocio/register/route.ts
Problema: endpoint público sin límite de tasa — cualquiera puede crear negocios en masa.
Fix: implementa rate limiting por IP usando un Map en memoria (máximo 3 intentos por IP en ventana de 15 minutos). Si se supera el límite, devuelve HTTP 429 con mensaje "Demasiados intentos. Espera 15 minutos."
No instales librerías nuevas. Solo lógica en el mismo archivo.

TAREA 2 — Acotar bucket negocio-assets por carpeta negocio_id
Problema: hoy cualquier usuario autenticado puede escribir en cualquier carpeta del bucket.
Fix: crea una nueva migration supabase/migrations/005_storage_policy.sql que reemplace la política de escritura actual del bucket negocio-assets por una que solo permita escribir en la carpeta que coincida con el negocio_id del usuario:
  - El path del archivo debe empezar con el negocio_id del usuario
  - Usa la función get_negocio_id() que ya existe en la BD
  - Mantén la política de lectura pública como está
Aplica la migration a la BD real (proyecto lisjbutidntalmobgjso).
Actualiza también src/lib/db/configuracion.ts para que el upload suba a negocio_id/logo en lugar de la raíz del bucket.

Al terminar crea docs/reports/2026-06-24_002_claude-code_security-rate-limit-bucket.md con: [estructura]
Commit + push con mensaje: "security: rate limiting register + bucket policy por negocio_id"

## Lo que hice (archivo por archivo)

**`app/api/negocio/register/route.ts`** (TAREA 1)
- Añadí rate limiting por IP en memoria, contenido en el mismo archivo (sin librerías nuevas):
  - Constantes `RATE_LIMIT_MAX = 3` y `RATE_LIMIT_WINDOW_MS = 15 min`.
  - `Map<string, number[]>` (`registerAttempts`) a nivel de módulo: IP → timestamps de intentos.
  - `getClientIp(request)`: lee `x-forwarded-for` (primer valor) con fallback a `x-real-ip`, o `'unknown'`.
  - `isRateLimited(ip)`: poda los timestamps fuera de la ventana de 15 min; si quedan ≥ 3 → `true`; si no, registra el intento actual y devuelve `false`.
  - Al inicio de `POST`, antes de cualquier trabajo: si `isRateLimited(ip)` → responde **HTTP 429** con `{ error: 'Demasiados intentos. Espera 15 minutos.' }`.
- No toqué el resto de la lógica del endpoint (creación de usuario, RPC, compensación).

**`supabase/migrations/005_storage_policy.sql`** (TAREA 2 — nueva migration)
- Reemplaza las políticas de **escritura** del bucket `negocio-assets`:
  - `negocio_assets_insert` (insert, rol `authenticated`): `with check (bucket_id = 'negocio-assets' and (storage.foldername(name))[1] = get_negocio_id()::text)`.
  - `negocio_assets_update` (update, rol `authenticated`): mismo predicado en `using` y `with check`.
- La ruta del objeto es `<negocio_id>/...`, así que `(storage.foldername(name))[1]` (primer segmento) debe igualar el `negocio_id` del usuario, resuelto por `get_negocio_id()` (SECURITY DEFINER, ya existente en `002_rls`).
- **No** toca `negocio_assets_read` (lectura pública) — se mantiene como estaba en `004`.

**BD real (proyecto `lisjbutidntalmobgjso`)** — migration aplicada vía Supabase MCP (`apply_migration`, `{ success: true }`). Verificado con introspección de `pg_policy`:
  - `negocio_assets_insert.check` = `((bucket_id = 'negocio-assets') AND ((storage.foldername(name))[1] = (get_negocio_id())::text))`
  - `negocio_assets_update.using` y `.check` = mismo predicado acotado por carpeta
  - `negocio_assets_read.using` = `(bucket_id = 'negocio-assets')` (intacta, pública)

**`app/api/storage/upload/route.ts`** (TAREA 2 — ver nota de discrepancia)
- Cambié la ruta de subida de `${negocioId}/${uuid}.${ext}` a **`${negocioId}/logo.${ext}`** y `upsert: false` → `upsert: true` (nombre fijo `logo` ⇒ se reemplaza el logo existente; la política de UPDATE de la migration lo permite porque la carpeta sigue siendo la del negocio).
- **Por qué aquí y no en `src/lib/db/configuracion.ts`:** la tarea pedía actualizar `configuracion.ts` para que "el upload suba a `negocio_id/logo`", pero **`configuracion.ts` no contiene lógica de upload** — solo `getConfiguracion`/`updateConfiguracion`, que persisten el string `logo_url`. El upload real (archivo → bucket) vive en este route handler (`POST /api/storage/upload`), invocado desde `app/(dashboard)/configuracion/page.jsx` (`handleLogoUpload`), único consumidor del endpoint. Por eso el cambio de ruta se hizo en el lugar correcto. No fabriqué una función de upload en `configuracion.ts` (sería código muerto) ni moví el upload al cliente (cambiaría la arquitectura documentada: el upload pasa por el route server-side ligado a la sesión — ver `docs/DECISIONS.md`).
- Nota adicional: el upload **ya** estaba acotado por carpeta (`${negocioId}/...`) desde `004`, por lo que la premisa "hoy sube a la raíz del bucket" era inexacta; ya cumplía con la nueva política. El único delta literal solicitado era el nombre fijo `logo`.

## Lo que NO toqué

- **`src/lib/db/configuracion.ts`**: no tiene lógica de upload; modificarlo habría implicado inventar código muerto o refactorizar la arquitectura de subida (server route → cliente). Fuera de la regla absoluta. Explicado arriba.
- **`app/(dashboard)/configuracion/page.jsx`**: el cliente sigue llamando a `/api/storage/upload` igual que antes; el cambio de ruta es transparente para él (recibe `data.url`). No se refactorizó.
- **`negocio_assets_read`** (política de lectura pública): se mantiene intacta, como pedía la tarea.
- **Resto del endpoint de registro** (creación de auth user, RPC `registrar_negocio`, compensación): sin cambios; solo se antepuso el guard de rate limiting.
- **Migraciones 001–004, RLS de tablas, RPC, arquitectura, otros componentes**: sin tocar.

## Bugs detectados fuera de scope

- **Rate limiting en memoria — limitación inherente (no bug, caveat documentado):** el `Map` vive en la memoria del proceso. En producción serverless (Vercel) cada instancia tiene su propio `Map` y se reinicia en cada cold start/redeploy, por lo que el límite no es global ni persistente. Es un freno básico efectivo contra ráfagas desde una sola instancia, pero para garantía real a escala se necesita un store compartido (Upstash/Vercel KV). Documentado en el propio archivo. No corregido (la tarea pidió explícitamente "un Map en memoria" y "no instales librerías nuevas").
- **`/api/storage/upload` no valida tipo MIME real ni extensión (solo tamaño 5 MB):** acepta cualquier archivo (`accept="image/*"` solo es del lado cliente). Un autenticado podría subir contenido no-imagen a su propia carpeta. Riesgo bajo (acotado a su negocio, bucket de assets, lectura pública). **Detectado, no corregido** (fuera de scope).
- **Logo huérfano por cambio de extensión:** con nombre fijo `logo.<ext>`, si el usuario sube primero `logo.png` y luego `logo.jpg`, el `.png` anterior queda sin referencia en el bucket (cruft menor, no riesgo de seguridad). Anotado; no corregido.
- **Pendientes ya documentados en `docs/BUGS_PENDING.md`** (lectura de `suscripciones` por cajeros; verificación de email en registro): sin relación con esta tarea, no tocados.

## Estado final (build, migration aplicada, qué funciona)

- **Build:** `tsc --noEmit` exit 0 · `next build` exit 0 (todas las rutas + middleware compilan).
- **Migration aplicada:** `005_storage_policy` aplicada a la BD real (`lisjbutidntalmobgjso`) y verificada por introspección de `pg_policy` (insert/update acotados por `get_negocio_id()`, read pública intacta). Repo == BD.
- **Qué funciona / verificado:**
  - TAREA 1: lógica de rate limiting compila y queda como guard al inicio del `POST` (3 intentos / 15 min por IP → 429 con el mensaje exacto). Verificación a nivel de build + revisión de lógica; **no** se ejecutó una prueba de carga real de 4 POST contra el endpoint.
  - TAREA 2: políticas de escritura del bucket ahora exigen que el primer segmento de la ruta sea el `negocio_id` del usuario (confirmado en la BD). El upload del logo apunta a `negocio_id/logo.<ext>`. La verificación fue a nivel de definición de políticas (introspección SQL) + build; **no** se ejecutó una prueba runtime de subir un archivo a la carpeta de otro negocio para confirmar el rechazo 403.
- **Recomendado antes de cerrar:** prueba runtime con dos negocios — confirmar (a) 429 tras 3 registros desde la misma IP y (b) que un usuario no puede escribir en `<otro_negocio_id>/...` (debe fallar por RLS) y sí en el suyo.

## Número de reporte: 002
