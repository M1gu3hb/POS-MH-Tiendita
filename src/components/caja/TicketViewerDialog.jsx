'use client';

import { useEffect, useRef, useState } from 'react';
import { getDetalleByVenta } from '@/lib/db/ventas';
import { Button } from '@/components/ui/button';
import { X, Printer, Loader2 } from 'lucide-react';
import TicketVenta from '@/components/venta/TicketVenta';

/**
 * Modal que reconstruye el ticket de una venta desde detalle_ventas.
 * Migrado: la lectura usa el repositorio (getDetalleByVenta).
 */
export default function TicketViewerDialog({ venta, config, onClose }) {
  const [detalles, setDetalles] = useState(null);
  const [loading, setLoading] = useState(true);
  const ticketRef = useRef(null);

  useEffect(() => {
    if (!venta?.id) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await getDetalleByVenta(venta.id);
        if (!cancelled) setDetalles(data || []);
      } catch {
        if (!cancelled) setDetalles([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [venta?.id]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handlePrint = () => {
    if (!ticketRef.current) return;
    const html = ticketRef.current.outerHTML;
    const win = window.open('', '_blank', 'width=380,height=700');
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Ticket ${venta?.folio || ''}</title>
      <style>
        @page { size: 80mm auto; margin: 0; }
        html, body { margin: 0 !important; padding: 0 !important; background: white; }
        * { box-sizing: border-box; }
        body { font-family: 'Courier New', monospace; }
        .ticket-printable { width: 80mm !important; max-width: 80mm !important; min-width: 80mm !important; margin: 0 !important; padding: 4mm !important; background: white !important; color: #000 !important; box-shadow: none !important; border: none !important; }
        @media print { html, body { margin: 0 !important; padding: 0 !important; } .ticket-printable { width: 80mm !important; padding: 4mm !important; } }
      </style>
      </head><body>${html}</body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-2 sm:p-4 overflow-hidden no-print" onClick={onClose}>
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-sm max-h-[95vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="no-print flex items-center justify-between px-4 py-3 bg-gray-900 text-white flex-shrink-0">
          <h2 className="font-bold text-sm">Ticket — {venta?.folio}</h2>
          <div className="flex gap-2">
            <Button size="sm" onClick={handlePrint} disabled={loading || !detalles?.length} className="bg-green-600 hover:bg-green-700 text-white h-9">
              <Printer className="h-4 w-4 mr-1" /> Imprimir
            </Button>
            <Button size="sm" onClick={onClose} className="bg-gray-700 hover:bg-gray-600 text-white h-9 w-9 p-0">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto flex justify-center items-start py-6" style={{ background: 'repeating-linear-gradient(135deg, hsl(var(--muted)) 0 8px, hsl(var(--muted)/0.7) 8px 16px)' }}>
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground py-12">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Cargando ticket...</span>
            </div>
          ) : !detalles?.length ? (
            <div className="bg-card rounded-lg p-8 text-center max-w-xs border border-border">
              <p className="text-sm text-foreground">No se encontraron detalles para este ticket.</p>
              <p className="text-xs text-muted-foreground mt-2">Folio: {venta?.folio}</p>
            </div>
          ) : (
            <div className="ticket-preview-wrap" style={{ background: 'white', boxShadow: '0 10px 30px rgba(0,0,0,0.35), 0 2px 6px rgba(0,0,0,0.2)', borderRadius: '3px', position: 'relative' }}>
              <TicketVenta ref={ticketRef} venta={venta} detalles={detalles} config={config} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
