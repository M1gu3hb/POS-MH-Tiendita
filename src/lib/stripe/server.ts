import 'server-only';

import Stripe from 'stripe';

/**
 * Cliente de Stripe (server-side). La clave secreta nunca llega al cliente.
 * Reemplaza el `new Stripe(...)` de las Deno functions de Base44.
 */

const STRIPE_API_VERSION = '2024-12-18.acacia';

export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key, { apiVersion: STRIPE_API_VERSION as Stripe.LatestApiVersion });
}

export function tsToIso(ts: number | null | undefined): string | null {
  return ts ? new Date(ts * 1000).toISOString() : null;
}
