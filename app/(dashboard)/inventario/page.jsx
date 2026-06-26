'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth/AuthContext';
import { useConfig } from '@/hooks/useConfig';
import { getProductos } from '@/lib/db/productos';
import { ajustarStock } from '@/lib/db/inventario';
import { formatMoney } from '@/utils/currency';
import LoadingState from '@/components/common/LoadingState';
import EmptyState from '@/components/common/EmptyState';
import InlineSyncIndicator from '@/components/common/InlineSyncIndicator';
import ConteoInventario from '@/components/inventario/ConteoInventario';
import MermaDialog from '@/components/inventario/MermaDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Search, Warehouse, Plus, Minus, SlidersHorizontal, ClipboardList, PackageX } from 'lucide-react';
import { toast } from 'sonner';
import { useGatedAction } from '@/hooks/useGatedAction';

const MOTIVOS_SALIDA = ['merma', 'pérdida', 'uso interno', 'error de conteo', 'devolución', 'otro'];

function getStockStatus(p) {
  const stock = p.stock_actual || 0;
  if (stock <= 0) return 'agotado';
  const min = p.stock_minimo;
  if (min && min > 0) return stock <= min ? 'bajo' : 'normal';
  const auto = { pieza: 5, paquete: 2, caja: 2, kg: 1, litro: 1, gramos: 500, mililitro: 500 };
  const umbral = auto[p.unidad_venta] ?? 3;
  return stock <= umbral ? 'bajo' : 'normal';
}

