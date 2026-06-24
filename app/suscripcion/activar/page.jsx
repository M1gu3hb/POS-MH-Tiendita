'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus';
import { useStripeConfig } from '@/hooks/useStripeConfig';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { ShieldCheck, Sparkles, Check, CreditCard, Loader2, AlertTriangle, RefreshCw, LogOut, Clock } from 'lucide-react';
import { LEGAL_CONFIG } from '@/utils/legalConfig';

/** Pantalla de activación de suscripción. Migrado: las funciones de Stripe son API routes. */
export default function ActivarSuscripcionPage() {
  const router = useRouter();
  const { authUser, signOut } = useAuth();
  const { suscripcion, estado, requierePago, cancelada, isLoading, isFetching, refetch } = useSubscriptionStatus();
  const { canCheckout, missing } = useStripeConfig();
  const [creandoCheckout, setCreandoCheckout] = useState(false);
  const [refrescando, setRefrescando] = useState(false);

  const isInIframe = typeof window !== 'undefined' && window.self !== window.top;

  const postJson = async (url) => {
    const res = await fetch(url, { method: 'POST' });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, data };
  };

  const handleStart = async () => {
    if (!canCheckout) {
      const faltan = (missing || []).join(', ') || 'configuración pendiente';
      toast.error(`Stripe aún no está configurado. Falta: ${faltan}`);
      return;
    }
    setCreandoCheckout(true);
    try {
      const { data } = await postJson('/api/stripe/checkout');
      if (data?.error === 'stripe_not_configured') {
        toast.error('Stripe pendiente de configurar. Contacta al administrador.');
        return;
      }
      if (data?.error === 'already_subscribed') {
        toast.success('Tu suscripción ya está activa.');
        await refetch();
        return;
      }
      if (!data?.url) {
        toast.error(data?.error || 'No se pudo iniciar el pago. Intenta de nuevo.');
        return;
      }
      if (isInIframe) {
        const w = window.open(data.url, '_blank', 'noopener,noreferrer');
        if (!w) toast.error('El navegador bloqueó la ventana. Permite popups o abre el POS en una pestaña aparte.');
        else toast.success('Abriendo Stripe Checkout en pestaña nueva…');
      } else {
        window.location.href = data.url;
      }
    } catch {
      toast.error('No se pudo iniciar el pago. Contacta soporte.');
    } finally {
      setCreandoCheckout(false);
    }
  };

  const handleRefresh = async () => {
    setRefrescando(true);
    try {
      await postJson('/api/stripe/refresh');
      await refetch();
      toast.success('Estado actualizado.');
    } catch {
      toast.error('No se pudo actualizar el estado.');
    } finally {
      setRefrescando(false);
    }
  };

  const handlePortal = async () => {
    if (isInIframe) {
      toast.error('Abre el POS en una pestaña aparte para administrar tu suscripción.');
      return;
    }
    try {
      const { data } = await postJson('/api/stripe/portal');
      if (!data?.url) {
        toast.error('No se pudo abrir el portal de pagos.');
        return;
      }
      window.location.href = data.url;
    } catch {
      toast.error('No se pudo abrir el portal de pagos.');
    }
  };

  const handleLogout = async () => {
    await signOut();
    router.push('/login');
  };

  const beneficios = [
    'Punto de venta completo, productos e inventario',
    'Caja, cortes y tickets imprimibles',
    'Reportes de ventas, gastos y utilidad',
    'Escáner por cámara y teléfono como escáner remoto',
    'Tus datos privados, aislados por cuenta',
    'Soporte por WhatsApp y correo',
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Verificando suscripción…</p>
        </div>
      </div>
    );
  }

  let titulo = 'Activa tu prueba gratis de 7 días';
  let subtitulo = 'Sin compromiso. Cancela cuando quieras desde tu portal de cliente.';
  let ctaLabel = 'Comenzar prueba gratis (7 días)';
  let mostrarPortal = false;

  if (requierePago) {
    titulo = 'Tu pago necesita atención';
    subtitulo = 'Hubo un problema con el último cobro. Actualiza tu método de pago para reactivar tu POS.';
    ctaLabel = 'Actualizar método de pago';
    mostrarPortal = true;
  } else if (cancelada) {
    titulo = 'Reactiva tu suscripción';
    subtitulo = 'Tu suscripción fue cancelada. Vuelve a suscribirte para recuperar el acceso.';
    ctaLabel = 'Reactivar suscripción';
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 p-4 py-8 flex items-start justify-center">
      <div className="max-w-2xl w-full space-y-4">
        <div className="skeu-panel p-6 sm:p-8 text-center">
          <div className="h-14 w-14 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center">
            {requierePago ? <AlertTriangle className="h-7 w-7 text-amber-600" /> : <Sparkles className="h-7 w-7 text-primary" />}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">{titulo}</h1>
          <p className="text-sm text-muted-foreground mb-1">{subtitulo}</p>
          <p className="text-xs text-muted-foreground">Hola, <span className="font-semibold text-foreground">{authUser?.email}</span></p>
        </div>

        <div className="skeu-panel p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Plan mensual</p>
              <h2 className="text-xl font-bold text-foreground">{LEGAL_CONFIG.appName}</h2>
            </div>
            <div className="text-right">
              <p className="text-3xl font-extrabold text-foreground">$999<span className="text-base font-medium text-muted-foreground"> MXN</span></p>
              <p className="text-xs text-muted-foreground">/ mes</p>
            </div>
          </div>

          <div className="flex items-center gap-2 mb-4 p-2.5 rounded-lg bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/30">
            <Clock className="h-4 w-4 text-green-700 dark:text-green-400 flex-shrink-0" />
            <p className="text-xs font-semibold text-green-900 dark:text-green-200">7 días gratis. Te avisaremos antes del primer cobro.</p>
          </div>

          <ul className="space-y-2 mb-5">
            {beneficios.map((b) => (
              <li key={b} className="flex items-start gap-2 text-sm text-foreground">
                <Check className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                <span>{b}</span>
              </li>
            ))}
          </ul>

          <Button onClick={handleStart} disabled={creandoCheckout} className="skeu-btn-primary w-full h-12 text-base font-bold">
            {creandoCheckout ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <CreditCard className="h-5 w-5 mr-2" />}
            {ctaLabel}
          </Button>

          {isInIframe && (
            <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-2 text-center">
              El pago debe abrirse en la app publicada (no funciona dentro de la vista previa).
            </p>
          )}
          {!canCheckout && (
            <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-2 text-center">
              Stripe aún no está configurado{missing?.length ? ` (falta: ${missing.join(', ')})` : ''}.
            </p>
          )}

          {mostrarPortal && (
            <Button onClick={handlePortal} variant="outline" className="w-full h-11 mt-2 font-semibold">
              <CreditCard className="h-4 w-4 mr-2" /> Abrir portal de cliente
            </Button>
          )}

          <div className="flex items-center justify-center gap-1 mt-3">
            <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground" />
            <p className="text-[11px] text-muted-foreground">Pago seguro procesado por Stripe.</p>
          </div>
        </div>

        <div className="skeu-panel p-5">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="text-xs text-muted-foreground">Estado actual</p>
              <p className="text-sm font-bold text-foreground capitalize">{estado?.replace('_', ' ') || 'sin suscripción'}</p>
              {suscripcion?.ultimo_error_pago && <p className="text-[11px] text-red-600 mt-1">{suscripcion.ultimo_error_pago}</p>}
            </div>
            <div className="flex gap-2">
              <Button onClick={handleRefresh} variant="outline" size="sm" disabled={refrescando || isFetching}>
                {refrescando ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1" />}
                Actualizar
              </Button>
              <Button onClick={handleLogout} variant="outline" size="sm">
                <LogOut className="h-4 w-4 mr-1" /> Salir
              </Button>
            </div>
          </div>
        </div>

        <p className="text-center text-[11px] text-muted-foreground">{LEGAL_CONFIG.appName} — v{LEGAL_CONFIG.version}</p>
      </div>
    </div>
  );
}
