import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { getServerAuthContext } from '@/lib/auth/server';
import { getStripe, tsToIso } from '@/lib/stripe/server';
import { createAdminClient } from '@/lib/db/supabase-server';
import type { EstadoSuscripcion, Suscripcion } from '@/lib/db/types';

/**
 * POST /api/stripe/refresh — antes `refreshSubscriptionStatus`.
 * Consulta Stripe directamente y sincroniza el estado de la suscripción del
 * negocio. El webhook es la fuente principal; esto es respaldo (p.ej. al volver
 * de Checkout).
 */
export async function POST(): Promise<NextResponse> {
  const ctx = await getServerAuthContext();
  if (!ctx || !ctx.negocioId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const stripe = getStripe();
  if (!stripe) return NextResponse.json({ error: 'stripe_not_configured' }, { status: 503 });

  const admin = createAdminClient();
  const { data: subRow } = await admin
    .from('suscripciones')
    .select('*')
    .eq('negocio_id', ctx.negocioId)
    .maybeSingle();
  const sub = (subRow as Suscripcion | null) ?? null;

  if (!sub) {
    return NextResponse.json({ ok: true, estado: 'sin_suscripcion', suscripcion: null });
  }

  let subscription: Stripe.Subscription | null = null;
  if (sub.stripe_subscription_id) {
    try {
      subscription = await stripe.subscriptions.retrieve(sub.stripe_subscription_id);
    } catch {
      subscription = null;
    }
  }
  if (!subscription && sub.stripe_customer_id) {
    const list = await stripe.subscriptions.list({ customer: sub.stripe_customer_id, limit: 1 });
    subscription = list.data[0] ?? null;
  }

  if (!subscription) {
    return NextResponse.json({ ok: true, estado: sub.estado, suscripcion: sub });
  }

  const patch = {
    stripe_subscription_id: subscription.id,
    stripe_price_id: subscription.items.data[0]?.price.id ?? sub.stripe_price_id ?? '',
    estado: subscription.status as EstadoSuscripcion,
    trial_inicio: tsToIso(subscription.trial_start),
    trial_fin: tsToIso(subscription.trial_end),
    current_period_start: tsToIso(subscription.current_period_start),
    current_period_end: tsToIso(subscription.current_period_end),
    cancel_at_period_end: subscription.cancel_at_period_end,
    trial_usado: sub.trial_usado || !!subscription.trial_start,
  };

  const { data: updated } = await admin
    .from('suscripciones')
    .update(patch)
    .eq('negocio_id', ctx.negocioId)
    .select('*')
    .maybeSingle();

  return NextResponse.json({ ok: true, estado: patch.estado, suscripcion: updated });
}