export default function InventarioPage() {
  const { negocioId, usuario } = useAuth();
  const { config } = useConfig();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [stockFilter, setStockFilter] = useState('all');
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [selectedProd, setSelectedProd] = useState(null);
  const [adjustType, setAdjustType] = useState('entrada');
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustMotivo, setAdjustMotivo] = useState('');
  const [saving, setSaving] = useState(false);
  const [conteoOpen, setConteoOpen] = useState(false);
  const [mermaOpen, setMermaOpen] = useState(false);
  const sym = config?.simbolo_moneda || '$';
  const gated = useGatedAction();

  const invalidarProductos = () => {
    queryClient.invalidateQueries({ queryKey: ['productos-inventario'] });
    queryClient.invalidateQueries({ queryKey: ['productos-pos'] });
    queryClient.invalidateQueries({ queryKey: ['productos-all'] });
  };

  const abrirConteo = () => {
    if (!gated.ensureAccess()) return;
    setConteoOpen(true);
  };

  const abrirMerma = () => {
    if (!gated.ensureAccess()) return;
    setMermaOpen(true);
  };

  const { data: productos, isLoading, isFetching } = useQuery({
    queryKey: ['productos-inventario', negocioId],
    queryFn: () => getProductos(negocioId),
    enabled: !!negocioId,
    placeholderData: (prev) => prev,
  });

  const filtered = (productos || []).filter((p) => {
    const q = search.toLowerCase();
    const matchSearch = !q || p.nombre?.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q) || p.codigo_barras?.includes(q);
    const status = getStockStatus(p);
    if (stockFilter === 'bajo') return matchSearch && status === 'bajo';
    if (stockFilter === 'agotado') return matchSearch && status === 'agotado';
    if (stockFilter === 'normal') return matchSearch && status === 'normal';
    return matchSearch;
  });

  const openAdjust = (prod, type) => {
    if (!gated.ensureAccess()) return;
    setSelectedProd(prod);
    setAdjustType(type);
    setAdjustQty('');
    setAdjustMotivo('');
    setAdjustOpen(true);
  };

  const handleAdjust = async () => {
    if (!selectedProd || !adjustQty) return;
    const qty = parseFloat(adjustQty) || 0;
    const oldStock = selectedProd.stock_actual || 0;
    let newStock = oldStock;
    if (adjustType === 'entrada') newStock = oldStock + qty;
    else if (adjustType === 'salida') newStock = Math.max(0, oldStock - qty);
    else newStock = qty;

    if (adjustType === 'ajuste' && newStock === oldStock) {
      toast.info('El stock no cambió');
      return;
    }

    setSaving(true);
    try {
      await ajustarStock({
        negocioId,
        productoId: selectedProd.id,
        productoNombre: selectedProd.nombre,
        stockAnterior: oldStock,
        stockNuevo: newStock,
        tipoMovimiento: adjustType === 'entrada' ? 'entrada_compra' : adjustType === 'salida' ? 'merma' : 'ajuste',
        usuarioId: usuario?.id ?? null,
        usuarioNombre: usuario?.nombre_visible ?? null,
        motivo: adjustMotivo || adjustType,
        costoUnitario: selectedProd.costo_unitario,
      });
      toast.success('Stock actualizado');
      queryClient.invalidateQueries({ queryKey: ['productos-inventario'] });
      queryClient.invalidateQueries({ queryKey: ['productos-pos'] });
      queryClient.invalidateQueries({ queryKey: ['productos-all'] });
      setAdjustOpen(false);
    } catch {
      toast.error('Error al ajustar stock');
    } finally {
      setSaving(false);
    }
  };

  const StatusBadge = ({ prod }) => {
    const st = getStockStatus(prod);
    if (st === 'agotado') return <Badge variant="destructive" className="text-xs">Agotado</Badge>;
    if (st === 'bajo') return <Badge className="text-xs bg-amber-500 hover:bg-amber-500">Stock bajo</Badge>;
    return <Badge variant="secondary" className="text-xs text-green-700 dark:text-green-400">Normal</Badge>;
  };

  return (
    <div className="p-3 md:p-6 space-y-4 pb-24 lg:pb-6">
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-2xl font-bold text-foreground">Inventario</h1>
        <InlineSyncIndicator active={isFetching && !isLoading} label="Actualizando inventario…" />
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={abrirConteo} title="Contar físicamente y detectar faltantes">
            <ClipboardList className="h-4 w-4 mr-1.5" /> Iniciar conteo
          </Button>
          <Button variant="outline" size="sm" className="text-red-600 dark:text-red-400 border-red-300 dark:border-red-700 hover:bg-red-50 dark:hover:bg-red-900/20" onClick={abrirMerma} title="Sacar producto dañado o caducado">
            <PackageX className="h-4 w-4 mr-1.5" /> Registrar merma
          </Button>
        </div>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar producto, SKU, código..." className="pl-10" />
        </div>
        <Select value={stockFilter} onValueChange={setStockFilter}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="normal">Normal</SelectItem>
            <SelectItem value="bajo">Stock bajo</SelectItem>
            <SelectItem value="agotado">Agotados</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading && !productos ? (
        <LoadingState rows={6} type="list" />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Warehouse} title="Sin productos" />
      ) : (
        <>
          <div className="md:hidden space-y-2">
            {filtered.map((p) => {
              const status = getStockStatus(p);
              const stockColor = status === 'agotado' ? 'text-red-500' : status === 'bajo' ? 'text-amber-600 dark:text-amber-400' : 'text-green-600 dark:text-green-400';
              return (
                <div key={p.id} className="skeu-card p-3">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground text-sm truncate">{p.nombre}</p>
                      <p className="text-xs text-muted-foreground truncate">{[p.sku, p.unidad_venta].filter(Boolean).join(' · ')}</p>
                    </div>
                    <StatusBadge prod={p} />
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase">Stock</p>
                      <p className={`text-xl font-black tabular-nums ${stockColor}`}>{p.stock_actual}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-muted-foreground uppercase">Costo</p>
                      <p className="text-sm font-semibold text-foreground tabular-nums">{formatMoney(p.costo_unitario, sym)}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    <Button variant="outline" size="sm" className="h-9 text-xs text-green-700 dark:text-green-400 border-green-300 dark:border-green-700" onClick={() => openAdjust(p, 'entrada')}>
                      <Plus className="h-3.5 w-3.5 mr-0.5" /> Entrada
                    </Button>
                    <Button variant="outline" size="sm" className="h-9 text-xs text-red-600 dark:text-red-400 border-red-300 dark:border-red-700" onClick={() => openAdjust(p, 'salida')}>
                      <Minus className="h-3.5 w-3.5 mr-0.5" /> Salida
                    </Button>
                    <Button variant="outline" size="sm" className="h-9 text-xs" onClick={() => openAdjust(p, 'ajuste')}>
                      <SlidersHorizontal className="h-3.5 w-3.5 mr-0.5" /> Ajustar
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="hidden md:block skeu-panel overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Producto</th>
                    <th className="text-center px-3 py-3 font-medium text-muted-foreground">Stock</th>
                    <th className="text-center px-3 py-3 font-medium text-muted-foreground">Estado</th>
                    <th className="text-center px-3 py-3 font-medium text-muted-foreground hidden sm:table-cell">Unidad</th>
                    <th className="text-right px-3 py-3 font-medium text-muted-foreground hidden md:table-cell">Costo</th>
                    <th className="text-center px-4 py-3 font-medium text-muted-foreground">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => (
                    <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">{p.nombre}</p>
                        <p className="text-xs text-muted-foreground">{p.sku || ''}</p>
                      </td>
                      <td className="text-center px-3 py-3">
                        <span className={`text-lg font-black tabular-nums ${getStockStatus(p) === 'agotado' ? 'text-red-500' : getStockStatus(p) === 'bajo' ? 'text-amber-600 dark:text-amber-400' : 'text-green-600 dark:text-green-400'}`}>
                          {p.stock_actual}
                        </span>
                      </td>
                      <td className="text-center px-3 py-3"><StatusBadge prod={p} /></td>
                      <td className="text-center px-3 py-3 text-muted-foreground text-xs hidden sm:table-cell">{p.unidad_venta}</td>
                      <td className="text-right px-3 py-3 text-muted-foreground tabular-nums hidden md:table-cell">{formatMoney(p.costo_unitario, sym)}</td>
                      <td className="text-center px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <Button variant="outline" size="sm" className="h-8 px-2 text-xs text-green-700 dark:text-green-400 border-green-300 dark:border-green-700 hover:bg-green-50 dark:hover:bg-green-900/20" title="Entrada de stock" onClick={() => openAdjust(p, 'entrada')}>
                            <Plus className="h-3.5 w-3.5 mr-0.5" /> Entrada
                          </Button>
                          <Button variant="outline" size="sm" className="h-8 px-2 text-xs text-red-600 dark:text-red-400 border-red-300 dark:border-red-700 hover:bg-red-50 dark:hover:bg-red-900/20" title="Merma / salida" onClick={() => openAdjust(p, 'salida')}>
                            <Minus className="h-3.5 w-3.5 mr-0.5" /> Salida
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" title="Ajuste de stock" onClick={() => openAdjust(p, 'ajuste')}>
                            <SlidersHorizontal className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <Dialog open={adjustOpen} onOpenChange={() => setAdjustOpen(false)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {adjustType === 'entrada' ? '+ Entrada de Stock' : adjustType === 'salida' ? '− Salida / Merma' : 'Ajustar Stock'}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Producto: <strong className="text-foreground">{selectedProd?.nombre}</strong></p>
          <p className="text-xs text-muted-foreground">Stock actual: <strong>{selectedProd?.stock_actual}</strong></p>

          {adjustType === 'ajuste' ? (
            <div>
              <Label>Nuevo stock real contado</Label>
              <Input type="number" value={adjustQty} onChange={(e) => setAdjustQty(e.target.value)} className="h-14 text-2xl font-black text-center mt-1" autoFocus />
              <p className="text-xs text-muted-foreground mt-1">Ingresa el conteo físico real. Se calculará la diferencia automáticamente.</p>
            </div>
          ) : (
            <div>
              <Label>{adjustType === 'entrada' ? 'Cantidad a ingresar' : 'Cantidad a restar'}</Label>
              <Input type="number" value={adjustQty} onChange={(e) => setAdjustQty(e.target.value)} className="h-14 text-2xl font-black text-center mt-1" autoFocus />
              {adjustQty && (
                <p className="text-xs text-muted-foreground mt-1">
                  Nuevo stock: <strong>{adjustType === 'entrada' ? (selectedProd?.stock_actual || 0) + (parseFloat(adjustQty) || 0) : Math.max(0, (selectedProd?.stock_actual || 0) - (parseFloat(adjustQty) || 0))}</strong>
                </p>
              )}
            </div>
          )}

          {adjustType === 'salida' && (
            <div>
              <Label>Motivo *</Label>
              <Select value={adjustMotivo} onValueChange={setAdjustMotivo}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Seleccionar motivo" /></SelectTrigger>
                <SelectContent>
                  {MOTIVOS_SALIDA.map((m) => <SelectItem key={m} value={m} className="capitalize">{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          {adjustType !== 'salida' && (
            <div>
              <Label>Notas</Label>
              <Input value={adjustMotivo} onChange={(e) => setAdjustMotivo(e.target.value)} placeholder="Notas opcionales..." className="mt-1" />
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustOpen(false)}>Cancelar</Button>
            <Button onClick={handleAdjust} disabled={saving || !adjustQty || (adjustType === 'salida' && !adjustMotivo)} className="bg-primary">
              {saving ? 'Guardando...' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConteoInventario
        open={conteoOpen}
        onClose={() => setConteoOpen(false)}
        negocioId={negocioId}
        usuarioNombre={usuario?.nombre_visible ?? null}
        sym={sym}
        onSaved={invalidarProductos}
      />

      <MermaDialog
        open={mermaOpen}
        onClose={() => setMermaOpen(false)}
        negocioId={negocioId}
        usuarioNombre={usuario?.nombre_visible ?? null}
        productos={productos || []}
        onSaved={invalidarProductos}
      />
    </div>
  );
}
