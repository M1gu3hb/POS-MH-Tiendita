# PROJECT_CONTEXT — POS MH Tiendita

## Qué es

**POS MH Tiendita** es un punto de venta (POS) SaaS para tienditas y abarrotes en
México. Permite vender, cobrar (efectivo/tarjeta/transferencia/mixto), imprimir
tickets, controlar inventario, registrar compras y gastos, hacer cortes de caja,
y ver reportes financieros. Incluye un escáner móvil que alimenta el carrito del
POS de escritorio en tiempo real y una "vista cliente" que muestra el carrito en
vivo a la persona que compra.

- **Nombre en clave del paquete original:** `tienda-mh-flow` / `base44-app`
- **Origen:** construido en **Base44** (Vite + React JSX + SDK de Base44).
- **Objetivo de esta migración:** dejar el proyecto **100% independiente de Base44**,
  corriendo en **Next.js 14 (App Router) + Supabase**, con los problemas
  arquitectónicos corregidos desde la base (multi-tenancy real, modelo de
  usuario/negocio, carrito relacional, audit log).

## Stack de destino

| Capa        | Tecnología |
|-------------|------------|
| Frontend    | Next.js 14 (App Router) + React 18 + TypeScript |
| Estilos     | Tailwind CSS v3 + shadcn/ui (estética skeuomórfica preservada) |
| Auth        | Supabase Auth (email/password + magic link) |
| Base datos  | Supabase (PostgreSQL) con Row Level Security |
| Storage     | Supabase Storage (reemplaza `integrations.Core.UploadFile`) |
| Backend     | Next.js API Routes (reemplazan las 5 Deno functions de Base44) |
| Pagos       | Stripe (checkout, portal, webhook) |
| Estado      | TanStack Query v5 (server state) |
| Deploy      | Vercel (preparado, no desplegado) |

## Problemas del original que esta migración corrige

1. **Sin multi-tenancy real** — el RLS original aislaba por `created_by = email`,
   así un dueño y su cajero no compartían datos. → Columna `negocio_id` + RLS por negocio.
2. **Sin modelo de Usuario/Cajero** — `cajero_nombre` era un string suelto. → Tabla `usuarios`.
3. **Sin entidad Negocio/Tenant** — config plana. → Tabla `negocios` como raíz del tenant.
4. **`items_json` / `datos_snapshot_json`** anti-patrón. → `carrito_items` relacional + `jsonb` nativo.
5. **Sin modelo de Sucursal.** → Tabla `sucursales` + `sucursal_id` opcional.
6. **Sin AuditLog.** → Tabla `audit_log` (escritura server-side).
7. **Suscripción sin FK al Negocio.** → `suscripciones.negocio_id`.
8. **`ProtectedRoute` desconectado.** → `middleware.ts` de Next.js protege rutas en el servidor.

## Reglas de la migración (resumen)

- No se agregan features nuevas ni se cambia el diseño visual.
- Sin `any` en TypeScript.
- Ningún componente llama a Supabase directamente: todo pasa por `src/lib/db/`.
- El webhook de Stripe siempre valida la firma.
- Toda venta cancelada genera un registro en `audit_log`.
- No se usa `localStorage` para estado de negocio (solo preferencias de UI).

## Estado actual

Ver `docs/CHANGELOG.md` para el avance por fase y `docs/NEXT_STEPS.md` para lo que sigue.
La fuente original (Base44/Vite) se conserva en `extracted/` como referencia de solo
lectura durante la migración (excluida del build y de git).
