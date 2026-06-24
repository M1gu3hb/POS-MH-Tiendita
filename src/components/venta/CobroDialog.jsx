'use client';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatMoney } from '@/utils/currency';
import { Banknote, CreditCard, ArrowRightLeft, Layers } from 'lucide-react';

const METODOS = [
  { id: 'efectivo', label: 'Efectivo', icon: Banknote },
  { id: 'tarjeta', label: 'Tarjeta', icon: CreditCard },
  { id: 'transferencia', label: 'Transferencia', icon: ArrowRightLeft },
  { id: 'mixto', label: 'Mixto', icon: Layers },
];

export default function CobroDialog({ open, onClose, total, onConfirm, sym = '$', isProcessing }) {
  const [metodo, setMetodo] = useState('efectivo');
  const [montoRecibido, setMontoRecibido] = useState('');
  const [montoEfectivo, setMontoEfectivo] = useState('');
  const [montoTarjeta, setMontoTarjeta] = useState('');
  const [montoTransferencia, setMontoTransferencia] = useState('');

  const cambio = metodo === 'efectivo' 
    ? Math.max(0, (parseFloat(montoRecibido) || 0) - total) 
    : metodo === 'mixto'
      ? Math.max(0, (parseFloat(montoEfectivo) || 0) + (parseFloat(montoTarjeta) || 0) + (parseFloat(montoTransferencia) || 0) - total)
      : 0;

  const canConfirm = () => {
    if (metodo === 'efectivo') return (parseFloat(montoRecibido) || 0) >= total;
    if (metodo === 'mixto') {
      const sum = (parseFloat(montoEfectivo) || 0) + (parseFloat(montoTarjeta) || 0) + (parseFloat(montoTransferencia) || 0);
      return sum >= total;
    }
    return true;
  };

  const handleConfirm = () => {
    const data = {
      metodo_pago: metodo,
      monto_efectivo: metodo === 'efectivo' ? total : metodo === 'mixto' ? parseFloat(montoEfectivo) || 0 : 0,
      monto_tarjeta: metodo === 'tarjeta' ? total : metodo === 'mixto' ? parseFloat(montoTarjeta) || 0 : 0,
      monto_transferencia: metodo === 'transferencia' ? total : metodo === 'mixto' ? parseFloat(montoTransferencia) || 0 : 0,
      monto_recibido: metodo === 'efectivo' ? parseFloat(montoRecibido) || 0 : total,
      cambio,
    };
    onConfirm(data);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">Cobrar Venta</DialogTitle>
        </DialogHeader>

        <div className="text-center py-3">
          <p className="text-sm text-muted-foreground">Total a cobrar</p>
          <p className="text-4xl font-bold text-primary mt-1">{formatMoney(total, sym)}</p>
        </div>

        {/* Payment methods */}
        <div className="grid grid-cols-4 gap-2">
          {METODOS.map(m => (
            <button
              key={m.id}
              onClick={() => setMetodo(m.id)}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-xs font-medium ${
                metodo === m.id 
                  ? 'border-primary bg-primary/10 text-primary' 
                  : 'border-border text-muted-foreground hover:border-primary/50'
              }`}
            >
              <m.icon className="h-5 w-5" />
              {m.label}
            </button>
          ))}
        </div>

        {/* Efectivo */}
        {metodo === 'efectivo' && (
          <div className="space-y-3">
            <div>
              <Label className="text-sm">Monto recibido</Label>
              <Input
                type="number"
                placeholder="0.00"
                value={montoRecibido}
                onChange={(e) => setMontoRecibido(e.target.value)}
                className="h-12 text-lg text-center font-bold mt-1"
                autoFocus
              />
            </div>
            {(parseFloat(montoRecibido) || 0) >= total && (
              <div className="text-center py-2 rounded-xl bg-green-50 dark:bg-green-900/20">
                <p className="text-sm text-muted-foreground">Cambio</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{formatMoney(cambio, sym)}</p>
              </div>
            )}
          </div>
        )}

        {/* Mixto */}
        {metodo === 'mixto' && (
          <div className="space-y-2">
            <div>
              <Label className="text-xs">Efectivo</Label>
              <Input type="number" placeholder="0.00" value={montoEfectivo} onChange={(e) => setMontoEfectivo(e.target.value)} className="h-10 mt-1" />
            </div>
            <div>
              <Label className="text-xs">Tarjeta</Label>
              <Input type="number" placeholder="0.00" value={montoTarjeta} onChange={(e) => setMontoTarjeta(e.target.value)} className="h-10 mt-1" />
            </div>
            <div>
              <Label className="text-xs">Transferencia</Label>
              <Input type="number" placeholder="0.00" value={montoTransferencia} onChange={(e) => setMontoTransferencia(e.target.value)} className="h-10 mt-1" />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isProcessing}>Cancelar</Button>
          <Button onClick={handleConfirm} disabled={!canConfirm() || isProcessing} className="bg-primary hover:bg-primary/90 min-w-[120px]">
            {isProcessing ? 'Procesando...' : 'Confirmar Cobro'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}