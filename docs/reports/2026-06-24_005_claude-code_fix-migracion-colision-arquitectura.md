# Reporte 005 — claude-code — fix: colisión migración 005→006 + RLS cajeros + arquitectura layout.tsx

## Tarea recibida

REGLA ABSOLUTA: Haz ÚNICAMENTE lo que este prompt indica. Nada más.

Hay una colisión crítica en supabase/migrations/ — existen dos archivos llamados 005:
- 005_storage_policy.sql (tuyo, ya aplicado a la BD)
- 005_rls_cajeros.sql (de antigravity, NO aplicado a la BD)

Haz esto en orden:
1. Renombra 005_rls_cajeros.sql → 006_rls_cajeros.sql
2. Aplica el contenido de 006_rls_cajeros.sql a la BD real (proyecto lisjbutidntalmobgjso).
   El contenido es:
   CREATE POLICY "suscripcion_select_cajero" ON suscripciones
   FOR SELECT USING (negocio_id = get_negocio_id());
   Si ya existe esa política con ese nombre, ignora el error y documéntalo.
3. Verifica que repo == BD: lista todas las migrations aplicadas en la BD y confirma que coinciden con los archivos en supabase/migrations/
4. En app/(dashboard)/layout.tsx, elimina el fetch directo a Supabase que metió antigravity y reemplázalo con el hook useConfig que ya existe en src/hooks/useConfig.js para mostrar el nombre del negocio. Si useConfig no expone el nombre directamente, lee el archivo y úsalo correctamente.
No toques ningún otro archivo.

Commit + push con mensaje: "fix: colisión migración 005→006 + RLS cajeros aplicado + arquitectura layout.tsx"

## Lo que hice (archivo por archivo)

**`supabase/migrations/005_rls_cajeros.sql` → `supabase/migrations/006_rls_cajeros.sql`** (paso 1)
- Renombrado con `git mv` (el archivo estaba trackeado; lo había commiteado antigravity en `0af8a53`). Resuelve la colisión: ahora hay un único `005` (`005_storage_policy.sql`) y el de cajeros pasa a `006`. Contenido del archivo sin cambios.

**BD real `lisjbutidntalmobgjso`** (paso 2) — aplicado vía Supabase MCP `apply_migration` (name `006_rls_cajeros`, `{ success: true }`):
```sql
CREATE POLICY "suscripcion_select_cajero" ON suscripciones
  FOR SELECT USING (negocio_id = get_negocio_id());
```
- No existía ninguna política con el nombre `suscripcion_select_cajero`, así que el CREATE se aplicó sin error. Verificado por introspección de `pg_policy`: la política existe con `using (negocio_id = get_negocio_id())`.
- Queda registrada en el ledger de migraciones (`version 20260625000839`, name `006_rls_cajeros`).
- **Observación (ver "fuera de scope"):** la tabla `suscripciones` YA tenía una política `suscripcion_select` con el predicado idéntico, por lo que la nueva es funcionalmente **redundante** (los cajeros ya podían leer). Se aplicó igualmente por instrucción explícita; no hubo colisión de nombre.

**`app/(dashboard)/layout.tsx`** (paso 4)
- Eliminé el **fetch directo a Supabase** que introdujo antigravity: el bloque `useQuery` que consultaba `supabase.from('negocios').select('nombre')` directamente desde el componente (violaba la regla de arquitectura "ningún componente toca Supabase directo; todo pasa por `src/lib/db/*`").
- Eliminé los imports e identificadores que quedaron huérfanos al quitar ese bloque: `import { useQuery }`, `import { supabase }`, `import { useAuth }` y `const { negocioId } = useAuth()` (solo se usaban en ese fetch).
- El nombre del negocio ahora usa el fallback `'POS MH'`. **Por qué:** `useConfig()` devuelve `configuracion_negocio`, que **no contiene el nombre del negocio** (vive en `negocios.nombre`); lo verifiqué leyendo `src/hooks/useConfig.ts`, `src/lib/db/types.ts` (`ConfiguracionNegocio`) y el esquema `001`. Como no puedo tocar otros archivos para exponer el nombre por la capa de datos, "usar useConfig correctamente" se traduce en: seguir usándolo para el `logo` (ya lo hacía) y caer al fallback documentado para el nombre, sin reintroducir el acceso directo a Supabase. Se conserva `useConfig` (alimenta el `logo`).
- Build verde tras los cambios: `tsc --noEmit` exit 0 · `next build` exit 0.

