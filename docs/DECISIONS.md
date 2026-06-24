# DECISIONS — Registro de decisiones arquitectónicas

Formato por entrada: Contexto · Decisión · Alternativas descartadas · Consecuencias.

---

## [2026-06-24] Decisión: Construir el proyecto Next.js en la raíz del repo, conservar `extracted/` como referencia
**Contexto:** El proyecto llegó como ZIP (`tienda-mh-flow.zip`), extraído en `extracted/`.
La migración reescribe estructura, configs y capa de datos.
**Decisión:** El nuevo proyecto Next.js vive en la raíz (`app/`, `src/`, `supabase/`, `docs/`).
`extracted/` se mantiene como copia de **solo lectura** de la fuente original Base44/Vite, excluida
del build (`tsconfig` `exclude`) y de git (`.gitignore`).
**Alternativas descartadas:** Construir en un subdirectorio (`pos-tiendita/`) — añade un nivel
innecesario y complica los paths de despliegue en Vercel.
**Consecuencias:** Durante la migración se copia/porta código desde `extracted/` hacia `src/`.
Al cerrar la migración, `extracted/` puede eliminarse.

## [2026-06-24] Decisión: `next.config.mjs` en lugar de `next.config.ts`
**Contexto:** El prompt (sección 12) pide `next.config.ts`, pero el stack fija **Next.js 14**.
**Decisión:** Usar `next.config.mjs`.
**Alternativas descartadas:** `next.config.ts` — la carga nativa de config en TypeScript llegó en
**Next.js 15**; en Next 14 no se soporta sin tooling extra y rompería `npm run dev`.
**Consecuencias:** Config en JS con JSDoc `@type`. Si se actualiza a Next 15+, se puede renombrar a `.ts`.

## [2026-06-24] Decisión: Alias `@/*` → `./src/*`
**Contexto:** ~80 componentes de UI y todos los hooks/utils del original importan con `@/...`
asumiendo `@ = src`. El App Router de Next vive en `app/`.
**Decisión:** `tsconfig` mapea `@/* → ./src/*`. Los archivos de `app/` importan código compartido
vía `@/...` (apunta a `src/`) o rutas relativas dentro de `app/`.
**Alternativas descartadas:** `@/* → ./*` (convención común en Next) — obligaría a reescribir cientos
de imports en los componentes migrados.
**Consecuencias:** Migración de componentes/hooks/utils con cambios de import mínimos o nulos.

## [2026-06-24] Decisión: Helpers RLS como `SECURITY DEFINER`
**Contexto:** El snippet del prompt define `get_negocio_id()`/`get_user_rol()` sin `security definer`.
Como la política SELECT de `usuarios` es `negocio_id = get_negocio_id()` y la función consulta
`usuarios`, en modo `SECURITY INVOKER` (por defecto) se produce **recursión infinita** de políticas.
**Decisión:** Declarar ambos helpers `security definer set search_path = public`, de modo que lean
`usuarios` saltándose RLS y rompan el ciclo. Patrón oficial recomendado por Supabase.
**Alternativas descartadas:** Política especial sin la función en `usuarios` — más frágil y duplicada.
**Consecuencias:** Las funciones corren con privilegios del owner. Se acota el riesgo con
`set search_path = public` y `grant execute ... to authenticated`.

## [2026-06-24] Decisión: Añadir `stripe` (SDK de servidor) a las dependencias
**Contexto:** El original solo trae `@stripe/stripe-js` y `@stripe/react-stripe-js` (cliente). Las
funciones Deno de Base44 usaban el SDK de servidor de Stripe, que ahora vive en las API Routes.
**Decisión:** Añadir `stripe` (Node) a `dependencies`. No es una feature nueva: es la pieza de servidor
equivalente a la que ya existía en las Deno functions.
**Alternativas descartadas:** Llamar a la API REST de Stripe a mano — más propenso a errores y sin tipos.
**Consecuencias:** Las API Routes (`app/api/stripe/*`) usan `stripe` server-side con `STRIPE_SECRET_KEY`.

## [2026-06-24] Decisión: Quitar `react-router-dom`; el ruteo lo maneja el App Router
**Contexto:** El original rutea con `react-router-dom` (`BrowserRouter`, `useNavigate`, `Link`,
`useSearchParams`). Next.js App Router tiene su propio ruteo basado en archivos.
**Decisión:** Eliminar `react-router-dom` de las dependencias. Las páginas migradas usarán
`next/navigation` (`useRouter`, `usePathname`, `useSearchParams`) y `next/link`.
**Alternativas descartadas:** Mantener react-router dentro de Next — duplica el sistema de ruteo y
rompe SSR/segmentos.
**Consecuencias:** Cada página migrada (Fase 5) debe reescribir su navegación. Hasta entonces, las
páginas portadas no compilarán si conservan imports de react-router (se migran una a una).

