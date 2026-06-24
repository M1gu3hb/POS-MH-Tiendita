import { NextResponse } from 'next/server';
import { getServerAuthContext } from '@/lib/auth/server';
import { getStripe } from '@/lib/stripe/server';
import { createAdminClient } from '@/lib/db/supabase-server';

/**
 * POST /api/stripe/portal — antes `createStripeCustomerPortalSession`.
 * Abre el Billing Portal de Stripe para gestionar la suscripción.
 */
export async function POST(): Promise<NextResponse> {
  const ctx = await getServerAuthContext();
  if (!ctx || !ctx.negocioId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const stripe = getStripe();
  const appBase = process.env.NEXT_PUBLIC_APP_URL ?? '';
  if (!stripe) {
    return NextResponse.json({ error: 'stripe_not_configured' }, { status: 503 });
  }

  const admin = createAdminClient();
  const { data: sub } = await admin
    .from('suscripciones')
    .select('stripe_customer_id')
    .eq('negocio_id', ctx.negocioId)
    .maybeSingle();

  const customerId = (sub as { stripe_customer_id: string | null } | null)?.stripe_customer_id;
  if (!customerId) {
    return NextResponse.json(
      { error: 'no_customer', message: 'Primero inicia tu prueba gratis.' },
      { status: 400 },
    );
  }

  const portal = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${appBase}/cuenta`,
  });

  return NextResponse.json({ url: portal.url });
}