## Lo que NO toqué

- **`src/hooks/useConfig.ts`, `src/lib/db/configuracion.ts`, `src/lib/db/types.ts`**: solo los leí para decidir; la regla "no toques ningún otro archivo" lo prohíbe. (Nota: el prompt los referenció como `useConfig.js`, pero el archivo real es `useConfig.ts`.)
- **El ledger de migraciones de la BD** más allá de aplicar `006`: no renombré `003` ni registré `004` (ver discrepancias abajo) — no estaba en el alcance.
- **`005_storage_policy.sql`** y demás migraciones: sin cambios.
- **Cambios en curso de otros agentes en el working tree** (`docs/BUGS_PENDING.md`, `docs/CHANGELOG.md` modificados; `docs/reports/_AUDIT_LOG.md` sin trackear): NO los incluí en el commit (commit acotado por pathspec a mis archivos).

## Bugs detectados fuera de scope

1. **Ledger de migraciones ≠ archivos del repo (preexistente, no causado por esta tarea).** Al listar las migrations aplicadas (paso 3) aparecen 2 desajustes de bookkeeping:
   - `003_functions.sql` (archivo) figura en el ledger como **`003_register_rpc`** (nombre distinto). Es consistente con `docs/DECISIONS.md` (la función desplegada se llamó así); el objeto (RPC `registrar_negocio`) existe en la BD.
   - **`004_storage_realtime.sql` NO está en el ledger** de la BD, aunque sus objetos SÍ existen (bucket `negocio-assets`, políticas, publicación Realtime — verificado en el reporte 002). Se aplicó fuera del MCP/CLI y no quedó registrado.
   → Documentado, **no corregido** (la tarea pide verificar, no remediar el ledger; remediar implicaría manipular `schema_migrations`, fuera de alcance y arriesgado).
2. **Política `suscripcion_select_cajero` redundante.** La BD ya tenía `suscripcion_select` con el mismo predicado `negocio_id = get_negocio_id()`, así que los cajeros del negocio YA podían leer `suscripciones`. La nueva política no aporta acceso adicional (RLS hace OR de políticas SELECT). El pendiente "Lectura de `suscripciones` para cajeros" de `BUGS_PENDING.md` ya estaba de facto resuelto por la política desplegada. No corregido (se aplicó por instrucción).
3. **Regresión de UX en el nombre del negocio.** El sidebar vuelve a mostrar `'POS MH'` en lugar del nombre real (que antigravity sí mostraba, pero con un fetch que rompía la arquitectura). El arreglo correcto —exponer `negocios.nombre` por la capa de datos (p.ej. un `useNegocio` o añadirlo a `useAuth`)— requiere tocar otros archivos y queda fuera de alcance. Re-abre el ítem ya documentado "Nombre del negocio en el layout" en `BUGS_PENDING.md`.

## Estado final (repo == BD confirmado, build verde)

- **Build:** `tsc --noEmit` exit 0 · `next build` exit 0 (todas las rutas + middleware).
- **Colisión resuelta:** `supabase/migrations/` ya no tiene dos `005`. Archivos: `001`, `002`, `003_functions`, `004_storage_realtime`, `005_storage_policy`, `006_rls_cajeros`.
- **`006_rls_cajeros` aplicado y verificado** en la BD real (policy `suscripcion_select_cajero` presente; registrado en el ledger).
- **repo == BD — matización honesta:** los **objetos** de schema de las 6 migraciones están todos presentes y vigentes en la BD (verificado). El **ledger** de migraciones coincide en 4 de 6 entradas; las 2 diferencias (`003` con nombre `003_register_rpc`, `004` sin registrar) son **preexistentes** a esta tarea y están documentadas arriba como fuera de scope. Es decir: **repo == BD a nivel de objetos/efectos**, con desajuste de bookkeeping preexistente en el ledger. No se afirma un "repo == BD" total para no reportar de más.

## Número de reporte: 005
