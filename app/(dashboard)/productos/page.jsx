'use client';

import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth/AuthContext';
import { useConfig } from '@/hooks/useConfig';
import { getProductos, createProducto, updateProducto } from '@/lib/db/productos';
import { getCategorias } from '@/lib/db/categorias';
import { getProveedores } from '@/lib/db/proveedores';
import { formatMoney, calcUtilidad, calcMargen, formatPercent } from '@/utils/currency';
import ProductoDialog from '@/components/productos/ProductoDialog';
import LoadingState from '@/components/common/LoadingState';
import EmptyState from '@/components/common/EmptyState';
import InlineSyncIndicator from '@/components/common/InlineSyncIndicator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Package } from 'lucide-react';
import { toast } from 'sonner';
import { useGatedAction } from '@/hooks/useGatedAction';

export default function ProductosPage() {
  const { negocioId } = useAuth();
  const { config } = useConfig();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editProd, setEditProd] = useState(null);
  const [saving, setSaving] = useState(false);

  const sym = config?.simbolo_moneda || '$';
  const gated = useGatedAction();

  const { data: productos, isLoading, isFetching } = useQuery({
    queryKey: ['productos-all', negocioId],
    queryFn: () => getProductos(negocioId),
    enabled: !!negocioId,
    placeholderData: (prev) => prev,
  });

  const { data: categorias = [] } = useQuery({
    queryKey: ['categorias', negocioId],
    queryFn: () => getCategorias(negocioId),
    enabled: !!negocioId,
    staleTime: 1000 * 60 * 5,
  });

  const { data: proveedores = [] } = useQuery({
    queryKey: ['proveedores', negocioId],
    queryFn: () => getProveedores(negocioId),
    enabled: !!negocioId,
    staleTime: 1000 * 60 * 5,
  });

  // Mapa categoria_id → nombre (esquema normalizado).
  const catNombre = useMemo(() => {
    const m = new Map();
    categorias.forEach((c) => m.set(c.id, c.nombre));
    return m;
  }, [categorias]);

  const filtered = (productos || []).filter((p) => {
    const q = search.toLowerCase();
    const matchSearch = !q || p.nombre?.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q) || p.codigo_barras?.includes(q);
    const matchCat = catFilter === 'all' || p.categoria_id === catFilter;
    return matchSearch && matchCat;
  });

  const handleSave = async (data) => {
    if (!gated.ensureAccess()) return;
    setSaving(true);
    try {
      if (editProd) {
        await updateProducto(editProd.id, data);
        toast.success('Producto actualizado');
      } else {
        await createProducto({ ...data, negocio_id: negocioId });
        toast.success('Producto creado');
      }
      queryClient.invalidateQueries({ queryKey: ['productos-all'] });
      queryClient.invalidateQueries({ queryKey: ['productos-pos'] });
      setDialogOpen(false);
      setEditProd(null);
    } catch {
      toast.error('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-foreground">Productos</h1>
          <InlineSyncIndicator active={isFetching && !isLoading} label="Actualizando productos…" />
        </div>
        <Button onClick={gated(() => { setEditProd(null); setDialogOpen(true); })} className="bg-primary hover:bg-primary/90">
          <Plus className="h-4 w-4 mr-1" /> Nuevo Producto
        </Button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nombre, SKU o código..." className="pl-10" />
        </div>
        <Select value={catFilter} onValueChange={setCatFilter}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Categoría" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las categorías</SelectItem>
            {categorias.map((c) => <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading && !productos ? (
        <LoadingState rows={8} />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Package} title="Sin productos" description={search ? 'No se encontraron productos con esa búsqueda' : 'Agrega tu primer producto'} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered.map((p) => (
            <button
              key={p.id}
              onClick={gated(() => { setEditProd(p); setDialogOpen(true); })}
              className="flex flex-col p-4 rounded-xl border border-border bg-card hover:bg-muted hover:border-primary/30 transition-all text-left group"
            >
              <div className="flex items-start justify-between w-full">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm text-foreground truncate">{p.nombre}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{catNombre.get(p.categoria_id) || 'Sin categoría'} · {p.sku || 'Sin SKU'}</p>
                </div>
                <div className={`h-2 w-2 rounded-full flex-shrink-0 mt-1.5 ${p.activo ? 'bg-green-500' : 'bg-red-500'}`} />
              </div>
              <div className="flex items-center justify-between mt-3 w-full">
                <div>
                  <span className="text-lg font-bold text-primary">{formatMoney(p.precio_venta, sym)}</span>
                  <span className="text-xs text-muted-foreground ml-2">Costo: {formatMoney(p.costo_unitario, sym)}</span>
                </div>
              </div>
              <div className="flex items-center justify-between mt-2 w-full text-xs text-muted-foreground">
                <span>Utilidad: {formatMoney(calcUtilidad(p.precio_venta, p.costo_unitario), sym)}</span>
                <span>Margen: {formatPercent(calcMargen(p.precio_venta, p.costo_unitario))}</span>
              </div>
              <div className="flex items-center justify-between mt-2 w-full">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  p.stock_actual <= 0 ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                  p.stock_actual <= p.stock_minimo ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                  'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                }`}>
                  Stock: {p.stock_actual} {p.unidad_venta}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      <ProductoDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditProd(null); }}
        onSave={handleSave}
        producto={editProd}
        categorias={categorias}
        proveedores={proveedores}
        loading={saving}
      />
    </div>
  );
}
