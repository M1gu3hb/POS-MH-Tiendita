'use client';

import { PackagePlus } from 'lucide-react';
import { formatMoney } from '@/utils/currency';

export default function CombosDisponibles({ combos, onSelect, sym, disabled = false }) {
  if (!combos?.length) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-sm font-black text-foreground">Combos</h2>
        <span className="text-xs text-muted-foreground">{combos.length} disponibles</span>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {combos.map((combo) => (
          <button
            key={combo.id}
            onClick={() => onSelect(combo)}
            disabled={disabled}
            className="skeu-card min-w-[170px] max-w-[220px] flex-shrink-0 p-3 text-left transition-all duration-150 hover:translate-y-[-1px] active:translate-y-[1px] active:shadow-sm disabled:opacity-50 disabled:pointer-events-none"
          >
            <div className="flex items-start gap-2">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center skeu-input flex-shrink-0">
                <PackagePlus className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-foreground leading-tight line-clamp-2">{combo.nombre}</p>
                <p className="text-sm font-black text-primary tabular-nums mt-1">{formatMoney(combo.precio_combo, sym)}</p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
