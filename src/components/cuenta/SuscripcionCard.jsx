'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Sparkles, Info, ChevronRight } from 'lucide-react';

/** Resumen compacto de la suscripción para la página Cuenta — modo pausa. */
export default function SuscripcionCard() {
  return (
    <div className="skeu-panel p-5">
      <h2 className="font-bold text-foreground mb-3 text-sm uppercase tracking-wide flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" /> Suscripción
      </h2>

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Info className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-bold text-amber-700 dark:text-amber-400">Cobro en línea pendiente de activación</p>
            <p className="text-[11px] text-muted-foreground">El POS funciona sin restricciones.</p>
          </div>
        </div>
        <Link href="/suscripcion">
          <Button variant="outline" size="sm">Ver <ChevronRight className="h-4 w-4 ml-1" /></Button>
        </Link>
      </div>
    </div>
  );
}