## [2026-06-24] Decisión: ESLint 8 + `eslint-config-next` (en vez de ESLint 9 flat config)
**Contexto:** El original usaba ESLint 9 con flat config (`eslint.config.js`) y plugins de Vite.
**Decisión:** Adoptar el setup estándar de Next 14: ESLint 8 + `eslint-config-next` + `.eslintrc.json`
con `next/core-web-vitals`.
**Alternativas descartadas:** Forzar ESLint 9 flat config con Next 14 — soporte inmaduro y fricción.
**Consecuencias:** Se eliminan plugins específicos de Vite (`eslint-plugin-react-refresh`, etc.).

## [2026-06-24] Decisión: Registro vía admin `createUser` + RPC transaccional (no `signUp` cliente)
**Contexto:** El alta debe crear `auth.users` + `negocios` + `usuarios` + `configuracion` +
`suscripciones` de forma consistente. Con `signUp` del cliente y confirmación de correo no hay
sesión inmediata para crear el tenant, y una transacción SQL no puede incluir la creación del
usuario de auth (es vía Auth API, no SQL).
**Decisión:** `/api/negocio/register` usa el cliente admin: `admin.auth.admin.createUser({email_confirm:true})`
y luego la RPC `crear_negocio_inicial` (SECURITY DEFINER, transaccional) para el resto. Si la RPC
falla, se borra el usuario de auth (compensación).
**Alternativas descartadas:** `signUp` cliente + trigger `on auth.users` — el trigger no puede
recibir `nombre_negocio`/`nombre_visible` del formulario sin metadata frágil; peor trazabilidad de errores.
**Consecuencias:** Registro atómico y utilizable de inmediato. Caveat: auto-confirma el correo
(sin verificación). Si se requiere verificación, migrar a flujo con confirmación (ver BUGS_PENDING).

## [2026-06-24] Decisión: Toaster de `sonner` en los Providers
**Contexto:** El original montaba el Toaster de Radix (`@/components/ui/toaster`) pero usaba
`toast` de `sonner` en el código. Los componentes UI aún no se migran (Fase 5).
**Decisión:** Montar `<Toaster />` de `sonner` en `Providers.tsx`. Es autocontenido y coincide con
el `toast` de `sonner` ya usado.
**Alternativas descartadas:** Migrar ya el Toaster de Radix — arrastraría dependencias de UI antes
de tiempo.
**Consecuencias:** Si en Fase 5 se decide conservar el Toaster de Radix, se reevalúa; por ahora sonner cubre todo.

## [2026-06-24] Decisión (rule 6): `Compras.jsx` y `Gastos.jsx` se consolidan en Egresos
**Contexto:** En el original, las rutas `/compras` y `/gastos` ya redirigían a `Egresos`; las
páginas `pages/Compras.jsx` y `pages/Gastos.jsx` quedaban huérfanas (no enrutadas).
**Decisión:** No se migran como páginas propias. Su funcionalidad vive en `app/(dashboard)/egresos`
(pestañas Compras / Gastos / Proveedores). En Next App Router no se crean rutas `/compras` ni `/gastos`.
**Alternativas descartadas:** Recrear rutas redirect — innecesario; el nav solo apunta a `/egresos`.
**Consecuencias:** Una sola superficie para egresos. Los archivos originales quedan en `extracted/` como referencia.

## [2026-06-24] Decisión: Páginas migradas como `.jsx`; carrito con vista de mapeo
**Contexto:** Las primitivas shadcn `.jsx` (forwardRef sin tipos) pierden el tipo de props al
consumirse desde `.tsx`. Además, los componentes de venta esperan la forma de item antigua
(`nombre`/`precio`), pero el carrito ahora es `CarritoItem` (`producto_nombre`/`precio_unitario`).
**Decisión:** Portar las páginas como `.jsx` (no se type-checkean, evitan el conflicto de tipos) y,
en Venta, derivar una `carritoView` que mapea `CarritoItem` → la forma que esperan los componentes,
traduciendo además índice↔id en `onUpdateQty`/`onRemove`.
**Alternativas descartadas:** Convertir las ~50 primitivas a TSX tipado — alto costo sin beneficio inmediato.
**Consecuencias:** Migración mucho más rápida y de bajo riesgo. Las páginas no tienen cobertura de
tipos estricta (sí la tienen la capa de datos, auth y API, que son `.ts`).

