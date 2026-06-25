'use client';
import { ShoppingCart, X, Trash2, Plus, Minus, DollarSign } from 'lucide-react';
import { useState, useEffect } from 'react';
import { formatMoney } from '@/utils/currency';

/**
 * Barra inferior + drawer del carrito para móvil/tablet.
 * Reemplaza el panel lateral del carrito cuando la pantalla es pequeña.
 */
export default function MobileCartBar({
  items, total, sym, onUpdateQty, onRemove, onCobrar, onCancelar, disabled, isProcessing,
}) {
  const [open, setOpen] = useState(false);

  // Cerrar drawer si el carrito queda vacío después de cobrar
  useEffect(() => {
    if (items.length === 0) setOpen(false);
  }, [items.length]);

  // Cerrar con Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const hasItems = items.length > 0;

  return (
    <>
      {/* Barra inferior fija */}
      <button
        onClick={() => hasItems && setOpen(true)}
        disabled={!hasItems}
        className={`fixed left-3 right-3 bottom-3 z-30 h-14 rounded-2xl flex items-center justify-between px-4 active:scale-[0.99] transition-all lg:hidden ${
          hasItems ? 'skeu-btn-primary' : 'skeu-btn-ghost opacity-90'
        }`}
        style={{
          fontFamily: 'inherit',
        }}
        aria-label={hasItems ? 'Abrir carrito' : 'Carrito vacío'}
      >
        <div className="flex items-center gap-2">
          <ShoppingCart className="h-5 w-5" />
          <span className="text-sm font-bold">
            {hasItems ? `${items.length} ${items.length === 1 ? 'producto' : 'productos'}` : 'Carrito vacío'}
          </span>
        </div>
        <span className="text-lg font-black tabular-nums">
          {formatMoney(total, sym)}
        </span>
      </button>

      {/* Drawer inferior */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" aria-modal="true" role="dialog">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setOpen(false)}
          />
          <div
            className="absolute bottom-0 left-0 right-0 bg-card rounded-t-3xl flex flex-col"
            style={{
              maxHeight: '88vh',
              boxShadow: '0 -8px 32px rgba(0,0,0,0.25)',
              borderTop: '1px solid hsl(var(--border))',
              animation: 'slideUp 240ms cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            {/* Handle + header */}
            <div className="flex-shrink-0 pt-2">
              <div className="mx-auto w-12 h-1.5 rounded-full bg-muted-foreground/30 mb-2" />
              <div className="flex items-center justify-between px-4 pb-2 border-b border-border">
                <h3 className="font-black text-foreground">
                  Carrito <span className="text-muted-foreground font-medium text-sm">({items.length})</span>
                </h3>
                <button
                  onClick={() => setOpen(false)}
                  className="h-9 w-9 rounded-lg flex items-center justify-center hover:bg-muted transition-colors"
                  aria-label="Cerrar carrito"
                >
                  <X className="h-5 w-5 text-muted-foreground" />
                </button>
              </div>
            </div>

            {/* Lista de productos */}
            <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
              {items.map((item, idx) => (
                <div key={idx} className="skeu-card p-3 flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-foreground leading-tight flex-1">{item.nombre}</p>
                    <button
                      onClick={() => onRemove(idx)}
                      className="flex-shrink-0 h-9 w-9 rounded-lg bg-red-500/10 hover:bg-red-500/20 flex items-center justify-center transition-colors"
                      aria-label="Eliminar"
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1 skeu-input rounded-lg bg-muted px-1 py-0.5">
                      <button
                        onClick={() => onUpdateQty(idx, item.cantidad - 1)}
                        className="h-10 w-10 rounded-md flex items-center justify-center text-foreground active:bg-background transition-colors"
                        aria-label="Disminuir"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="text-base font-bold w-10 text-center text-foreground tabular-nums select-none">
                        {item.cantidad}
                      </span>
                      <button
                        onClick={() => onUpdateQty(idx, item.cantidad + 1)}
                        className="h-10 w-10 rounded-md flex items-center justify-center text-foreground active:bg-background transition-colors"
                        aria-label="Aumentar"
                      >
                        <Plus className="h-4 w-4" />
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
                      <p className="text-lg font-bold text-foreground tabular-nums">{formatMoney(item.subtotal, sym)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Total y botones fijos */}
            <div className="flex-shrink-0 border-t border-border bg-card p-3 space-y-2"
              style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
            >
              <div className="flex justify-between items-center px-1">
                <span className="text-sm font-bold text-foreground uppercase tracking-wide">Total</span>
                <span className="text-3xl font-black text-primary tabular-nums">{formatMoney(total, sym)}</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    if (window.confirm('¿Cancelar la venta actual?')) {
                      onCancelar();
                      setOpen(false);
                    }
                  }}
                  className="skeu-btn-danger flex-1 h-12 rounded-xl font-bold text-sm flex items-center justify-center gap-1"
                >
                  <Trash2 className="h-4 w-4" /> Cancelar
                </button>
                <button
                  onClick={() => { setOpen(false); onCobrar(); }}
                  disabled={disabled || isProcessing}
                  className="skeu-btn-primary flex-[2] h-12 rounded-xl font-black text-base flex items-center justify-center gap-1 disabled:opacity-40 disabled:pointer-events-none"
                >
                  <DollarSign className="h-5 w-5" /> Cobrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </>
  );
}