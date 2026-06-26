'use client';

import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth/AuthContext';
import { getProductos } from '@/lib/db/productos';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatMoney } from '@/utils/currency';
import { Plus, Trash2, Search, X } from 'lucide-react';
import { toast } from 'sonner';

export default function ComboDialog({
  open,
  onClose,
  onSave,
  combo,
  loading,
  sym = '$',
}) {
  const { negocioId } = useAuth();
  const [nombre, setNombre] = useState('');
  const [precioCombo, setPrecioCombo] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [precioModificadoManualmente, setPrecioModificadoManualmente] = useState(false);

  // Obtener todos los productos para el buscador
  const { data: productos = [] } = useQuery({
    queryKey: ['productos-all', negocioId],
    queryFn: () => getProductos(negocioId),
    enabled: !!negocioId && open,
  });

  // Pre-llenar el formulario si se está editando
  useEffect(() => {
    if (combo && open) {
      setNombre(combo.nombre || '');
      setPrecioCombo(combo.precio_combo?.toString() || '');
      setFechaInicio(combo.fecha_inicio || '');
      setFechaFin(combo.fecha_fin || '');
      setSelectedProducts(
        (combo.combo_productos || []).map((cp) => ({
          producto_id: cp.producto_id,
          nombre: cp.productos?.nombre || 'Producto',
          precio_venta: cp.productos?.precio_venta || 0,
          cantidad: cp.cantidad || 1,
        }))
      );
      setPrecioModificadoManualmente(true);
    } else if (open) {
      setNombre('');
      setPrecioCombo('');
      setFechaInicio('');
      setFechaFin('');
      setSelectedProducts([]);
      setSearchQuery('');
      setPrecioModificadoManualmente(false);
    }
  }, [combo, open]);

  // Filtrar productos disponibles que coincidan con la búsqueda y que no estén ya en el combo
  const filteredSearchList = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return [];
    
    return productos.filter(
      (prod) =>
        prod.activo &&
        (prod.nombre?.toLowerCase().includes(q) || prod.sku?.toLowerCase().includes(q) || prod.codigo_barras?.includes(q)) &&
        !selectedProducts.some((sp) => sp.producto_id === prod.id)
    ).slice(0, 5);
  }, [productos, searchQuery, selectedProducts]);

  // Calcular la suma de precios normales de los productos del combo
  const totalSumaNormal = useMemo(() => {
    return selectedProducts.reduce((sum, sp) => sum + sp.precio_venta * sp.cantidad, 0);
  }, [selectedProducts]);

  // Sugerir un precio con descuento (15% menos)
  const precioSugerido = useMemo(() => {
    if (totalSumaNormal <= 0) return 0;
    return Math.round(totalSumaNormal * 0.85 * 100) / 100;
  }, [totalSumaNormal]);

  // Auto-completar el precio del combo con el sugerido si no se ha modificado manualmente
  useEffect(() => {
    if (!precioModificadoManualmente && precioSugerido > 0) {
      setPrecioCombo(precioSugerido.toString());
    }
  }, [precioSugerido, precioModificadoManualmente]);

  const handleAddProduct = (prod) => {
    setSelectedProducts((prev) => [
      ...prev,
      {
        producto_id: prod.id,
        nombre: prod.nombre,
        precio_venta: prod.precio_venta || 0,
        cantidad: 1,
      },
    ]);
    setSearchQuery('');
  };

  const handleUpdateQty = (productoId, newQty) => {
    if (newQty <= 0) {
      handleRemoveProduct(productoId);
      return;
    }
    setSelectedProducts((prev) =>
      prev.map((sp) =>
        sp.producto_id === productoId ? { ...sp, cantidad: newQty } : sp
      )
    );
  };

  const handleRemoveProduct = (productoId) => {
    setSelectedProducts((prev) =>
      prev.filter((sp) => sp.producto_id !== productoId)
    );
  };

  const handleSave = () => {
    const parsedPrecio = parseFloat(precioCombo);
    if (!nombre.trim()) {
      toast.error('El nombre del combo es requerido');
      return;
    }
    if (selectedProducts.length === 0) {
      toast.error('Debes agregar al menos un producto al combo');
      return;
    }
    if (isNaN(parsedPrecio) || parsedPrecio <= 0) {
      toast.error('El precio del combo debe ser mayor a 0');
      return;
    }

    onSave({
      nombre: nombre.trim(),
      precio_combo: parsedPrecio,
      precio_sugerido: precioSugerido || null,
      fecha_inicio: fechaInicio || null,
      fecha_fin: fechaFin || null,
      productos: selectedProducts.map((sp) => ({
        producto_id: sp.producto_id,
        cantidad: sp.cantidad,
      })),
    });
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="sm:max-w-[480px] max-h-[90vh] flex flex-col p-6 overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-xl font-bold">
            {combo ? 'Editar Combo' : 'Nuevo Combo / Promoción'}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-1 py-4 space-y-4">
          {/* Nombre */}
          <div className="space-y-1">
            <Label htmlFor="combo-nombre" className="text-sm font-bold text-foreground">
              Nombre del combo *
            </Label>
            <Input
              id="combo-nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej. Paquete Desayuno, Fin de Semana"
              className="h-10 text-sm"
              autoComplete="off"
            />
          </div>

          {/* Selector/Buscador de productos */}
          <div className="space-y-1 relative">
            <Label className="text-sm font-bold text-foreground">
              Agregar productos
            </Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Escribe el nombre o SKU de un producto..."
                className="pl-10 h-10 text-sm"
                autoComplete="off"
              />
            </div>

            {/* Lista de búsqueda flotante */}
            {filteredSearchList.length > 0 && (
              <div className="absolute left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto divide-y divide-border">
                {filteredSearchList.map((prod) => (
                  <button
                    key={prod.id}
                    onClick={() => handleAddProduct(prod)}
                    className="w-full text-left px-3 py-2 hover:bg-muted/70 transition-colors flex items-center justify-between text-xs"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="font-semibold text-foreground truncate">{prod.nombre}</p>
                      <p className="text-[10px] text-muted-foreground">{prod.sku || 'Sin SKU'}</p>
                    </div>
                    <span className="font-bold text-primary shrink-0">
                      {formatMoney(prod.precio_venta, sym)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Lista de productos seleccionados */}
          <div className="space-y-2">
            <Label className="text-sm font-bold text-foreground">
              Productos en el combo ({selectedProducts.length})
            </Label>
            {selectedProducts.length === 0 ? (
              <div className="border-2 border-dashed border-border rounded-xl p-4 text-center text-xs text-muted-foreground">
                Usa el buscador de arriba para agregar productos.
              </div>
            ) : (
              <div className="border border-border rounded-xl divide-y divide-border overflow-hidden bg-muted/20">
                {selectedProducts.map((sp) => (
                  <div key={sp.producto_id} className="p-3 flex items-center justify-between gap-3 bg-card">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-xs text-foreground truncate">{sp.nombre}</p>
                      <p className="text-[10px] text-muted-foreground">
                        Normal: {formatMoney(sp.precio_venta, sym)} c/u
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleUpdateQty(sp.producto_id, sp.cantidad - 1)}
                        className="h-7 w-7 rounded-lg border border-border flex items-center justify-center font-bold text-sm bg-muted/50 hover:bg-muted active:scale-95 transition-all text-foreground"
                      >
                        -
                      </button>
                      <span className="w-6 text-center font-black text-xs text-foreground select-none">
                        {sp.cantidad}
                      </span>
                      <button
                        onClick={() => handleUpdateQty(sp.producto_id, sp.cantidad + 1)}
                        className="h-7 w-7 rounded-lg border border-border flex items-center justify-center font-bold text-sm bg-muted/50 hover:bg-muted active:scale-95 transition-all text-foreground"
                      >
                        +
                      </button>
                      <button
                        onClick={() => handleRemoveProduct(sp.producto_id)}
                        className="h-7 w-7 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-500 flex items-center justify-center transition-colors ml-1"
                        title="Eliminar producto"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Cálculos Inteligentes */}
          {selectedProducts.length > 0 && (
            <div className="p-3 rounded-xl border border-border bg-primary/5 flex flex-col gap-1 text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>Precio regular sumado:</span>
                <span className="font-semibold tabular-nums">{formatMoney(totalSumaNormal, sym)}</span>
              </div>
              <div className="flex justify-between text-primary font-bold">
                <span>Precio sugerido (15% desc):</span>
                <span className="tabular-nums">{formatMoney(precioSugerido, sym)}</span>
              </div>
            </div>
          )}

          {/* Precio del combo */}
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <Label htmlFor="combo-precio" className="text-sm font-bold text-foreground">
                Precio de venta del combo *
              </Label>
              {precioModificadoManualmente && precioSugerido > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setPrecioCombo(precioSugerido.toString());
                    setPrecioModificadoManualmente(false);
                  }}
                  className="text-[10px] text-primary font-bold hover:underline"
                >
                  Usar sugerido
                </button>
              )}
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">
                {sym}
              </span>
              <Input
                id="combo-precio"
                type="number"
                step="0.01"
                min="0.01"
                value={precioCombo}
                onChange={(e) => {
                  setPrecioCombo(e.target.value);
                  setPrecioModificadoManualmente(true);
                }}
                placeholder="0.00"
                className="pl-7 h-10 text-sm"
              />
            </div>
          </div>

          {/* Vigencia */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="combo-inicio" className="text-sm font-bold text-foreground">
                Vigente desde
              </Label>
              <Input
                id="combo-inicio"
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="h-10 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="combo-fin" className="text-sm font-bold text-foreground">
                Vigente hasta
              </Label>
              <Input
                id="combo-fin"
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                className="h-10 text-sm"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="flex-shrink-0 pt-4 border-t border-border flex gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading}
            className="flex-1 h-10 font-bold"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={loading}
            className="flex-1 h-10 font-bold"
          >
            {loading ? 'Guardando...' : 'Guardar Combo'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
