'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { XCircle, ArrowLeft } from 'lucide-react';

/** Pantalla a la que regresa el usuario si cancela el Checkout de Stripe. */
export default function SuscripcionCancelPage() {
  const router = useRouter();
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full skeu-panel p-8 text-center">
        <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-amber-100 dark:bg-amber-500/15 flex items-center justify-center">
          <XCircle className="h-9 w-9 text-amber-600 dark:text-amber-400" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Pago cancelado</h1>
        <p className="text-sm text-muted-foreground mb-6">No se realizó ningún cargo. Puedes intentar de nuevo cuando quieras.</p>
        <Button onClick={() => router.push('/')} className="skeu-btn-primary w-full h-12 text-base font-bold">
          <ArrowLeft className="h-5 w-5 mr-2" /> Volver
        </Button>
      </div>
    </div>
  );
}
