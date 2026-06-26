'use client';

import { Award } from 'lucide-react';

export default function ClienteFrecuente({
  cliente,
  onCanjear,
  sym = '$',
}) {
  if (!cliente) return null;

  const puntos = cliente.puntos_acumulados || 0;

  return (
    <div className="skeu-card p-4 flex flex-col gap-3 bg-card border border-border shadow-sm rounded-xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center skeu-input">
            <Award className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-foreground leading-tight">{cliente.nombre}</h4>
            <p className="text-[10px] text-muted-foreground mt-0.5">Cliente Frecuente</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
            Puntos
          </p>
          <p className="text-lg font-black text-primary tabular-nums">
            {puntos}
          </p>
        </div>
      </div>

      {puntos > 0 && onCanjear && (
        <div className="pt-2 border-t border-border/60 flex justify-between items-center">
          <span className="text-[11px] text-muted-foreground">Canje disponible</span>
          <button
            type="button"
            onClick={() => onCanjear(cliente)}
            className="skeu-btn-ghost px-3 py-1.5 rounded-lg text-xs font-bold text-foreground"
          >
            Canjear
          </button>
        </div>
      )}
    </div>
  );
}
