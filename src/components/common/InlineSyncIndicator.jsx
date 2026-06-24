'use client';
import { Loader2 } from 'lucide-react';

/**
 * Indicador discreto de sincronización en vivo.
 *
 * Se muestra solo cuando `active` es true. NO bloquea UI, NO tapa botones.
 * Pensado para `isFetching` cuando ya hay datos previos en pantalla.
 *
 * Props:
 *   - active: boolean — si true, se muestra
 *   - label?: string — texto opcional ("Actualizando…" por default)
 *   - className?: string — clases extra
 */
export default function InlineSyncIndicator({ active, label = 'Actualizando…', className = '' }) {
  if (!active) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className={`inline-flex items-center gap-1.5 text-[11px] text-muted-foreground bg-muted/60 px-2 py-1 rounded-full ${className}`}
    >
      <Loader2 className="h-3 w-3 animate-spin" />
      <span>{label}</span>
    </div>
  );
}