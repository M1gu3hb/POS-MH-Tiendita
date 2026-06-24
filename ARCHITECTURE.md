# ARCHITECTURE (resumen de alto nivel)

> Para que otra persona o IA entienda el proyecto en menos de 2 minutos.
> Detalle completo en [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md).

**POS MH Tiendita** es un punto de venta SaaS (México) migrado de **Base44** a
**Next.js 14 (App Router) + Supabase + TypeScript**.

- **Frontend:** Next.js 14, React 18, Tailwind v3 + shadcn/ui (estética skeuomórfica). TanStack Query para estado de servidor.
- **Backend:** Next.js API Routes (reemplazan 5 Deno functions de Base44) + Supabase (Postgres, Auth, Storage, Realtime).
- **Multi-tenant:** todo dato lleva `negocio_id`; RLS aísla por negocio (no por usuario). Un dueño y sus cajeros comparten datos.
- **Auth:** Supabase Auth (cookies vía `@supabase/ssr`). `middleware.ts` protege rutas en el servidor.
- **Regla de oro:** ningún componente toca Supabase directo — todo pasa por `src/lib/db/*` (repositorios). Server-only marcado con `import 'server-only'`.

## Mapa rápido

| Carpeta | Qué hay |
|---------|---------|
| `app/` | Rutas, layouts y API Routes (App Router) |
| `app/(auth)/` | `/login`, `/register` |
| `app/api/` | `negocio/register` (+ Stripe y storage en Fase 4) |
| `src/lib/auth/` | `AuthContext.tsx`, `useAuth.ts`, `middleware.ts` |
| `src/lib/db/` | `supabase.ts` (browser), `supabase-server.ts` (server+admin), `types.ts`, repositorios |
| `src/components/` | UI (shadcn) + features (se migran en Fase 5) |
| `src/hooks/`, `src/utils/` | Hooks y utilidades (se migran en Fases 3/5) |
| `supabase/migrations/` | `001_initial_schema`, `002_rls`, `003_functions` |
| `docs/` | Documentación viva (arquitectura, BD, decisiones, bugs, changelog) |
| `extracted/` | Fuente original Base44/Vite (solo referencia, fuera del build) |

## Estado de la migración

Fase 1 (fundamentos) y Fase 2 (auth) completas; Fase 3 (capa de datos) con la base y
patrón de repositorio establecidos. Ver [`docs/CHANGELOG.md`](./docs/CHANGELOG.md) y
[`docs/NEXT_STEPS.md`](./docs/NEXT_STEPS.md).
