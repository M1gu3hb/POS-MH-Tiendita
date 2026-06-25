# Reporte 006 — claude-code — fix: nombre negocio en sidebar via useNegocio + ledger reconciliado

## Tarea recibida

REGLA ABSOLUTA: Haz ÚNICAMENTE lo que este prompt indica. Nada más.

TAREA 1 — Exponer nombre del negocio en sidebar
Problema: layout.tsx muestra fallback 'POS MH' porque useConfig solo expone configuracion_negocio, no el nombre real de la tabla negocios.
Fix:
1. En src/lib/db/configuracion.ts agrega una función getNegocio() que haga SELECT id, nombre FROM negocios WHERE id = [negocio_id del usuario actual]. Usa el patrón exacto que ya usan las otras funciones del mismo archivo.
2. Crea src/hooks/useNegocio.js siguiendo el mismo patrón de useConfig.js — useQuery que llama getNegocio().
3. En app/(dashboard)/layout.tsx importa useNegocio y muestra negocio.nombre con fallback 'POS MH'.
No toques useConfig ni ningún otro archivo existente.

TAREA 2 — Reconciliar ledger de migraciones
Problema: la tabla schema_migrations de la BD no registra la migración 004, aunque sus objetos existen. El ledger no coincide con la carpeta supabase/migrations/.
Fix: ejecuta en la BD real este INSERT (solo si el registro no existe ya):
INSERT INTO supabase_migrations.schema_migrations (version, name, statements)
SELECT '20260624214041', '004_storage_realtime', ARRAY[]::text[]
WHERE NOT EXISTS (SELECT 1 FROM supabase_migrations.schema_migrations WHERE name = '004_storage_realtime');
Verifica después que supabase migration list muestre las 6 migrations en orden.

Commit + push con mensaje: "fix: nombre negocio en sidebar via useNegocio + ledger migraciones reconciliado"

## Lo que hice (archivo por archivo)

**`src/lib/db/configuracion.ts`** (TAREA 1.1)
- Añadí `getNegocio(negocioId)` siguiendo el patrón exacto de `getConfiguracion`/`updateConfiguracion`:
  `supabase.from('negocios').select('id, nombre').eq('id', negocioId).maybeSingle().returns<Pick<Negocio,'id'|'nombre'> | null>()`, `if (error) throw error; return data ?? null`.
- Añadí `Negocio` al import de tipos existente (`import type { ConfiguracionNegocio, Negocio } from '@/lib/db/types'`).

**`src/hooks/useNegocio.js`** (TAREA 1.2 — nuevo)
- Mismo patrón que `useConfig`: `useQuery` con `queryKey ['negocio', negocioId]`, `queryFn: () => getNegocio(negocioId)`, `enabled: !!negocioId`, `staleTime` 5 min. Devuelve `{ negocio, isLoading }`.
- Creado como `.js` tal como pide el prompt (nota: el `useConfig` real es `.ts`; ver "fuera de scope").

**`app/(dashboard)/layout.tsx`** (TAREA 1.3)
- Importé `useNegocio` y añadí `const { negocio } = useNegocio();`.
- `const nombre = negocio?.nombre || 'POS MH';` (antes era el literal `'POS MH'`).
- El nombre se obtiene por la capa de datos (`src/lib/db/configuracion.ts`), **sin** consultar Supabase directamente desde el layout (se respeta la regla de arquitectura; no se reintrodujo el fetch directo que se había removido en el reporte 005).

**BD real `lisjbutidntalmobgjso` — ledger** (TAREA 2)
- **Corrección necesaria del INSERT:** la `version` indicada `'20260624214041'` **ya pertenece a `003_register_rpc`** (es la PK de `schema_migrations`). El guard `WHERE NOT EXISTS` filtra por `name`, no por `version`, así que **no** evitaba la colisión: el INSERT habría fallado con `duplicate key value violates unique constraint "schema_migrations_pkey"`, y aun sin fallar habría empatado con 003 (rompiendo el "en orden").
- Lo **consulté contigo** (el valor exacto es decisión del dueño del ledger) y elegiste **`20260624214042`** (un segundo después de 003, antes de 005 — ordena correcto). Ejecuté el INSERT con esa versión vía `execute_sql`, resto idéntico (mismo guard idempotente por `name`):
  ```sql
  INSERT INTO supabase_migrations.schema_migrations (version, name, statements)
  SELECT '20260624214042', '004_storage_realtime', ARRAY[]::text[]
  WHERE NOT EXISTS (SELECT 1 FROM supabase_migrations.schema_migrations WHERE name = '004_storage_realtime');
  ```
- **Verificado** (`list_migrations`): el ledger ahora lista 6 migraciones en orden — 001, 002, 003_register_rpc, **004_storage_realtime (20260624214042)**, 005_storage_policy, 006_rls_cajeros.

## Lo que NO toqué

- **`src/hooks/useConfig.ts`**: no modificado (instrucción explícita).
- **Ningún otro archivo existente** fuera de los 3 nombrados (`configuracion.ts`, `useNegocio.js` nuevo, `layout.tsx`).
- **Nombre del ledger de `003`** (`003_register_rpc` vs archivo `003_functions.sql`): no tocado — fuera del alcance de TAREA 2, que solo pedía reconciliar `004`.
- **Cambios en curso de otros agentes** en el working tree (`docs/BUGS_PENDING.md`, `docs/CHANGELOG.md`, `docs/reports/_AUDIT_LOG.md`): excluidos del commit (pathspec acotado a mis archivos).

## Bugs detectados fuera de scope

1. **INSERT de TAREA 2 con `version` colisionante (corregido con tu visto bueno).** `20260624214041` ya era de `003_register_rpc`. Resuelto usando `20260624214042` tras consultarte. Documentado aquí por trazabilidad.
2. **`003` sigue con nombre distinto en el ledger** (`003_register_rpc`) respecto al archivo `003_functions.sql`. Discrepancia preexistente (ver reporte 005); fuera del alcance de esta tarea (solo se reconcilió 004). El objeto (RPC `registrar_negocio`) existe y funciona.
3. **`useNegocio.js` es `.js` en un directorio de hooks `.ts`.** Se creó así por instrucción literal del prompt; `useConfig` real es `.ts`. Funciona (allowJs activo), pero queda como archivo sin tipos, inconsistente con la convención TS del repo. El consumo en `layout.tsx` (`negocio?.nombre`) compila sin error.

## Estado final (build verde, nombre del negocio visible, ledger reconciliado)

- **Build:** `tsc --noEmit` exit 0 · `next build` exit 0.
- **Nombre del negocio:** `layout.tsx` ahora muestra `negocio?.nombre` (de `negocios.nombre`) vía `useNegocio` → `getNegocio` (capa de datos, sin Supabase directo en el componente). Usa la misma consulta que antes funcionaba (mismo cliente/sesión y RLS sobre `negocios`), ahora bien encapsulada. **Nivel de verificación:** build + trazado del path de datos; **no** se hizo prueba runtime en navegador. Recomendado: abrir el dashboard y confirmar visualmente el nombre real.
- **Ledger reconciliado:** confirmado por `list_migrations` — 6 migraciones en orden (004 ahora registrado con `20260624214042`). Repo == BD a nivel de objetos; el ledger coincide en 5/6 nombres (queda el desajuste preexistente de `003`, fuera de alcance).

## Número de reporte: 006
