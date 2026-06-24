import { NextResponse } from 'next/server';
import { getServerAuthContext } from '@/lib/auth/server';

/**
 * GET /api/stripe/status — antes `getStripeConfigStatus`.
 * Reporta qué secrets de Stripe están configurados (solo banderas, sin valores).
 */
export async function GET(): Promise<NextResponse> {
  const ctx = await getServerAuthContext();
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const hasSecretKey = !!process.env.STRIPE_SECRET_KEY;
  const hasPriceId = !!process.env.STRIPE_PRICE_ID_MONTHLY;
  const hasAppBaseUrl = !!process.env.NEXT_PUBLIC_APP_URL;
  const hasWebhookSecret = !!process.env.STRIPE_WEBHOOK_SECRET;

  const missing: string[] = [];
  if (!hasSecretKey) missing.push('STRIPE_SECRET_KEY');
  if (!hasPriceId) missing.push('STRIPE_PRICE_ID_MONTHLY');
  if (!hasAppBaseUrl) missing.push('NEXT_PUBLIC_APP_URL');
  if (!hasWebhookSecret) missing.push('STRIPE_WEBHOOK_SECRET');

  const canCheckout = hasSecretKey && hasPriceId && hasAppBaseUrl;
  const fullyConfigured = canCheckout && hasWebhookSecret;

  return NextResponse.json({
    ok: true,
    fullyConfigured,
    canCheckout,
    hasSecretKey,
    hasPriceId,
    hasAppBaseUrl,
    hasWebhookSecret,
    missing,
  });
}
