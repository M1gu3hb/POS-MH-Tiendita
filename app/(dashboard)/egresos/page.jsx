'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth/AuthContext';
import { useConfig } from '@/hooks/useConfig';
import { getCompras, getGastos } from '@/lib/db/egresos';
import { formatMoney } from '@/utils/currency';
import LoadingState from '@/components/common/LoadingState';
import EmptyState from '@/components/common/EmptyState';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import NuevaCompraDialog from '@/components/egresos/NuevaCompraDialog';
import NuevoGastoDialog from '@/components/egresos/NuevoGastoDialog';
import ProveedoresTab from '@/components/egresos/ProveedoresTab';
import { Truck, Receipt, Users } from 'lucide-react';
import { useGatedAction } from '@/hooks/useGatedAction';

export default function EgresosPage() {
  const { negocioId } = useAuth();
  const { config } = useConfig();
  const queryClient = useQueryClient();
  const sym = config?.simbolo_moneda || '$';
  const [compraOpen, setCompraOpen] = useState(false);
  const [gastoOpen, setGastoOpen] = useState(false);
  const gated = useGatedAction();

  const { data: compras = [], isLoading: comprasLoading } = useQuery({
    queryKey: ['compras', negocioId],
    queryFn: () => getCompras(negocioId, 100),
    enabled: !!negocioId,
    placeholderData: (prev) => prev,
  });

  const { data: gastos = [], isLoading: gastosLoading } = useQuery({
    queryKey: ['gastos-all', negocioId],
    queryFn: () => getGastos(negocioId, { limit: 200 }),
    enabled: !!negocioId,
    placeholderData: (prev) => prev,
  });

  const totalCompras = compras.reduce((s, c) => s + (c.total || 0), 0);
  const totalGastos = gastos.reduce((s, g) => s + (g.monto || 0), 0);

  const handleSaved = () => {
    queryClient.invalidateQueries({ queryKey: ['compras'] });
    queryClient.invalidateQueries({ queryKey: ['gastos-all'] });
    queryClient.invalidateQueries({ queryKey: ['gastos-caja'] });
    queryClient.invalidateQueries({ queryKey: ['productos-inventario'] });
    queryClient.invalidateQueries({ queryKey: ['productos-all'] });
    queryClient.invalidateQueries({ queryKey: ['productos-compra'] });
  };

  return (
    <div className="p-3 md:p-6 space-y-4 pb-24 lg:pb-6 max-w-full overflow-x-hidden">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-foreground">Compras y Gastos</h1>
        <div className="flex gap-2">
          <Button onClick={gated(() => setGastoOpen(true))} variant="outline" className="skeu-btn-ghost">
            <Receipt className="h-4 w-4 mr-1" /> Nuevo Gasto
          </Button>
          <Button onClick={gated(() => setCompraOpen(true))} className="skeu-btn-primary">
            <Truck className="h-4 w-4 mr-1" /> Nueva Compra
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="skeu-panel p-4">
          <p className="text-xs text-muted-foreground uppercase font-semibold">Total compras</p>
          <p className="text-2xl font-black text-foreground tabular-nums mt-1">{formatMoney(totalCompras, sym)}</p>
          <p className="text-xs text-muted-foreground mt-1">{compras.length} registros</p>
        </div>
        <div className="skeu-panel p-4">
          <p className="text-xs text-muted-foreground uppercase font-semibold">Total gastos op.</p>
          <p className="text-2xl font-black text-red-600 dark:text-red-400 tabular-nums mt-1">{formatMoney(totalGastos, sym)}</p>
          <p className="text-xs text-muted-foreground mt-1">{gastos.length} registros</p>
        </div>
      </div>

      <Tabs defaultValue="compras">
        <div className="overflow-x-auto -mx-1 px-1">
          <TabsList className="inline-flex w-max">
            <TabsTrigger value="compras" className="whitespace-nowrap">
              <Truck className="h-3.5 w-3.5 mr-1.5" />
              <span className="hidden sm:inline">Compras de Mercancía</span>
              <span className="sm:hidden">Compras</span>
            </TabsTrigger>
            <TabsTrigger value="gastos" className="whitespace-nowrap">
              <Receipt className="h-3.5 w-3.5 mr-1.5" />
              <span className="hidden sm:inline">Gastos Operativos</span>
              <span className="sm:hidden">Gastos</span>
            </TabsTrigger>
            <TabsTrigger value="proveedores" className="whitespace-nowrap">
              <Users className="h-3.5 w-3.5 mr-1.5" /> Proveedores
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="compras" className="mt-4">
          {comprasLoading && compras.length === 0 ? <LoadingState rows={4} type="list" /> :
            compras.length === 0 ? <EmptyState icon={Truck} title="Sin compras" description="Registra tu primera compra de mercancía" /> : (
            <div className="skeu-panel overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Fecha</th>
                      <th className="text-left px-3 py-3 font-medium text-muted-foreground">Proveedor</th>
                      <th className="text-right px-3 py-3 font-medium text-muted-foreground">Total</th>
                      <th className="text-center px-3 py-3 font-medium text-muted-foreground">Pago</th>
                    </tr>
                  </thead>
                  <tbody>
                    {compras.map((c) => (
                      <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                        <td className="px-4 py-3 text-foreground whitespace-nowrap">{c.fecha}</td>
                        <td className="px-3 py-3 text-foreground">{c.proveedor_nombre || 'Sin proveedor'}</td>
                        <td className="px-3 py-3 text-right font-semibold text-foreground whitespace-nowrap">{formatMoney(c.total, sym)}</td>
                        <td className="px-3 py-3 text-center text-muted-foreground capitalize">
                          <Badge variant="outline" className="text-xs">{c.metodo_pago}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="gastos" className="mt-4">
          {gastosLoading && gastos.length === 0 ? <LoadingState rows={4} type="list" /> :
            gastos.length === 0 ? <EmptyState icon={Receipt} title="Sin gastos" /> : (
            <div className="skeu-panel overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Fecha</th>
                      <th className="text-left px-3 py-3 font-medium text-muted-foreground">Concepto</th>
                      <th className="text-center px-3 py-3 font-medium text-muted-foreground">Categoría</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">Monto</th>
                      <th className="text-center px-3 py-3 font-medium text-muted-foreground">Pago</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gastos.map((g) => (
                      <tr key={g.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                        <td className="px-4 py-3 text-foreground whitespace-nowrap">{g.fecha}</td>
                        <td className="px-3 py-3 text-foreground">{g.concepto}</td>
                        <td className="px-3 py-3 text-center capitalize text-muted-foreground">{g.categoria}</td>
                        <td className="px-4 py-3 text-right font-semibold text-red-600 dark:text-red-400 whitespace-nowrap">{formatMoney(g.monto, sym)}</td>
                        <td className="px-3 py-3 text-center capitalize text-muted-foreground">{g.metodo_pago}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="proveedores" className="mt-4">
          <ProveedoresTab />
        </TabsContent>
      </Tabs>

      <NuevaCompraDialog open={compraOpen} onClose={() => setCompraOpen(false)} onSaved={handleSaved} />
      <NuevoGastoDialog open={gastoOpen} onClose={() => setGastoOpen(false)} onSaved={handleSaved} />
    </div>
  );
}
