'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/lib/auth/AuthContext';
import { abrirCaja } from '@/lib/db/caja';
import { toast } from 'sonner';

export default function AbrirCajaDialog({ open, onClose, onSuccess }) {
  const { negocioId, usuario } = useAuth();
  const [fondo, setFondo] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAbrir = async () => {
    setLoading(true);
    try {
      await abrirCaja({
        negocio_id: negocioId,
        cajero_id: usuario?.id ?? null,
        cajero_nombre: usuario?.nombre_visible || 'Cajero',
        fecha_apertura: new Date().toISOString(),
        estado: 'abierta',
        fondo_inicial: parseFloat(fondo) || 0,
      });
      toast.success('Caja abierta correctamente');
      setFondo('');
      onSuccess();
    } catch {
      toast.error('Error al abrir caja');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Abrir Caja</DialogTitle>
        </DialogHeader>
        <div>
          <Label>Fondo inicial (efectivo)</Label>
          <Input type="number" placeholder="0.00" value={fondo} onChange={(e) => setFondo(e.target.value)} className="h-12 text-lg text-center font-bold mt-2" autoFocus />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleAbrir} disabled={loading} className="bg-primary">{loading ? 'Abriendo...' : 'Abrir Caja'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