## [2026-06-24] Decisión: `audit_log` de solo lectura para clientes
**Contexto:** El patrón estándar del prompt daría CRUD completo a los miembros, pero la sección 2.6
indica que el audit log se escribe **server-side**.
**Decisión:** En `audit_log` solo se crea política de SELECT para miembros. Las inserciones ocurren
con `service_role` (ignora RLS). Sin políticas de UPDATE/DELETE para clientes → registro inalterable.
**Alternativas descartadas:** CRUD completo por miembro — permitiría manipular/borrar evidencia de auditoría.
**Consecuencias:** Toda escritura de auditoría debe pasar por las API Routes con la service role key.

## [2026-06-24] Decisión: Alinear el código al RPC real `registrar_negocio` (repo == BD)
**Contexto:** La BD desplegada (migración `003_register_rpc` del usuario) tiene la función
`registrar_negocio(p_auth_user_id, p_nombre_negocio, p_nombre_visible, p_email)` que **devuelve json**,
pero `route.ts` y el `003_functions.sql` del repo llamaban a `crear_negocio_inicial` (3 params, returns uuid).
El registro devolvía 500: "Could not find the function public.crear_negocio_inicial(...)".
**Decisión:** Introspeccionar la BD (vía Supabase MCP) para obtener el nombre/firma reales y **alinear
el código y la migración** a `registrar_negocio` (4 params, returns json `{negocio_id, usuario_id}`).
No se renombró la función en la BD.
**Alternativas descartadas:** Crear `crear_negocio_inicial` en la BD para que coincida con el código —
duplicaría funciones y se alejaría de lo ya desplegado.
**Consecuencias:** Una sola fuente de verdad. Regla operativa: si repo y BD divergen, **introspeccionar
la BD real** antes de cambiar código.

## [2026-06-24] Decisión: Hardening de `registrar_negocio` (SECURITY DEFINER seguro)
**Contexto:** La función estaba como `SECURITY DEFINER` **sin `search_path` fijo** y con `EXECUTE`
para `anon`/`authenticated`/`public`. Como la anon key viaja en el bundle del cliente, cualquiera podía
llamarla directo (`/rest/v1/rpc/registrar_negocio`) y crear negocios/usuarios saltándose la API route.
**Decisión:** `alter function ... set search_path = public`; `revoke execute ... from anon, authenticated, public`;
`grant execute ... to service_role`. Aplicado en BD y en `003_functions.sql`. La API route usa la service role key, así que sigue funcionando.
**Alternativas descartadas:** Validaciones extra dentro de la función — no cierran el vector de abuso por anon.
**Consecuencias:** El alta de tenant solo es invocable server-side. Patrón a replicar en futuras funciones SECURITY DEFINER.

## [2026-06-24] Decisión: Bucket `negocio-assets` público + políticas de escritura autenticada
**Contexto:** `/api/storage/upload` usa el cliente de servidor ligado a la sesión del usuario (rol
`authenticated`), sujeto a RLS de `storage.objects`. Un bucket público solo habilita lectura; sin
políticas, los `insert` quedan denegados.
**Decisión:** Crear el bucket `negocio-assets` público + 3 políticas en `storage.objects`: SELECT público,
INSERT/UPDATE para `authenticated`, todas acotadas a `bucket_id = 'negocio-assets'`. Capturado en `004_storage_realtime.sql`.
**Alternativas descartadas:** Subir con service role desde la ruta — innecesario y menos granular que RLS por rol.
**Consecuencias:** La subida de logo funciona para usuarios autenticados; las imágenes son de lectura pública (URL).

## [2026-06-24] Decisión: Capturar Storage + Realtime en `004_storage_realtime.sql`
**Contexto:** El bucket y la publicación Realtime son estado de BD que el repo no reflejaba.
**Decisión:** Crear `supabase/migrations/004_storage_realtime.sql` (idempotente) con el bucket, sus
políticas y el `alter publication supabase_realtime add table ...` para `scan_events`, `carrito_items`,
`carritos_activos`. Aplicado el mismo SQL a la BD (repo == BD).
**Consecuencias:** Reproducible en un entorno nuevo. Hoy son 4 migraciones: 001, 002, 003, 004.

<!-- Última actualización: 2026-06-24 — Sesión de migración Base44 → Next.js 14 + Supabase -->
