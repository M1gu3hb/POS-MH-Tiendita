# SECURITY — POS MH Tiendita

Decisiones y controles de seguridad de la migración. Complementa
[`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) y [`docs/DATABASE.md`](./docs/DATABASE.md).

## 1. Aislamiento multi-tenant (RLS)

- RLS habilitado en **todas** las tablas (`002_rls.sql`).
- El filtro es `negocio_id = get_negocio_id()`. `get_negocio_id()` y `get_user_rol()`
  son `SECURITY DEFINER` (leen `usuarios` saltándose RLS) para evitar recursión de
  políticas; acotadas con `set search_path = public` y `grant execute … to authenticated`.
- Restricciones de rol en RLS: `productos` DELETE solo `dueno`; `suscripciones` solo `dueno`.
  El resto de restricciones de rol se aplican en las API Routes.

## 2. Service role (bypass de RLS) — solo servidor

- `SUPABASE_SERVICE_ROLE_KEY` **nunca** se expone al cliente (sin prefijo `NEXT_PUBLIC_`).
- Se usa solo en `createAdminClient()` (`src/lib/db/supabase-server.ts`), módulo marcado
  con `import 'server-only'`: importarlo desde código de cliente es error de compilación.
- Operaciones que la usan: alta de negocio/usuario (`/api/negocio/register`), webhook de
  Stripe (Fase 4) y escritura de `audit_log`.

## 3. Autenticación y sesión

- Supabase Auth vía `@supabase/ssr`: la sesión vive en **cookies** gestionadas por el
  servidor, no en `localStorage` (que sería accesible a XSS).
- El middleware (`middleware.ts` → `updateSession`) usa `supabase.auth.getUser()` (revalida
  el token contra el servidor) para decisiones de acceso, **no** `getSession()`.
- Protección de rutas server-side: sin sesión → redirección a `/login`. Rutas públicas:
  `/login`, `/register`, `/vista-cliente`, retornos de Stripe y `/api/*` (que validan su propia auth).
- `localStorage` solo para preferencias de UI (prefijo `pos-mh-`), nunca datos de negocio.

## 4. Registro self-service

- `/api/negocio/register` valida la entrada con **Zod** (correo, contraseña ≥ 8, nombres).
- Crea el usuario de auth con `email_confirm: true` (alta inmediata utilizable). El tenant
  se crea con la RPC transaccional `crear_negocio_inicial`. Si la transacción falla, se
  revierte el usuario de auth (acción compensatoria) para no dejar cuentas huérfanas.
- **Pendiente / caveat:** auto-confirmar el correo omite verificación de email. Si se
  requiere verificación, cambiar a `signUp` del lado cliente + confirmación. Ver `docs/BUGS_PENDING.md`.
- `crear_negocio_inicial` es `SECURITY DEFINER` con `execute` **revocado** a
  `anon`/`authenticated` y concedido solo a `service_role`.

## 5. Audit log inalterable

- `audit_log` solo permite SELECT a miembros (RLS). No hay políticas de INSERT/UPDATE/DELETE
  para clientes → las escrituras pasan exclusivamente por `service_role` (server-side).
- Toda venta cancelada y todo ajuste de inventario debe generar un registro (Fase 4/5).

## 6. Variables de entorno

| Prefijo | Visibilidad | Ejemplos |
|---------|-------------|----------|
| `NEXT_PUBLIC_*` | **Cliente** (van al bundle) | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` |
| (sin prefijo) | **Solo servidor** | `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` |

- Plantilla en `.env.example`. `.env.local` está en `.gitignore`. Los clientes de Supabase
  lanzan error explícito si faltan sus variables.

## 7. Stripe (Fase 4 — planeado)

- El **webhook siempre valida la firma** (`STRIPE_WEBHOOK_SECRET`) antes de procesar, sin excepción.
- El webhook escribe en `suscripciones` con el cliente admin (service role).
- Claves secretas de Stripe solo server-side.

## 8. Pendientes de seguridad

Ver [`docs/BUGS_PENDING.md`](./docs/BUGS_PENDING.md): verificación de email opcional,
lectura de suscripción para cajeros, headers/CSP de producción, rate limiting en
`/api/negocio/register`.
