import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { getStripe, tsToIso } from '@/lib/stripe/server';
import { createAdminClient } from '@/lib/db/supabase-server';
import type { EstadoSuscripcion, Suscripcion } from '@/lib/db/types';

// El webhook necesita runtime Node (firma + body crudo) y ser dinámico.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Admin = ReturnType<typeof createAdminClient>;

function extractId(value: string | { id: string } | null | undefined): string | null {
  if (!value) return null;
  return typeof value === 'string' ? value : value.id;
}

/** Encuentra la suscripción del negocio por customer_id o por negocio_id (metadata). */
async function findSuscripcion(
  admin: Admin,
  params: { customerId?: string | null; negocioId?: string | null },
): Promise<Suscripcion | null> {
  if (params.negocioId) {
    const { data } = await admin
      .from('suscripciones')
      .select('*')
      .eq('negocio_id', params.negocioId)
      .maybeSingle();
    if (data) return data as Suscripcion;
  }
  if (params.customerId) {
    const { data } = await admin
      .from('suscripciones')
      .select('*')
      .eq('stripe_customer_id', params.customerId)
      .maybeSingle();
    if (data) return data as Suscripcion;
  }
  return null;
}

/**
 * POST /api/stripe/webhook — antes `stripeWebhook`.
 * SIEMPRE valida la firma antes de procesar. Escribe en `suscripciones` con el
 * cliente admin (service role). La suscripción se ubica por `negocio_id` (metadata)
 * o por `stripe_customer_id`.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !webhookSecret) {
    return NextResponse.json({ error: 'stripe_not_configured' }, { status: 503 });
  }

  const body = await request.text();
  const signature = request.headers.get('stripe-signature') ?? '';

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'invalid_signature';
    return NextResponse.json({ error: 'invalid_signature', detail: message }, { status: 400 });
  }

  const admin = createAdminClient();

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const negocioId = session.metadata?.negocio_id ?? null;
        const customerId = extractId(session.customer);
        const subscriptionId = extractId(session.subscription);
        const existing = await findSuscripcion(admin, { customerId, negocioId });

        const patch = {
          stripe_customer_id: customerId ?? existing?.stripe_customer_id ?? null,
          stripe_subscription_id: subscriptionId ?? existing?.stripe_subscription_id ?? null,
          stripe_checkout_session_id: session.id,
          estado: 'incomplete' as EstadoSuscripcion,
        };

        if (existing) {
          await admin.from('suscripciones').update(patch).eq('negocio_id', existing.negocio_id);
        } else if (negocioId) {
          await admin.from('suscripciones').insert({ negocio_id: negocioId, ...patch });
        }
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object;
        const negocioId = sub.metadata?.negocio_id ?? null;
        const customerId = extractId(sub.customer);
        const existing = await findSuscripcion(admin, { customerId, negocioId });

        const patch = {
          stripe_customer_id: customerId ?? existing?.stripe_customer_id ?? null,
          stripe_subscription_id: sub.id,
          stripe_price_id: sub.items.data[0]?.price.id ?? existing?.stripe_price_id ?? null,
          estado: sub.status as EstadoSuscripcion,
          trial_inicio: tsToIso(sub.trial_start),
          trial_fin: tsToIso(sub.trial_end),
          current_period_start: tsToIso(sub.current_period_start),
          current_period_end: tsToIso(sub.current_period_end),
          cancel_at_period_end: sub.cancel_at_period_end,
          trial_usado: existing?.trial_usado || !!sub.trial_start,
        };

        if (existing) {
          await admin.from('suscripciones').update(patch).eq('negocio_id', existing.negocio_id);
        } else if (negocioId) {
          await admin.from('suscripciones').insert({ negocio_id: negocioId, ...patch });
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        const negocioId = sub.metadata?.negocio_id ?? null;
        const customerId = extractId(sub.customer);
        const existing = await findSuscripcion(admin, { customerId, negocioId });
        if (existing) {
          await admin
            .from('suscripciones')
            .update({ estado: 'canceled', cancel_at_period_end: false })
            .eq('negocio_id', existing.negocio_id);
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        const customerId = extractId(invoice.customer);
        const existing = await findSuscripcion(admin, { customerId });
        if (existing) {
          const estado =
            existing.estado === 'past_due' || existing.estado === 'unpaid' ? 'active' : existing.estado;
          await admin
            .from('suscripciones')
            .update({ estado, ultimo_pago_estado: 'succeeded', ultimo_error_pago: null })
            .eq('negocio_id', existing.negocio_id);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const customerId = extractId(invoice.customer);
        const existing = await findSuscripcion(admin, { customerId });
        if (existing) {
          await admin
            .from('suscripciones')
            .update({
              estado: 'past_due',
              ultimo_pago_estado: 'failed',
              ultimo_error_pago:
                invoice.last_finalization_error?.message ?? invoice.billing_reason ?? 'Pago fallido',
            })
            .eq('negocio_id', existing.negocio_id);
        }
        break;
      }

      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'webhook_error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
