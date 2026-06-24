'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Info } from 'lucide-react';

/**
 * Aviso superior del Dashboard — modo pausa de Stripe.
 * El cobro en línea está pendiente de activación; el POS funciona sin restricciones.
 */
export default function SuscripcionAviso() {
  return (
    <div className="skeu-card p-4 flex items-start gap-3 border-l-4 border-l-amber-500">
      <Info className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-foreground">Cobro en línea pendiente de activación</p>
        <p className="text-xs text-muted-foreground">
          Stripe está pendiente de configuración. El cobro mensual todavía no está activo.
          Mientras tanto puedes usar el POS sin restricciones.
        </p>
      </div>
      <Link href="/suscripcion">
        <Button variant="outline" size="sm">Ver detalles</Button>
      </Link>
    </div>
  );
}
