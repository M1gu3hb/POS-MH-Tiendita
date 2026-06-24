# FILE_MAP — Árbol del proyecto

Descripción de cada archivo del proyecto **migrado** (no de `extracted/`, que es la
fuente original de referencia). Se actualiza conforme avanzan las fases.

```
pos-mh-tiendita/
├── ARCHITECTURE.md             Resumen de alto nivel (<2 min)
├── PROJECT_CONTEXT.md          Qué es el proyecto, stack, objetivo
├── README.md                   Setup local (env, migraciones, scripts)
├── SECURITY.md                 Decisiones y controles de seguridad
├── package.json                Deps (Next + Supabase + Stripe; sin Base44/Vite)
├── next.config.mjs             Config de Next (images: hosts de Supabase)
├── tsconfig.json               TS estricto, alias @/* → ./src/*, excluye extracted
├── tailwind.config.ts          Tailwind portado 1:1 (content → app/ + src/)
├── postcss.config.js           Tailwind + autoprefixer
├── components.json             Config de shadcn/ui
├── .eslintrc.json              next/core-web-vitals
├── .env.example                Variables (Supabase, Stripe, App)
├── middleware.ts               Borde de seguridad → updateSession
│
├── app/                        Next.js App Router
│   ├── layout.tsx              Layout raíz (monta <Providers>)
│   ├── globals.css             Tokens HSL + clases skeuomórficas (.skeu-*) portadas
│   ├── (auth)/
│   │   ├── layout.tsx          Layout centrado de auth
│   │   ├── login/page.tsx      Login (password + magic link)
│   │   └── register/page.tsx   Alta de negocio (→ /api/negocio/register)
│   └── api/
│       └── negocio/register/route.ts   Alta: admin createUser + RPC transaccional
│
├── src/
│   ├── components/
│   │   └── providers/Providers.tsx     Theme + Query + Auth + Toaster (cliente)
│   └── lib/
│       ├── query-client.ts             Factory de QueryClient (portado)
│       ├── auth/
│       │   ├── AuthContext.tsx         Supabase Auth: sesión + perfil de negocio
│       │   ├── useAuth.ts              Re-export del hook useAuth
│       │   └── middleware.ts           updateSession (refresco sesión + protección rutas)
│       └── db/                         CAPA DE DATOS (única que toca Supabase)
│           ├── supabase.ts             Cliente de navegador (createBrowserClient)
│           ├── supabase-server.ts      Cliente servidor + admin (service role) [server-only]
│           ├── types.ts                Tipos de dominio de las 20 tablas + enums
│           ├── usuarios.ts             Repo usuarios (perfil por auth_user_id)
│           ├── productos.ts            Repo productos (CRUD + búsqueda + barcode)
│           ├── configuracion.ts        Repo configuracion_negocio
│           └── audit.ts                Repo audit_log (solo escritura, server-only)
│
├── supabase/migrations/
│   ├── 001_initial_schema.sql  20 tablas, índices, extensiones
│   ├── 002_rls.sql             RLS + helpers SECURITY DEFINER + políticas por negocio
│   └── 003_functions.sql       crear_negocio_inicial (alta transaccional del tenant)
│
├── docs/                       Documentación viva (este directorio)
└── extracted/                  Fuente original Base44/Vite (solo referencia, fuera del build)
```

## Pendiente de crear (próximas fases)

- **Repositorios** restantes (`src/lib/db/`): `ventas.ts`, `inventario.ts`, `caja.ts`,
  `egresos.ts`, `reportes.ts`, `suscripcion.ts`.
- **Hooks** migrados (`src/hooks/`): reemplazar `base44.entities.*` por repositorios.
- **API Routes** (`app/api/`): `stripe/{checkout,portal,webhook,status,refresh}`, `storage/upload`.
- **Componentes y páginas** (`src/components/`, `app/(dashboard)/`, `app/vista-cliente/`, `app/suscripcion/`): migración 1:1 con `"use client"`.
- **Realtime** del escáner (`scan_events`) y carrito.
