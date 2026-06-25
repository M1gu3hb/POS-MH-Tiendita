'use client';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { formatMoney } from '@/utils/currency';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function CarritoVenta({ items, onUpdateQty, onRemove, sym = '$' }) {
  const subtotal = items.reduce((s, i) => s + i.subtotal, 0);
  const descuento = items.reduce((s, i) => s + (i.descuento || 0), 0);
  const total = subtotal - descuento;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border">
        <h3 className="font-bold text-foreground text-sm tracking-wide uppercase">
          Carrito <span className="text-muted-foreground font-normal">({items.length})</span>
        </h3>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1.5">
          {items.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3 skeu-input">
                <span className="text-xl">🛒</span>
              </div>
              <p className="text-sm">Agrega productos para comenzar</p>
            </div>
          )}
          {items.map((item, idx) => (
            <div
              key={idx}
              className="skeu-card p-2.5 flex flex-col gap-2"
            >
              {/* Product name + delete always visible */}
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold text-foreground leading-tight flex-1 min-w-0">{item.nombre}</p>
                <button
                  onClick={() => onRemove(idx)}
                  className="flex-shrink-0 h-8 w-8 rounded-lg bg-red-500/10 hover:bg-red-500/20 flex items-center justify-center transition-colors"
                  aria-label="Eliminar"
                >
                  <Trash2 className="h-3.5 w-3.5 text-red-500" />
                </button>
              </div>

              {/* Qty controls + subtotal — always visible */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1 skeu-input rounded-lg bg-muted px-1 py-0.5">
                  <button
                    onClick={() => onUpdateQty(idx, item.cantidad - 1)}
                    className="h-8 w-8 rounded-md flex items-center justify-center text-foreground hover:bg-background transition-colors"
                    aria-label="Disminuir"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="text-sm font-bold w-8 text-center text-foreground tabular-nums select-none">
                    {item.cantidad}
                  </span>
                  <button
                    onClick={() => onUpdateQty(idx, item.cantidad + 1)}
                    className="h-8 w-8 rounded-md flex items-center justify-center text-foreground hover:bg-background transition-colors"
                    aria-label="Aumentar"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="text-right">
                  <div className="flex items-center justify-end gap-1.5 flex-wrap">
                    {item.es_mayoreo && (
                      <span className="text-[9px] font-bold tracking-wider bg-green-500/10 text-green-500 dark:text-green-400 px-1.5 py-0.5 rounded border border-green-500/20 animate-pulse">
                        MAYOREO
                      </span>
                    )}
                    <p className="text-xs text-muted-foreground tabular-nums">{formatMoney(item.precio, sym)} × {item.cantidad}</p>
                  </div>
                  <p className="text-base font-bold text-foreground tabular-nums">{formatMoney(item.subtotal, sym)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Totals */}
      <div className="border-t border-border p-4 space-y-2 bg-card">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Subtotal</span>
          <span className="tabular-nums">{formatMoney(subtotal, sym)}</span>
        </div>
        {descuento > 0 && (
          <div className="flex justify-between text-sm text-red-500">
            <span>Descuento</span>
            <span className="tabular-nums">−{formatMoney(descuento, sym)}</span>
          </div>
        )}
        <div className="flex justify-between items-center pt-2 border-t border-border">
          <span className="text-base font-bold text-foreground">Total</span>
          <span className="text-2xl font-black text-primary tabular-nums">{formatMoney(total, sym)}</span>
        </div>
      </div>
    </div>
  );
}