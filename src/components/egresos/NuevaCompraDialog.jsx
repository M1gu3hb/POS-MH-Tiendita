'use client';

import { useState, useRef, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/lib/auth/AuthContext';
import { getProveedores } from '@/lib/db/proveedores';
import { getProductos, getProductosByCodigo, createProducto } from '@/lib/db/productos';
import { createCompra } from '@/lib/db/egresos';
import { ajustarStock } from '@/lib/db/inventario';
import { formatMoney } from '@/utils/currency';
import { toast } from 'sonner';
import { Plus, Trash2, Search, Camera } from 'lucide-react';
import BarcodeScanner from '@/components/barcode/BarcodeScanner';
import { normalizeBarcode, compareBarcodes } from '@/utils/barcodeUtils';

const EMPTY_ITEM = { producto_id: '', producto_nombre: '', cantidad: 1, unidad_compra: 'pieza', piezas_por_caja: 1, costo_unitario: 0 };
const SIN_PROVEEDOR = '__none__';

function ProductoAutocomplete({ productos, value, onChange, onSelect }) {
  const [query, setQuery] = useState(value || '');
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => { setQuery(value || ''); }, [value]);
  useEffect(() => {
    const handleClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const results = query.length >= 1
    ? productos.filter((p) => p.nombre?.toLowerCase().includes(query.toLowerCase()) || p.sku?.toLowerCase().includes(query.toLowerCase()) || p.codigo_barras?.includes(query)).slice(0, 8)
    : [];

  return (
    <div className="relative" ref={ref}>
      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input value={query} onChange={(e) => { setQuery(e.target.value); onChange(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} placeholder="Buscar producto..." className="pl-7 h-9 text-xs" />
      </div>
      {open && (results.length > 0 || query.length >= 2) && (
        <div className="absolute z-50 w-full mt-1 skeu-panel max-h-48 overflow-y-auto rounded-lg">
          {results.map((p) => (
            <button key={p.id} type="button" className="w-full text-left px-3 py-2 text-xs hover:bg-muted/50 border-b border-border last:border-0" onClick={() => { onSelect(p); setQuery(p.nombre); setOpen(false); }}>
              <span className="font-medium text-foreground">{p.nombre}</span>
              <span className="text-muted-foreground ml-2">Stock: {p.stock_actual} · Costo: {formatMoney(p.costo_unitario)}</span>
            </button>
          ))}
          <button type="button" className="w-full text-left px-3 py-2 text-xs text-primary font-semibold hover:bg-primary/5 flex items-center gap-1" onClick={() => { onSelect({ id: '__new__', nombre: query }); setOpen(false); }}>
            <Plus className="h-3 w-3" /> Crear producto nuevo: &quot;{query}&quot;
          </button>
        </div>
      )}
    </div>
  );
}

function NuevoProductoRapidoDialog({ open, nombre: initNombre, codigoBarras: initCodigo, onClose, onCreated }) {
  const { negocioId } = useAuth();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ nombre: initNombre || '', sku: '', codigo_barras: initCodigo || '', unidad_venta: 'pieza', costo_unitario: '', precio_venta: '', stock_minimo: '5' });

  useEffect(() => {
    setForm((f) => ({ ...f, nombre: initNombre || f.nombre, codigo_barras: initCodigo || f.codigo_barras }));
  }, [initNombre, initCodigo, open]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.nombre) { toast.error('Nombre es obligatorio'); return; }
    setSaving(true);
    try {
      const prod = await createProducto({
        negocio_id: negocioId,
        nombre: form.nombre,
        sku: form.sku,
        codigo_barras: form.codigo_barras,
        unidad_venta: form.unidad_venta,
        costo_unitario: parseFloat(form.costo_unitario) || 0,
        precio_venta: parseFloat(form.precio_venta) || 0,
        stock_minimo: parseFloat(form.stock_minimo) || 5,
        stock_actual: 0,
        activo: true,
      });
      queryClient.invalidateQueries({ queryKey: ['productos-compra'] });
      queryClient.invalidateQueries({ queryKey: ['productos-inventario'] });
      toast.success('Producto creado');
      onCreated(prod);
    } catch {
      toast.error('Error al crear producto');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md z-[200]">
        <DialogHeader><DialogTitle>Crear Producto Nuevo</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div><Label>Nombre *</Label><Input value={form.nombre} onChange={(e) => set('nombre', e.target.value)} className="mt-1" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Unidad de venta</Label>
              <Select value={form.unidad_venta} onValueChange={(v) => set('unidad_venta', v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['pieza', 'caja', 'paquete', 'kg', 'gramos', 'litro', 'mililitro', 'metro', 'otro'].map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>SKU</Label><Input value={form.sku} onChange={(e) => set('sku', e.target.value)} className="mt-1" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Costo unitario</Label><Input type="number" value={form.costo_unitario} onChange={(e) => set('costo_unitario', e.target.value)} className="mt-1" placeholder="0.00" /></div>
            <div><Label>Precio de venta</Label><Input type="number" value={form.precio_venta} onChange={(e) => set('precio_venta', e.target.value)} className="mt-1" placeholder="0.00" /></div>
          </div>
          <div><Label>Código barras</Label><Input value={form.codigo_barras} onChange={(e) => set('codigo_barras', e.target.value)} className="mt-1" /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-primary">{saving ? 'Creando...' : 'Crear Producto'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function NuevaCompraDialog({ open, onClose, onSaved }) {
  const { negocioId, usuario } = useAuth();
  const [saving, setSaving] = useState(false);
  const [proveedorId, setProveedorId] = useState(SIN_PROVEEDOR);
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [metodoPago, setMetodoPago] = useState('efectivo');
  const [notas, setNotas] = useState('');
  const [items, setItems] = useState([{ ...EMPTY_ITEM }]);
  const [nuevoProductoOpen, setNuevoProductoOpen] = useState(false);
  const [nuevoProductoNombre, setNuevoProductoNombre] = useState('');
  const [nuevoProductoCodigo, setNuevoProductoCodigo] = useState('');
  const [nuevoProductoItemIdx, setNuevoProductoItemIdx] = useState(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerItemIdx, setScannerItemIdx] = useState(null);

  const { data: proveedores = [] } = useQuery({
    queryKey: ['proveedores', negocioId],
    queryFn: () => getProveedores(negocioId),
    enabled: !!negocioId,
    placeholderData: (p) => p,
  });

  const { data: productos = [] } = useQuery({
    queryKey: ['productos-compra', negocioId],
    queryFn: () => getProductos(negocioId, { soloActivos: true }),
    enabled: !!negocioId,
    placeholderData: (p) => p,
  });

  const addItem = () => setItems((i) => [...i, { ...EMPTY_ITEM }]);
  const removeItem = (idx) => setItems((i) => i.filter((_, j) => j !== idx));
  const updateItem = (idx, field, val) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: val };
      return updated;
    });
  };

  const handleSelectProducto = (idx, prod) => {
    if (prod.id === '__new__') {
      setNuevoProductoNombre(prod.nombre);
      setNuevoProductoCodigo(prod.codigo_barras || '');
      setNuevoProductoItemIdx(idx);
      setNuevoProductoOpen(true);
      return;
    }
    setItems((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], producto_id: prod.id, producto_nombre: prod.nombre, costo_unitario: prod.costo_unitario || 0, unidad_compra: prod.unidad_venta || 'pieza' };
      return updated;
    });
  };

  const handleProductoCreado = (prod) => {
    setNuevoProductoOpen(false);
    setNuevoProductoCodigo('');
    if (nuevoProductoItemIdx !== null) {
      handleSelectProducto(nuevoProductoItemIdx, prod);
      setNuevoProductoItemIdx(null);
    }
  };

  const handleScanForItem = async (code) => {
    const idx = scannerItemIdx;
    const normalized = normalizeBarcode(code);
    setScannerOpen(false);
    if (idx === null || !normalized) return;
    let found = productos.find((p) => p.codigo_barras && compareBarcodes(p.codigo_barras, normalized));
    if (!found) {
      try {
        const backend = await getProductosByCodigo(negocioId, normalized);
        found = backend[0];
      } catch {
        /* noop */
      }
    }
    if (found) {
      handleSelectProducto(idx, found);
      toast.success(`Producto: ${found.nombre}`);
    } else {
      setNuevoProductoNombre('');
      setNuevoProductoCodigo(normalized);
      setNuevoProductoItemIdx(idx);
      setNuevoProductoOpen(true);
      toast.info('Producto no encontrado — crearlo');
    }
  };

  const totalCompra = items.reduce((s, i) => s + i.costo_unitario * i.cantidad, 0);

  const handleSave = async () => {
    if (items.length === 0 || items.some((i) => !i.producto_id)) {
      toast.error('Selecciona al menos un producto');
      return;
    }
    setSaving(true);
    try {
      const prov = proveedores.find((p) => p.id === proveedorId);
      const detalle = items.map((item) => {
        const stockToAdd = item.unidad_compra === 'caja' ? item.cantidad * (item.piezas_por_caja || 1) : item.cantidad;
        const costoTotal = item.costo_unitario * item.cantidad;
        const costoUnitarioReal = item.unidad_compra === 'caja' ? costoTotal / stockToAdd : item.costo_unitario;
        return {
          producto_id: item.producto_id,
          producto_nombre: item.producto_nombre,
          cantidad_compra: item.cantidad,
          unidad_compra: item.unidad_compra,
          piezas_por_caja: item.piezas_por_caja,
          cantidad_stock_agregada: stockToAdd,
          costo_unitario: costoUnitarioReal,
          costo_total: costoTotal,
        };
      });

      const compra = await createCompra({
        compra: {
          negocio_id: negocioId,
          proveedor_id: proveedorId === SIN_PROVEEDOR ? null : proveedorId,
          proveedor_nombre: prov?.nombre || 'Sin proveedor',
          fecha,
          total: totalCompra,
          metodo_pago: metodoPago,
          notas,
          usuario_id: usuario?.id ?? null,
          usuario_nombre: usuario?.nombre_visible ?? null,
        },
        detalle,
      });

      // Aplicar entrada de stock + kardex por cada renglón.
      for (const item of items) {
        const prod = productos.find((p) => p.id === item.producto_id);
        if (!prod) continue;
        const stockToAdd = item.unidad_compra === 'caja' ? item.cantidad * (item.piezas_por_caja || 1) : item.cantidad;
        const costoTotal = item.costo_unitario * item.cantidad;
        const costoUnitarioReal = item.unidad_compra === 'caja' ? costoTotal / stockToAdd : item.costo_unitario;
        const newStock = (prod.stock_actual || 0) + stockToAdd;
        await ajustarStock({
          negocioId,
          productoId: item.producto_id,
          productoNombre: item.producto_nombre,
          stockAnterior: prod.stock_actual || 0,
          stockNuevo: newStock,
          tipoMovimiento: 'entrada_compra',
          usuarioId: usuario?.id ?? null,
          usuarioNombre: usuario?.nombre_visible ?? null,
          costoUnitario: costoUnitarioReal,
          referenciaTipo: 'compra',
          referenciaId: compra.id,
        });
      }

      toast.success('Compra registrada');
      onSaved?.();
      onClose();
      setItems([{ ...EMPTY_ITEM }]);
      setProveedorId(SIN_PROVEEDOR);
      setNotas('');
    } catch {
      toast.error('Error al registrar compra');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Nueva Compra de Mercancía</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Proveedor</Label>
                <Select value={proveedorId} onValueChange={setProveedorId}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Sin proveedor" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={SIN_PROVEEDOR}>Sin proveedor</SelectItem>
                    {proveedores.map((p) => <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Fecha</Label>
                <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="mt-1" />
              </div>
            </div>
            <div>
              <Label>Método de pago</Label>
              <Select value={metodoPago} onValueChange={setMetodoPago}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="efectivo">Efectivo</SelectItem>
                  <SelectItem value="tarjeta">Tarjeta</SelectItem>
                  <SelectItem value="transferencia">Transferencia</SelectItem>
                  <SelectItem value="otro">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Productos comprados</Label>
              <Button variant="outline" size="sm" onClick={addItem}><Plus className="h-3 w-3 mr-1" /> Agregar producto</Button>
            </div>

            {items.map((item, idx) => (
              <div key={idx} className="skeu-panel p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <Label className="text-xs">Producto</Label>
                    <ProductoAutocomplete productos={productos} value={item.producto_nombre} onChange={(v) => updateItem(idx, 'producto_nombre', v)} onSelect={(prod) => handleSelectProducto(idx, prod)} />
                  </div>
                  <Button type="button" variant="outline" size="icon" className="h-8 w-8 flex-shrink-0 mt-4" onClick={() => { setScannerItemIdx(idx); setScannerOpen(true); }} title="Escanear código">
                    <Camera className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive flex-shrink-0 mt-4" onClick={() => removeItem(idx)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  <div>
                    <Label className="text-xs">Unidad</Label>
                    <Select value={item.unidad_compra} onValueChange={(v) => updateItem(idx, 'unidad_compra', v)}>
                      <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pieza">Pieza</SelectItem>
                        <SelectItem value="caja">Caja</SelectItem>
                        <SelectItem value="paquete">Paquete</SelectItem>
                        <SelectItem value="kg">Kg</SelectItem>
                        <SelectItem value="litro">Litro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {item.unidad_compra === 'caja' && (
                    <div>
                      <Label className="text-xs">Pzas/caja</Label>
                      <Input type="number" value={item.piezas_por_caja} onChange={(e) => updateItem(idx, 'piezas_por_caja', parseInt(e.target.value, 10) || 1)} className="mt-1 h-8 text-xs" />
                    </div>
                  )}
                  <div>
                    <Label className="text-xs">Cantidad</Label>
                    <Input type="number" value={item.cantidad} onChange={(e) => updateItem(idx, 'cantidad', parseFloat(e.target.value) || 1)} className="mt-1 h-8 text-xs" />
                  </div>
                  <div>
                    <Label className="text-xs">Costo unit.</Label>
                    <Input type="number" value={item.costo_unitario} onChange={(e) => updateItem(idx, 'costo_unitario', parseFloat(e.target.value) || 0)} className="mt-1 h-8 text-xs" />
                  </div>
                  <div className="flex items-end">
                    <p className="text-xs font-bold text-foreground tabular-nums pb-1">= {formatMoney(item.cantidad * item.costo_unitario)}</p>
                  </div>
                </div>
              </div>
            ))}

            <div className="flex justify-end text-base font-bold text-foreground border-t border-border pt-2">Total: {formatMoney(totalCompra)}</div>
            <div>
              <Label>Notas</Label>
              <Input value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Notas opcionales..." className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-primary">{saving ? 'Guardando...' : 'Registrar Compra'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <NuevoProductoRapidoDialog open={nuevoProductoOpen} nombre={nuevoProductoNombre} codigoBarras={nuevoProductoCodigo} onClose={() => { setNuevoProductoOpen(false); setNuevoProductoCodigo(''); }} onCreated={handleProductoCreado} />

      <BarcodeScanner open={scannerOpen} onClose={() => { setScannerOpen(false); setScannerItemIdx(null); }} onDetected={handleScanForItem} title="Escanear código del producto a comprar" requireConfirmation minStableScans={3} mode="purchase" />
    </>
  );
}
