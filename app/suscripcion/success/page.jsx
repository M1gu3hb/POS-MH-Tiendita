'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus';
import { CheckCircle2, Loader2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Retorno de un Checkout exitoso. Llama a /api/stripe/refresh (por si el webhook
 * aún no llega) y reintenta hasta detectar estado operativo.
 */
export default function SuscripcionSuccessPage() {
  const router = useRouter();
  const { puedeOperar, refetch } = useSubscriptionStatus();
  const [verificando, setVerificando] = useState(true);

  useEffect(() => {
    let cancel = false;
    let intentos = 0;
    const tick = async () => {
      try {
        await fetch('/api/stripe/refresh', { method: 'POST' });
      } catch {
        /* el webhook es la fuente principal; ignoramos el fallo del respaldo */
      }
      const fresh = await refetch();
      if (cancel) return;
      const ok = ['trialing', 'active'].includes(fresh?.data?.estado);
      if (ok || intentos >= 5) {
        setVerificando(false);
        return;
      }
      intentos += 1;
      setTimeout(tick, 1500);
    };
    void tick();
    return () => {
      cancel = true;
    };
  }, [refetch]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full skeu-panel p-8 text-center">
        <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-green-100 dark:bg-green-500/15 flex items-center justify-center">
          <CheckCircle2 className="h-9 w-9 text-green-600 dark:text-green-400" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">¡Listo!</h1>
        <p className="text-sm text-muted-foreground mb-6">Tu suscripción está activándose. Esto suele tardar unos segundos.</p>

        {verificando && !puedeOperar ? (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Confirmando con Stripe…
          </div>
        ) : (
          <Button onClick={() => router.push('/')} className="skeu-btn-primary w-full h-12 text-base font-bold">
            Entrar al POS <ArrowRight className="h-5 w-5 ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
}
