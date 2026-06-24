'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { useCajaAbierta } from '@/hooks/useCajaAbierta';
import { createGasto } from '@/lib/db/egresos';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

const CATEGORIAS = ['luz', 'renta', 'agua', 'internet', 'sueldos', 'mantenimiento', 'bolsas', 'transporte', 'comisiones', 'otro'];
const METODOS_PAGO = ['efectivo', 'tarjeta', 'transferencia', 'otro'];

const emptyForm = () => ({
  concepto: '',
  categoria: 'otro',
  monto: 0,
  fecha: new Date().toISOString().split('T')[0],
  metodo_pago: 'efectivo',
  notas: '',
  recurrente: false,
});

export default function NuevoGastoDialog({ open, onClose, onSaved }) {
  const { negocioId, usuario } = useAuth();
  const { cajaAbierta } = useCajaAbierta();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState(emptyForm());

  const handleSave = async () => {
    if (!formData.concepto.trim() || !formData.monto) {
      toast.error('Completa los campos requeridos');
      return;
    }
    setLoading(true);
    try {
      // Vincula el gasto al corte abierto para que aparezca en Caja/Dashboard.
      await createGasto({
        ...formData,
        negocio_id: negocioId,
        corte_id: cajaAbierta?.id ?? null,
        usuario_id: usuario?.id ?? null,
        usuario_nombre: usuario?.nombre_visible ?? null,
      });
      toast.success('Gasto registrado');
      onSaved?.();
      setFormData(emptyForm());
      onClose();
    } catch {
      toast.error('Error al registrar gasto');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>Nuevo Gasto Operativo</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Concepto *</Label>
            <Input value={formData.concepto} onChange={(e) => setFormData({ ...formData, concepto: e.target.value })} placeholder="Ej: Pago de servicios" />
          </div>
          <div>
            <Label>Categoría</Label>
            <Select value={formData.categoria} onValueChange={(value) => setFormData({ ...formData, categoria: value })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIAS.map((cat) => <SelectItem key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Monto *</Label>
            <Input type="number" step="0.01" value={formData.monto} onChange={(e) => setFormData({ ...formData, monto: parseFloat(e.target.value) || 0 })} placeholder="0.00" />
          </div>
          <div>
            <Label>Fecha</Label>
            <Input type="date" value={formData.fecha} onChange={(e) => setFormData({ ...formData, fecha: e.target.value })} />
          </div>
          <div>
            <Label>Método de Pago</Label>
            <Select value={formData.metodo_pago} onValueChange={(value) => setFormData({ ...formData, metodo_pago: value })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {METODOS_PAGO.map((m) => <SelectItem key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Notas</Label>
            <Textarea value={formData.notas} onChange={(e) => setFormData({ ...formData, notas: e.target.value })} placeholder="Observaciones opcionales" />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="recurrente" checked={formData.recurrente} onChange={(e) => setFormData({ ...formData, recurrente: e.target.checked })} />
            <Label htmlFor="recurrente" className="cursor-pointer">Gasto recurrente</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={loading} className="skeu-btn-primary">{loading ? 'Guardando...' : 'Guardar Gasto'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
