'use client';

import { useState, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ScanLine, AlertCircle, Plus, Upload, Camera, X, Loader2 } from 'lucide-react';
import BarcodeScanner from '@/components/barcode/BarcodeScanner';
import { useProductoLookup } from '@/hooks/useProductoLookup';
import { createCategoria } from '@/lib/db/categorias';
import { toast } from 'sonner';
import { normalizeBarcode, isSuspiciousBarcode } from '@/utils/barcodeUtils';
import { playScanSuccess } from '@/utils/audioFeedback';

// Migrado: usa categoria_id / proveedor_id (esquema normalizado) en vez de los
// campos denormalizados categoria_nombre / proveedor_nombre de Base44.
const UNIDADES = ['pieza', 'caja', 'paquete', 'kg', 'gramos', 'litro', 'mililitro', 'metro', 'otro'];
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

// Colores predefinidos para el alta rápida de categoría (BUG 2).
const CATEGORIA_COLORES = ['#ef4444', '#f59e0b', '#10b981', '#2563eb', '#8b5cf6'];

const EMPTY = {
  nombre: '', categoria_id: '', marca: '', sku: '', codigo_barras: '',
  unidad_venta: 'pieza', precio_venta: '', costo_unitario: '', stock_actual: '',
  stock_minimo: '5', proveedor_id: '', activo: true, permite_venta_sin_stock: false, notas: '', imagen_url: '',
};

export default function ProductoDialog({ open, onClose, onSave, producto, categorias = [], proveedores = [], loading, codigoInicial = '' }) {
  const { checkDuplicado } = useProductoLookup();
  const { negocioId } = useAuth();
  const queryClient = useQueryClient();
  const galleryInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const [form, setForm] = useState(EMPTY);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [validating, setValidating] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageError, setImageError] = useState('');
  // Alta rápida de categoría desde el diálogo de producto (BUG 2).
  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [newCatNombre, setNewCatNombre] = useState('');
  const [newCatColor, setNewCatColor] = useState(CATEGORIA_COLORES[0]);
  const [savingCat, setSavingCat] = useState(false);

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
        imagen_url: producto.imagen_url || '',
      });
    } else {
      setForm({ ...EMPTY, codigo_barras: codigoInicial || '' });
    }
    setImageError('');
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
      imagen_url: form.imagen_url || null,
    });
  };

  const handleImageSelected = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!IMAGE_TYPES.includes(file.type)) {
      const message = 'Formato no permitido. Usa JPG, PNG o WebP.';
      setImageError(message);
      toast.error(message);
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      const message = 'La imagen no debe superar 2MB.';
      setImageError(message);
      toast.error(message);
      return;
    }

    setUploadingImage(true);
    setImageError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('folder', 'productos');
      const res = await fetch('/api/storage/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || 'upload failed');
      setForm((prev) => ({ ...prev, imagen_url: data.url }));
      toast.success('Imagen cargada');
    } catch (err) {
      const message = err?.message || 'Error al cargar imagen';
      setImageError(message);
      toast.error(message);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleScanDetected = (code) => {
    const normalized = normalizeBarcode(code);
    setForm((f) => ({ ...f, codigo_barras: normalized }));
    setScannerOpen(false);
    playScanSuccess();
    toast.success('Código agregado al producto');
  };

  const handleCreateCategoria = async () => {
    const nombre = newCatNombre.trim();
    if (!nombre || !negocioId) return;
    setSavingCat(true);
    try {
      const nueva = await createCategoria({ negocio_id: negocioId, nombre, color: newCatColor });
      // Refrescar la lista de categorías que alimenta este select (query del padre).
      await queryClient.invalidateQueries({ queryKey: ['categorias', negocioId] });
      // Seleccionar automáticamente la categoría recién creada.
      setForm((f) => ({ ...f, categoria_id: nueva.id }));
      toast.success(`Categoría "${nombre}" creada`);
      setNewCatNombre('');
      setNewCatColor(CATEGORIA_COLORES[0]);
      setCatDialogOpen(false);
    } catch (err) {
      toast.error('No se pudo crear la categoría', { description: err?.message });
    } finally {
      setSavingCat(false);
    }
  };

  const utilidad = (parseFloat(form.precio_venta) || 0) - (parseFloat(form.costo_unitario) || 0);
  const margen = (parseFloat(form.precio_venta) || 0) > 0 ? (utilidad / parseFloat(form.precio_venta)) * 100 : 0;

  const handleDialogOpenChange = (nextOpen) => {
    if (nextOpen) return;
    if (scannerOpen) return;
    if (catDialogOpen) return;
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
                    {categorias.length === 0 ? (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">
                        No hay categorías — crea una primero
                      </div>
                    ) : (
                      categorias.map((c) => <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>)
                    )}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setCatDialogOpen(true)}
                  className="mt-1 h-7 px-2 text-xs text-primary"
                >
                  <Plus className="h-3 w-3 mr-1" /> Nueva categoría
                </Button>
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
            <div>
              <Label>Imagen</Label>
              <div className="mt-1 flex items-center gap-3">
                {form.imagen_url && (
                  <div className="relative h-20 w-20 flex-shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={form.imagen_url} alt={form.nombre || 'Producto'} className="h-20 w-20 rounded-xl object-cover bg-muted border border-border" />
                    <button
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, imagen_url: '' }))}
                      className="absolute -right-2 -top-2 h-6 w-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow"
                      title="Eliminar imagen"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" onClick={() => galleryInputRef.current?.click()} disabled={uploadingImage} className="h-10">
                    <Upload className="h-4 w-4 mr-2" /> Subir imagen
                  </Button>
                  <Button type="button" variant="outline" onClick={() => cameraInputRef.current?.click()} disabled={uploadingImage} className="h-10">
                    <Camera className="h-4 w-4 mr-2" /> Tomar foto
                  </Button>
                </div>
              </div>
              {uploadingImage && (
                <p className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Subiendo...
                </p>
              )}
              {imageError && <p className="mt-2 text-xs text-destructive">{imageError}</p>}
              <input ref={galleryInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageSelected} className="hidden" />
              <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleImageSelected} className="hidden" />
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

      <Dialog open={catDialogOpen} onOpenChange={(o) => { if (!o) setCatDialogOpen(false); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Nueva categoría</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Nombre *</Label>
              <Input
                value={newCatNombre}
                onChange={(e) => setNewCatNombre(e.target.value)}
                placeholder="Bebidas, Botanas, Limpieza…"
                className="mt-1"
                autoFocus
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCreateCategoria(); } }}
              />
            </div>
            <div>
              <Label>Color</Label>
              <div className="flex gap-2 mt-1">
                {CATEGORIA_COLORES.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setNewCatColor(color)}
                    className={`h-7 w-7 rounded-full border-2 transition ${newCatColor === color ? 'border-foreground scale-110' : 'border-transparent'}`}
                    style={{ backgroundColor: color }}
                    aria-label={`Color ${color}`}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCatDialogOpen(false)}>Cancelar</Button>
            <Button type="button" onClick={handleCreateCategoria} disabled={!newCatNombre.trim() || savingCat} className="bg-primary">
              {savingCat ? 'Guardando…' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
