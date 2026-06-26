'use client';

import { useState, useEffect, useMemo } from 'react';
import { registrarMerma } from '@/lib/db/inventario';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

/**
 * Registro rápido de merma: saca producto dañado/caducado. Descuenta del stock y
 * registra el movimiento como `merma` en el kardex (vía registrarMerma → ajustarStock).
 */
const MOTIVOS = [
  { value: 'roto', label: 'Se rompió' },
  { value: 'caducado', label: 'Caducó' },
  { value: 'echado_a_perder', label: 'Se echó a perder' },
  { value: 'otro', label: 'Otro' },
];

export default function MermaDialog({ open, onClose, negocioId, usuarioNombre, productos = [], productoInicial = null, onSaved }) {
  const [selectedId, setSelectedId] = useState('');
  const [search, setSearch] = useState('');
  const [cantidad, setCantidad] = useState('');
  const [motivo, setMotivo] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setSelectedId(productoInicial?.id || '');
      setSearch('');
      setCantidad('');
      setMotivo('');
    }
  }, [open, productoInicial]);

  const seleccionado = useMemo(() => productos.find((p) => p.id === selectedId) || null, [productos, selectedId]);
  const filtrados = useMemo(() => {
    const q = search.toLowerCase().trim();
    return q ? productos.filter((p) => p.nombre?.toLowerCase().includes(q)) : productos;
  }, [productos, search]);

  const cantidadNum = parseFloat(cantidad) || 0;
  const puedeConfirmar = !!selectedId && cantidadNum > 0 && !!motivo && !saving;

  const handleConfirmar = async () => {
    if (!puedeConfirmar) {
      toast.error('Selecciona producto, cantidad y motivo');
      return;
    }
    setSaving(true);
    try {
      await registrarMerma(negocioId, { producto_id: selectedId, cantidad: cantidadNum, motivo, usuarioNombre });
      const label = (MOTIVOS.find((m) => m.value === motivo)?.label || motivo).toLowerCase();
      toast.success(`Merma registrada: ${cantidadNum} ${seleccionado?.nombre || 'producto'} (${label})`);
      if (onSaved) onSaved();
      onClose();
    } catch (err) {
      toast.error('No se pudo registrar la merma', { description: err?.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Registrar merma</DialogTitle>
        </DialogHeader>

        {seleccionado ? (
          <div className="flex items-center justify-between gap-2 rounded-lg bg-muted p-2.5">
            <span className="text-sm font-semibold text-foreground truncate">{seleccionado.nombre}</span>
            <button type="button" onClick={() => setSelectedId('')} className="text-xs text-primary font-medium shrink-0">Cambiar</button>
          </div>
        ) : (
          <div className="space-y-1.5">
            <Label>Producto</Label>
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar producto…" autoFocus />
            <div className="max-h-44 overflow-y-auto border border-border rounded-md divide-y divide-border">
              {filtrados.length === 0 ? (
                <p className="text-sm text-muted-foreground py-3 text-center italic">Sin productos.</p>
              ) : (
                filtrados.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedId(p.id)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 flex items-center justify-between gap-2"
                  >
                    <span className="truncate text-foreground">{p.nombre}</span>
                    <span className="text-xs text-muted-foreground tabular-nums shrink-0">stock {p.stock_actual}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          <Label>Cantidad perdida</Label>
          <Input
            type="number"
            inputMode="numeric"
            value={cantidad}
            onChange={(e) => setCantidad(e.target.value)}
            placeholder="0"
            className="h-12 text-xl font-bold text-center"
          />
        </div>

        <div className="space-y-1.5">
          <Label>Motivo</Label>
          <div className="grid grid-cols-2 gap-2">
            {MOTIVOS.map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => setMotivo(m.value)}
                className={`h-10 rounded-lg text-sm font-semibold border transition-colors ${
                  motivo === m.value ? 'border-primary bg-primary/10 text-primary' : 'border-border text-foreground hover:bg-muted/50'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleConfirmar} disabled={!puedeConfirmar} className="bg-primary">
            {saving ? 'Registrando…' : 'Registrar merma'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
