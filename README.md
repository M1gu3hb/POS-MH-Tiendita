# POS MH Tiendita

Punto de venta (POS) SaaS para tienditas y abarrotes en México.
Migrado de **Base44** a **Next.js 14 (App Router) + Supabase**.

Para una introducción al proyecto y la arquitectura, lee
[`PROJECT_CONTEXT.md`](./PROJECT_CONTEXT.md) y [`ARCHITECTURE.md`](./ARCHITECTURE.md).

---

## Requisitos

- Node.js 18.18+ (recomendado 20 LTS)
- npm 9+ (o pnpm/yarn)
- Una cuenta de [Supabase](https://supabase.com) (proyecto + claves)
- Opcional para pagos: una cuenta de [Stripe](https://stripe.com)
- Opcional para desarrollo local de la BD: [Supabase CLI](https://supabase.com/docs/guides/cli)

## Setup local

```bash
# 1. Clonar e instalar dependencias
npm install

# 2. Variables de entorno
cp .env.example .env.local
#   …y rellena los valores (ver tabla abajo).

# 3. Base de datos
#    Opción A — Supabase remoto (panel web):
#      Abre tu proyecto → SQL Editor y ejecuta, en orden:
#        supabase/migrations/001_initial_schema.sql
#        supabase/migrations/002_rls.sql
#
#    Opción B — Supabase local (CLI):
#      supabase start        # levanta Postgres + Auth + Storage en Docker
#      supabase db reset     # aplica las migraciones de supabase/migrations/

# 4. Arrancar la app
npm run dev
#    → http://localhost:3000
```

## Variables de entorno

Copia `.env.example` a `.env.local`. Las variables con prefijo `NEXT_PUBLIC_`
se incluyen en el bundle del cliente; el resto son **solo server-side**.

| Variable | Ámbito | Descripción |
|----------|--------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | público | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | público | Clave anónima (respeta RLS) |
| `SUPABASE_SERVICE_ROLE_KEY` | **servidor** | Clave service role (ignora RLS). Solo API routes/webhooks. |
| `STRIPE_SECRET_KEY` | **servidor** | Clave secreta de Stripe |
| `STRIPE_PRICE_ID_MONTHLY` | **servidor** | ID del precio mensual de la suscripción |
| `STRIPE_WEBHOOK_SECRET` | **servidor** | Secreto para validar la firma del webhook |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | público | Clave publicable de Stripe |
| `NEXT_PUBLIC_APP_URL` | público | URL base de la app (`http://localhost:3000` en dev) |

> ⚠️ **Nunca** subas `.env.local` ni la `SUPABASE_SERVICE_ROLE_KEY` al repositorio.

## Scripts

| Script | Acción |
|--------|--------|
| `npm run dev` | Servidor de desarrollo (Next.js) |
| `npm run build` | Build de producción |
| `npm run start` | Sirve el build de producción |
| `npm run lint` | ESLint (next/core-web-vitals) |
| `npm run typecheck` | `tsc --noEmit` |

## Estructura

```
pos-mh-tiendita/
├── app/                  # Next.js App Router (rutas, layouts, API routes)
├── src/
│   ├── components/       # Componentes React (UI + features)
│   ├── hooks/            # Custom hooks (TanStack Query, etc.)
│   ├── lib/
│   │   ├── auth/         # Supabase Auth (AuthContext, useAuth)
│   │   └── db/           # Capa de repositorio (única que toca Supabase)
│   └── utils/            # Utilidades puras (currency, fechas, folios…)
├── supabase/migrations/  # 001_initial_schema.sql, 002_rls.sql
├── docs/                 # Documentación viva de la migración
└── extracted/            # Fuente original Base44 (solo referencia, fuera del build)
```

## Documentación

Toda la documentación de la migración vive en [`docs/`](./docs):
arquitectura, base de datos, mapa de archivos, decisiones, bugs pendientes,
próximos pasos y changelog.
