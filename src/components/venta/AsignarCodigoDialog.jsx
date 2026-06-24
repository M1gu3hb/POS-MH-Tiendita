'use client';

import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Tag, AlertCircle, ArrowLeft } from 'lucide-react';
import { useProductoLookup } from '@/hooks/useProductoLookup';
import { updateProducto } from '@/lib/db/productos';
import { normalizeBarcode } from '@/utils/barcodeUtils';
import { toast } from 'sonner';

/**
 * Asigna un código de barras a un producto existente. Migrado a repositorios.
 */
export default function AsignarCodigoDialog({ open, codigo, productos = [], onClose, onAsignado }) {
  const { checkDuplicado } = useProductoLookup();
  const [query, setQuery] = useState('');
  const [seleccion, setSeleccion] = useState(null);
  const [saving, setSaving] = useState(false);

  const codigoNorm = normalizeBarcode(codigo);

  const resultados = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return productos.slice(0, 20);
    return productos.filter((p) => p.nombre?.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q) || p.marca?.toLowerCase().includes(q)).slice(0, 30);
  }, [query, productos]);

  const handleConfirm = async () => {
    if (!seleccion || !codigoNorm) return;
    setSaving(true);
    try {
      const dup = await checkDuplicado(codigoNorm, seleccion.id);
      if (dup.duplicate) {
        toast.error(`Este código ya está asignado a "${dup.productoConflicto?.nombre}"`);
        setSaving(false);
        return;
      }
      const updated = await updateProducto(seleccion.id, { codigo_barras: codigoNorm });
      toast.success(`Código actualizado para ${seleccion.nombre}`);
      onAsignado({ ...seleccion, ...(updated || {}), codigo_barras: codigoNorm });
    } catch {
      toast.error('Error al actualizar el producto');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setQuery('');
    setSeleccion(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Tag className="h-5 w-5 text-primary" /> Asignar código a producto</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="bg-muted/50 rounded-lg p-3 border border-border">
            <p className="text-xs text-muted-foreground mb-1">Código a asignar:</p>
            <p className="font-mono font-bold text-base break-all text-foreground">{codigoNorm}</p>
          </div>

          {!seleccion ? (
            <>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por nombre, SKU o marca..." className="pl-10 h-11" autoFocus />
              </div>
              <div className="border border-border rounded-lg max-h-72 overflow-y-auto">
                {resultados.length === 0 ? (
                  <div className="p-6 text-center text-sm text-muted-foreground">Sin resultados</div>
                ) : (
                  resultados.map((p) => (
                    <button key={p.id} onClick={() => setSeleccion(p)} className="w-full text-left px-3 py-2 hover:bg-muted transition-colors border-b border-border last:border-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium text-sm text-foreground truncate">{p.nombre}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {p.sku || '(sin SKU)'}
                            {p.codigo_barras && <span className="ml-1">· cód: {p.codigo_barras}</span>}
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground tabular-nums flex-shrink-0">stock: {p.stock_actual}</p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <button onClick={() => setSeleccion(null)} className="text-xs text-primary flex items-center gap-1 hover:underline">
                <ArrowLeft className="h-3 w-3" /> Elegir otro producto
              </button>
              <div className="skeu-card p-4">
                <p className="text-xs text-muted-foreground">Producto seleccionado:</p>
                <p className="font-bold text-base text-foreground mt-1">{seleccion.nombre}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{seleccion.sku || '(sin SKU)'}</p>
                {seleccion.codigo_barras && (
                  <div className="mt-2 pt-2 border-t border-border">
                    <p className="text-xs text-muted-foreground">Código anterior:</p>
                    <p className="font-mono text-sm text-foreground">{seleccion.codigo_barras}</p>
                  </div>
                )}
              </div>
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  Se asignará el código <strong className="font-mono">{codigoNorm}</strong> a este producto.
                  {seleccion.codigo_barras && ' El código anterior será reemplazado.'}
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-row gap-2">
          <Button variant="outline" onClick={handleClose} disabled={saving} className="flex-1">Cancelar</Button>
          <Button onClick={handleConfirm} disabled={!seleccion || saving} className="flex-1 bg-primary font-bold">{saving ? 'Guardando...' : 'Asignar código'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
