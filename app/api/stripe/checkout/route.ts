import { NextResponse } from 'next/server';
import { getServerAuthContext } from '@/lib/auth/server';
import { getStripe } from '@/lib/stripe/server';
import { createAdminClient } from '@/lib/db/supabase-server';
import type { Suscripcion } from '@/lib/db/types';

/**
 * POST /api/stripe/checkout — antes `createStripeCheckoutSession`.
 * Crea una Checkout Session (modo subscription) con 7 días de prueba.
 * La suscripción se identifica por `negocio_id` (no por created_by/email).
 */
export async function POST(): Promise<NextResponse> {
  const ctx = await getServerAuthContext();
  if (!ctx || !ctx.negocioId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const stripe = getStripe();
  const priceId = process.env.STRIPE_PRICE_ID_MONTHLY;
  const appBase = process.env.NEXT_PUBLIC_APP_URL ?? '';

  if (!stripe || !priceId) {
    return NextResponse.json(
      {
        error: 'stripe_not_configured',
        message: 'Stripe pendiente de configurar. Faltan STRIPE_SECRET_KEY o STRIPE_PRICE_ID_MONTHLY.',
      },
      { status: 503 },
    );
  }

  const admin = createAdminClient();
  const { data: existingRow } = await admin
    .from('suscripciones')
    .select('*')
    .eq('negocio_id', ctx.negocioId)
    .maybeSingle();
  const existing = (existingRow as Suscripcion | null) ?? null;

  if (existing && ['trialing', 'active'].includes(existing.estado)) {
    return NextResponse.json(
      { error: 'already_subscribed', message: 'Tu suscripción ya está activa.' },
      { status: 400 },
    );
  }

  let customerId = existing?.stripe_customer_id ?? null;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: ctx.email ?? undefined,
      name: ctx.usuario?.nombre_visible ?? ctx.email ?? undefined,
      metadata: { negocio_id: ctx.negocioId, app: 'pos_mh_tiendita' },
    });
    customerId = customer.id;
  }

  const trialDays = existing?.trial_usado ? undefined : 7;
  const successUrl = `${appBase}/suscripcion/success?session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${appBase}/suscripcion/cancel`;

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: {
      ...(trialDays ? { trial_period_days: trialDays } : {}),
      metadata: { negocio_id: ctx.negocioId, app: 'pos_mh_tiendita' },
    },
    payment_method_collection: 'always',
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: { negocio_id: ctx.negocioId, app: 'pos_mh_tiendita' },
  });

  // Pre-registrar el session_id en la suscripción del negocio.
  if (existing) {
    await admin
      .from('suscripciones')
      .update({ stripe_customer_id: customerId, stripe_checkout_session_id: session.id })
      .eq('negocio_id', ctx.negocioId);
  } else {
    await admin.from('suscripciones').insert({
      negocio_id: ctx.negocioId,
      stripe_customer_id: customerId,
      stripe_checkout_session_id: session.id,
      stripe_price_id: priceId,
      estado: 'sin_suscripcion',
      trial_usado: false,
    });
  }

  return NextResponse.json({ url: session.url, sessionId: session.id });
}
