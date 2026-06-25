# Deploy en Vercel

## Pre-requisitos

- Cuenta en Vercel conectada a GitHub.
- Proyecto Supabase con migrations aplicadas.
- Variables reales de Supabase disponibles.
- (Opcional) Cuenta Stripe configurada.

## Pasos

1. Ir a vercel.com -> New Project.
2. Importar repositorio `M1gu3hb/POS-MH-Tiendita`.
3. Configurar variables de entorno en Vercel copiando la estructura de `.env.example`.
4. Deploy.

## Variables de entorno requeridas

- `NEXT_PUBLIC_SUPABASE_URL`: URL publica del proyecto Supabase.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: llave anon/publica de Supabase para cliente y SSR.
- `SUPABASE_SERVICE_ROLE_KEY`: llave service role usada solo por API routes y webhooks server-side.
- `STRIPE_SECRET_KEY`: llave secreta de Stripe. Requerida cuando se active Stripe.
- `STRIPE_PRICE_ID_MONTHLY`: Price ID mensual de Stripe. Requerido cuando se active Stripe.
- `STRIPE_WEBHOOK_SECRET`: secreto del webhook de Stripe. Requerido cuando se active Stripe.
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`: llave publica de Stripe para el cliente. Requerida cuando se active Stripe.
- `NEXT_PUBLIC_APP_URL`: URL publica real del deployment en Vercel.

## Post-deploy

1. Actualizar `NEXT_PUBLIC_APP_URL` en Vercel con la URL real del proyecto.
2. Actualizar `APP_BASE_URL` en Stripe webhook usando la URL real del deployment, si se documenta o gestiona con ese nombre en Stripe. En este proyecto, la URL base usada por las rutas de Stripe es `NEXT_PUBLIC_APP_URL`.
3. Verificar que el Service Worker se registra en produccion.
4. Probar registro de nuevo negocio end-to-end.

## Stripe (cuando se active)

1. En Stripe Dashboard, crear o confirmar el producto y precio mensual.
2. Copiar el Price ID mensual en `STRIPE_PRICE_ID_MONTHLY`.
3. Configurar `STRIPE_SECRET_KEY` y `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` con llaves live.
4. Crear un endpoint de webhook con la URL:

   ```text
   https://tu-dominio.vercel.app/api/stripe/webhook
   ```

5. Seleccionar los eventos usados por la app:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
6. Copiar el signing secret del endpoint en `STRIPE_WEBHOOK_SECRET`.
7. Hacer un checkout de prueba controlado y confirmar que la suscripcion se actualiza en Supabase.
