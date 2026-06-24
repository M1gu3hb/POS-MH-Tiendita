'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ScanLine, AlertCircle } from 'lucide-react';
import BarcodeScanner from '@/components/barcode/BarcodeScanner';
import { useProductoLookup } from '@/hooks/useProductoLookup';
import { toast } from 'sonner';
import { normalizeBarcode, isSuspiciousBarcode } from '@/utils/barcodeUtils';
import { playScanSuccess } from '@/utils/audioFeedback';

// Migrado: usa categoria_id / proveedor_id (esquema normalizado) en vez de los
// campos denormalizados categoria_nombre / proveedor_nombre de Base44.
const UNIDADES = ['pieza', 'caja', 'paquete', 'kg', 'gramos', 'litro', 'mililitro', 'metro', 'otro'];

const EMPTY = {
  nombre: '', categoria_id: '', marca: '', sku: '', codigo_barras: '',
  unidad_venta: 'pieza', precio_venta: '', costo_unitario: '', stock_actual: '',
  stock_minimo: '5', proveedor_id: '', activo: true, permite_venta_sin_stock: false, notas: '',
};

export default function ProductoDialog({ open, onClose, onSave, producto, categorias = [], proveedores = [], loading, codigoInicial = '' }) {
  const { checkDuplicado } = useProductoLookup();
  const [form, setForm] = useState(EMPTY);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [validating, setValidating] = useState(false);

  useEffect(() => {
    if (producto) {
      setForm({
        nombre: producto.nombre || '',
        categoria_id: producto.categoria_id || '',
        marca: producto.marca || '',
        sku: producto.sku || '',
        codigo_barras: producto.codigo_barras || '',
        unidad_venta: producto.unidad_venta || 'pieza',
        precio_venta: producto.precio_venta?.toString() || '',
        costo_unitario: producto.costo_unitario?.toString() || '',
        stock_actual: producto.stock_actual?.toString() || '',
        stock_minimo: producto.stock_minimo?.toString() || '5',
        proveedor_id: producto.proveedor_id || '',
        activo: producto.activo !== false,
        permite_venta_sin_stock: producto.permite_venta_sin_stock || false,
        notas: producto.notas || '',
      });
    } else {
      setForm({ ...EMPTY, codigo_barras: codigoInicial || '' });
    }
  }, [producto, open, codigoInicial]);

  const handleSave = async () => {
    const codigo = normalizeBarcode(form.codigo_barras);
    if (codigo) {
      if (isSuspiciousBarcode(codigo)) {
        const ok = window.confirm(`El código "${codigo}" parece incompleto. ¿Guardar de todas formas?`);
        if (!ok) return;
      }
      setValidating(true);
      const check = await checkDuplicado(codigo, producto?.id || null);
      setValidating(false);
      if (check.duplicate) {
        toast.error(`Este código ya está asignado a "${check.productoConflicto?.nombre}"`);
        return;
      }
    }
    onSave({
      nombre: form.nombre,
      categoria_id: form.categoria_id || null,
      proveedor_id: form.proveedor_id || null,
      marca: form.marca,
      sku: form.sku,
      unidad_venta: form.unidad_venta,
      activo: form.activo,
      permite_venta_sin_stock: form.permite_venta_sin_stock,
      notas: form.notas,
      codigo_barras: codigo,
      precio_venta: parseFloat(form.precio_venta) || 0,
      costo_unitario: parseFloat(form.costo_unitario) || 0,
      stock_actual: parseFloat(form.stock_actual) || 0,
      stock_minimo: parseFloat(form.stock_minimo) || 0,
    });
  };

  const handleScanDetected = (code) => {
    const normalized = normalizeBarcode(code);
    setForm((f) => ({ ...f, codigo_barras: normalized }));
    setScannerOpen(false);
    playScanSuccess();
    toast.success('Código agregado al producto');
  };

  const utilidad = (parseFloat(form.precio_venta) || 0) - (parseFloat(form.costo_unitario) || 0);
  const margen = (parseFloat(form.precio_venta) || 0) > 0 ? (utilidad / parseFloat(form.precio_venta)) * 100 : 0;

  const handleDialogOpenChange = (nextOpen) => {
    if (nextOpen) return;
    if (scannerOpen) return;
    onClose();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{producto ? 'Editar Producto' : 'Nuevo Producto'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Nombre *</Label>
              <Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Categoría</Label>
                <Select value={form.categoria_id} onValueChange={(v) => setForm({ ...form, categoria_id: v })}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>
                    {categorias.map((c) => <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Marca</Label>
                <Input value={form.marca} onChange={(e) => setForm({ ...form, marca: e.target.value })} className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>SKU</Label>
                <Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label>Código de barras</Label>
                <div className="flex gap-1 mt-1">
                  <Input
                    value={form.codigo_barras}
                    onChange={(e) => setForm({ ...form, codigo_barras: e.target.value })}
                    placeholder="EAN/UPC..."
                    className="flex-1"
                  />
                  <Button type="button" variant="outline" size="icon" onClick={() => setScannerOpen(true)} title="Escanear con cámara" className="flex-shrink-0">
                    <ScanLine className="h-4 w-4" />
                  </Button>
                </div>
                {form.codigo_barras && isSuspiciousBarcode(form.codigo_barras) && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 flex items-start gap-1">
                    <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                    Este código parece incompleto. Puedes escanearlo de nuevo.
                  </p>
                )}
              </div>
            </div>
            <div>
              <Label>Unidad de venta</Label>
              <Select value={form.unidad_venta} onValueChange={(v) => setForm({ ...form, unidad_venta: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {UNIDADES.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Precio de venta *</Label>
                <Input type="number" value={form.precio_venta} onChange={(e) => setForm({ ...form, precio_venta: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label>Costo unitario</Label>
                <Input type="number" value={form.costo_unitario} onChange={(e) => setForm({ ...form, costo_unitario: e.target.value })} className="mt-1" />
              </div>
            </div>
            {form.precio_venta && form.costo_unitario && (
              <div className="flex gap-4 text-xs text-muted-foreground bg-muted p-2 rounded-lg">
                <span>Utilidad: <strong className="text-foreground">${utilidad.toFixed(2)}</strong></span>
                <span>Margen: <strong className="text-foreground">{margen.toFixed(1)}%</strong></span>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Stock actual</Label>
                <Input type="number" value={form.stock_actual} onChange={(e) => setForm({ ...form, stock_actual: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label>Stock mínimo</Label>
                <Input type="number" value={form.stock_minimo} onChange={(e) => setForm({ ...form, stock_minimo: e.target.value })} className="mt-1" />
              </div>
            </div>
            <div>
              <Label>Proveedor</Label>
              <Select value={form.proveedor_id} onValueChange={(v) => setForm({ ...form, proveedor_id: v })}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>
                  {proveedores.map((p) => <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label>Activo</Label>
              <Switch checked={form.activo} onCheckedChange={(v) => setForm({ ...form, activo: v })} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Permite venta sin stock</Label>
              <Switch checked={form.permite_venta_sin_stock} onCheckedChange={(v) => setForm({ ...form, permite_venta_sin_stock: v })} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="button" onClick={handleSave} disabled={!form.nombre || loading || validating} className="bg-primary">
              {loading || validating ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BarcodeScanner
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onDetected={handleScanDetected}
        title="Escanear código del producto"
        requireConfirmation
        minStableScans={3}
        mode="product"
      />
    </>
  );
}
