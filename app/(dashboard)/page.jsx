'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/AuthContext';
import { useCajaAbierta } from '@/hooks/useCajaAbierta';
import { useConfig } from '@/hooks/useConfig';
import { getVentas, getTopProductos, getResumenHoy } from '@/lib/db/ventas';
import { getGastos } from '@/lib/db/egresos';
import { getCortes } from '@/lib/db/caja';
import { getProductos, getProductosStockBajo } from '@/lib/db/productos';
import { formatMoney, formatPercent } from '@/utils/currency';
import StatCard from '@/components/dashboard/StatCard';
import LoadingState from '@/components/common/LoadingState';
import {
  DollarSign, TrendingUp, TrendingDown, Wallet, CreditCard,
  Banknote, ArrowRightLeft, AlertTriangle, Package, ShoppingBag, FileText,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, CartesianGrid,
} from 'recharts';
import ChartTooltip from '@/components/common/ChartTooltip';
import SuscripcionAviso from '@/components/dashboard/SuscripcionAviso';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';


const PAYMENT_COLORS = ['#22c55e', '#3b82f6', '#a855f7'];

export default function DashboardPage() {
  const { negocioId, usuario } = useAuth();
  const { config } = useConfig();
  const { cajaAbierta, isLoading: cajaLoading } = useCajaAbierta();

  const [resumenOpen, setResumenOpen] = useState(false);
  const [expandedSuppliers, setExpandedSuppliers] = useState({});

  const { data: resumenHoy, isLoading: resumenLoading } = useQuery({
    queryKey: ['resumen-hoy', negocioId],
    queryFn: () => getResumenHoy(negocioId),
    enabled: !!negocioId && usuario?.rol === 'dueno',
    staleTime: 1000 * 30,
  });

  const { data: productosStockBajo = [] } = useQuery({
    queryKey: ['productos-stock-bajo', negocioId],
    queryFn: () => getProductosStockBajo(negocioId),
    enabled: !!negocioId,
  });

  // Agrupar los resultados por proveedor_nombre
  const lowStockBySupplier = {};
  (productosStockBajo || []).forEach((p) => {
    const key = p.proveedor_nombre || 'Sin proveedor asignado';
    if (!lowStockBySupplier[key]) {
      lowStockBySupplier[key] = [];
    }
    lowStockBySupplier[key].push(p);
  });

  // Proveedores con 3 o más productos en stock bajo
  const suggestedOrders = Object.entries(lowStockBySupplier)
    .filter(([_, items]) => items.length >= 3)
    .map(([supplier, items]) => ({ supplier, items }));


  // Métricas de la CAJA ACTUAL (no del día acumulado).
  const cajaId = cajaAbierta?.id || null;

  const { data: ventasCaja, isLoading: ventasLoading } = useQuery({
    queryKey: ['ventas-caja', negocioId, cajaId],
    queryFn: async () => {
      const ventas = await getVentas(negocioId, { corteId: cajaId });
      return ventas.filter((v) => v.estado === 'pagada');
    },
    enabled: !!negocioId && !!cajaId,
    staleTime: 0,
    refetchInterval: () => (typeof document !== 'undefined' && document.hidden ? false : 2500),
    refetchOnWindowFocus: true,
    placeholderData: (prev) => prev,
  });

  const { data: gastosCaja, isLoading: gastosLoading } = useQuery({
    queryKey: ['gastos-caja', negocioId, cajaId],
    queryFn: () => getGastos(negocioId, { corteId: cajaId }),
    enabled: !!negocioId && !!cajaId,
    staleTime: 0,
    refetchInterval: () => (typeof document !== 'undefined' && document.hidden ? false : 2500),
    placeholderData: (prev) => prev,
  });

  const { data: cortesRecientes } = useQuery({
    queryKey: ['dashboard-cortes', negocioId],
    queryFn: () => getCortes(negocioId, 5),
    enabled: !!negocioId,
    placeholderData: (p) => p,
  });

  const { data: productosAll, isLoading: prodLoading } = useQuery({
    queryKey: ['productos-dashboard', negocioId],
    queryFn: () => getProductos(negocioId, { soloActivos: true }),
    enabled: !!negocioId,
    placeholderData: (prev) => prev,
  });

  const { data: topProductos, isLoading: topProductosLoading } = useQuery({
    queryKey: ['top-productos', negocioId],
    queryFn: () => getTopProductos(negocioId, 5),
    enabled: !!negocioId,
    staleTime: 1000 * 60 * 2,
  });

  const isLoading = ventasLoading || gastosLoading || prodLoading || cajaLoading;
  const sym = config?.simbolo_moneda || '$';

  const todayVentas = cajaAbierta ? ventasCaja || [] : [];
  const totalVentas = todayVentas.reduce((s, v) => s + (v.total || 0), 0);
  const numTickets = todayVentas.length;
  const costoVentas = todayVentas.reduce((s, v) => s + (v.costo_total_snapshot || 0), 0);
  const utilidadBruta = totalVentas - costoVentas;
  const margenPromedio = totalVentas > 0 ? (utilidadBruta / totalVentas) * 100 : 0;

  const gastos = cajaAbierta ? gastosCaja || [] : [];
  const totalGastos = gastos.reduce((s, g) => s + (g.monto || 0), 0);
  const utilidadNeta = utilidadBruta - totalGastos;

  const totalEfectivo = todayVentas.reduce((s, v) => s + (v.monto_efectivo || 0), 0);
  const totalTarjeta = todayVentas.reduce((s, v) => s + (v.monto_tarjeta || 0), 0);
  const totalTransferencia = todayVentas.reduce((s, v) => s + (v.monto_transferencia || 0), 0);

  const productos = productosAll || [];
  const bajoStock = productos.filter((p) => p.stock_actual <= p.stock_minimo && p.stock_actual > 0);
  const agotados = productos.filter((p) => p.stock_actual <= 0);

  const paymentData = [
    { name: 'Efectivo', value: totalEfectivo },
    { name: 'Tarjeta', value: totalTarjeta },
    { name: 'Transfer.', value: totalTransferencia },
  ].filter((d) => d.value > 0);

  const analisisData = [
    { name: 'Ventas', valor: totalVentas },
    { name: 'Costo venta', valor: costoVentas },
    { name: 'Ut. Bruta', valor: utilidadBruta },
    { name: 'Gastos Op.', valor: totalGastos },
    { name: 'Ut. Neta', valor: utilidadNeta },
  ];
  const barColors = ['#3b82f6', '#f59e0b', '#22c55e', '#ef4444', '#a855f7'];

  if (isLoading && !ventasCaja && cajaAbierta) {
    return (
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <LoadingState rows={8} />
      </div>
    );
  }
  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            {new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {usuario?.rol === 'dueno' && (
            <Button
              variant="outline"
              onClick={() => setResumenOpen(true)}
              className="skeu-card h-9 text-xs font-bold bg-background text-foreground"
            >
              📊 Resumen de hoy
            </Button>
          )}
          <div className={`px-4 py-2 rounded-full text-xs font-bold tracking-wide skeu-card ${cajaAbierta ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}>
            {cajaAbierta ? '● Caja Abierta' : '○ Caja Cerrada'}
          </div>
        </div>
      </div>

      <SuscripcionAviso />

      {!cajaAbierta && (
        <div className="skeu-card p-3 text-center text-sm text-muted-foreground">
          Caja cerrada — abre una caja para empezar a registrar ventas. Los datos históricos están en{' '}
          <Link href="/registros" className="text-primary hover:underline">Registros</Link>.
        </div>
      )}

      {/* Banners de pedido sugerido por proveedor */}
      {suggestedOrders.length > 0 && (
        <div className="space-y-3">
          {suggestedOrders.map(({ supplier, items }) => {
            const isExpanded = !!expandedSuppliers[supplier];
            return (
              <div
                key={supplier}
                className="skeu-panel border-amber-500/30 bg-amber-500/5 dark:bg-amber-500/10 p-4"
              >
                <div
                  onClick={() =>
                    setExpandedSuppliers((prev) => ({
                      ...prev,
                      [supplier]: !prev[supplier],
                    }))
                  }
                  className="flex items-center justify-between cursor-pointer select-none"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">📦</span>
                    <p className="text-sm font-bold text-amber-700 dark:text-amber-400">
                      Pedido sugerido a {supplier}: {items.length} productos con stock bajo
                    </p>
                  </div>
                  <span className="text-xs text-amber-700 dark:text-amber-400 font-semibold hover:underline">
                    {isExpanded ? 'Ocultar' : 'Ver productos'}
                  </span>
                </div>
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-amber-500/20 divide-y divide-amber-500/10">
                    {items.map((item) => (
                      <div key={item.id} className="flex justify-between items-center py-2 text-sm text-foreground">
                        <span className="truncate pr-4 font-medium">{item.nombre}</span>
                        <span className="text-xs tabular-nums text-muted-foreground font-semibold shrink-0">
                          Stock: {item.stock_actual} / Mín: {item.stock_minimo}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard accent="blue" title="Ventas caja actual" value={formatMoney(totalVentas, sym)} icon={DollarSign} trend={`${numTickets} tickets`} isLoading={isLoading} />
        <StatCard accent="amber" title="Costo de venta" value={formatMoney(costoVentas, sym)} icon={ShoppingBag} trend="Mercancía vendida" isLoading={isLoading} />
        <StatCard accent="green" title="Utilidad bruta" value={formatMoney(utilidadBruta, sym)} icon={TrendingUp} trend={`Margen ${formatPercent(margenPromedio)}`} isLoading={isLoading} />
        <StatCard accent="purple" title="Utilidad neta" value={formatMoney(utilidadNeta, sym)} icon={Wallet} trend="Bruta − Gastos op." isLoading={isLoading} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard accent="green" title="Efectivo" value={formatMoney(totalEfectivo, sym)} icon={Banknote} isLoading={isLoading} />
        <StatCard accent="blue" title="Tarjeta" value={formatMoney(totalTarjeta, sym)} icon={CreditCard} isLoading={isLoading} />
        <StatCard accent="cyan" title="Transferencia" value={formatMoney(totalTransferencia, sym)} icon={ArrowRightLeft} isLoading={isLoading} />
        <StatCard accent="red" title="Gastos operativos" value={formatMoney(totalGastos, sym)} icon={TrendingDown} isLoading={isLoading} />
      </div>

      {/* Más vendidos esta semana */}
      <div className="skeu-panel p-5">
        <h3 className="font-semibold text-sm text-foreground mb-4">Más vendidos esta semana</h3>
        {topProductosLoading ? (
          <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
            <span className="inline-block h-4 w-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin mr-2" />
            Cargando más vendidos...
          </div>
        ) : topProductos && topProductos.length > 0 ? (
          <div className="divide-y divide-border">
            {topProductos.map((item, idx) => (
              <div key={item.producto_id || idx} className="py-2.5 flex justify-between items-center text-sm first:pt-0 last:pb-0">
                <span className="font-medium text-foreground truncate">{item.producto_nombre}</span>
                <div className="flex gap-6 text-xs text-right ml-4">
                  <div>
                    <p className="text-muted-foreground">Vendidos</p>
                    <p className="font-bold tabular-nums text-foreground">{item.total_vendido}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Ingresos</p>
                    <p className="font-bold tabular-nums text-foreground">{formatMoney(item.total_ingresos, sym)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm py-4 text-center">Sin ventas esta semana</p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="skeu-panel p-5 lg:col-span-3">
          <h3 className="font-semibold text-sm text-foreground mb-4">Análisis financiero — caja actual</h3>
          {totalVentas > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={analisisData} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(220,10%,46%)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'hsl(220,10%,46%)' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${sym}${v}`} />
                <Tooltip content={<ChartTooltip sym={sym} />} cursor={{ fill: 'hsl(var(--muted)/0.5)' }} />
                <Bar dataKey="valor" radius={[6, 6, 0, 0]}>
                  {analisisData.map((_, i) => <Cell key={i} fill={barColors[i]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
              {cajaAbierta ? 'Sin ventas en esta caja todavía' : 'Caja cerrada — sin datos'}
            </div>
          )}
        </div>

        <div className="skeu-panel p-5 lg:col-span-2">
          <h3 className="font-semibold text-sm text-foreground mb-4">Métodos de pago</h3>
          {paymentData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={paymentData} cx="50%" cy="45%" innerRadius={45} outerRadius={70} dataKey="value" paddingAngle={3}>
                  {paymentData.map((_, i) => <Cell key={i} fill={PAYMENT_COLORS[i % PAYMENT_COLORS.length]} />)}
                </Pie>
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px', color: 'hsl(var(--foreground))' }} />
                <Tooltip content={<ChartTooltip sym={sym} />} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
              {cajaAbierta ? 'Sin cobros todavía' : 'Caja cerrada'}
            </div>
          )}
        </div>
      </div>

      {(cortesRecientes || []).filter((c) => c.estado === 'cerrada').length > 0 && (
        <div className="skeu-panel p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm text-foreground">Cortes de caja recientes</h3>
            <Link href="/registros" className="text-xs text-primary hover:underline">Ver todos →</Link>
          </div>
          <div className="divide-y divide-border">
            {(cortesRecientes || []).filter((c) => c.estado === 'cerrada').slice(0, 3).map((c) => (
              <div key={c.id} className="py-3 flex flex-wrap gap-3 items-center">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{c.cajero_nombre}</p>
                  <p className="text-xs text-muted-foreground">{c.fecha_cierre ? new Date(c.fecha_cierre).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' }) : ''}</p>
                </div>
                <div className="flex gap-4 text-xs">
                  <div className="text-center"><p className="text-muted-foreground">Ventas</p><p className="font-bold tabular-nums text-foreground">{formatMoney(c.total_ventas, sym)}</p></div>
                  <div className="text-center"><p className="text-muted-foreground">Ut. Neta</p><p className="font-bold tabular-nums text-foreground">{formatMoney(c.utilidad_neta_estimada, sym)}</p></div>
                  <div className="text-center"><p className="text-muted-foreground">Diferencia</p><p className={`font-bold tabular-nums ${(c.diferencia || 0) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>{formatMoney(c.diferencia, sym)}</p></div>
                </div>
                <Link href="/registros">
                  <button className="text-xs text-primary flex items-center gap-1 hover:underline">
                    <FileText className="h-3 w-3" /> Ver PDF
                  </button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="skeu-panel p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-7 w-7 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            </div>
            <h3 className="font-semibold text-sm text-foreground">Stock Bajo ({bajoStock.length})</h3>
          </div>
          {bajoStock.length > 0 ? (
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {bajoStock.slice(0, 10).map((p) => (
                <div key={p.id} className="flex justify-between items-center text-sm py-1.5 border-b border-border last:border-0">
                  <span className="text-foreground truncate">{p.nombre}</span>
                  <span className="text-amber-600 dark:text-amber-400 font-semibold ml-2 tabular-nums">{p.stock_actual} / {p.stock_minimo}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm py-4 text-center">✓ Sin alertas de stock bajo</p>
          )}
        </div>

        <div className="skeu-panel p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-7 w-7 rounded-lg bg-red-500/10 flex items-center justify-center">
              <Package className="h-4 w-4 text-red-500" />
            </div>
            <h3 className="font-semibold text-sm text-foreground">Agotados ({agotados.length})</h3>
          </div>
          {agotados.length > 0 ? (
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {agotados.slice(0, 10).map((p) => (
                <div key={p.id} className="flex justify-between items-center text-sm py-1.5 border-b border-border last:border-0">
                  <span className="text-foreground truncate">{p.nombre}</span>
                  <span className="text-red-500 font-semibold ml-2">Agotado</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm py-4 text-center">✓ Sin productos agotados</p>
          )}
        </div>
      </div>

      <Dialog open={resumenOpen} onOpenChange={setResumenOpen}>
        <DialogContent className="sm:max-w-md skeu-panel">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-foreground">
              📊 Resumen Financiero de Hoy
            </DialogTitle>
          </DialogHeader>
          {resumenLoading ? (
            <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
              <span className="inline-block h-4 w-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin mr-2" />
              Cargando resumen...
            </div>
          ) : resumenHoy ? (
            <div className="space-y-4 py-2">
              <p className="text-xs text-muted-foreground mb-4">
                Vista rápida acumulada del día actual ({new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}). No es un corte de caja.
              </p>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="skeu-card p-3">
                  <span className="text-xs text-muted-foreground block">Total Vendido</span>
                  <span className="text-lg font-bold text-blue-600 dark:text-blue-400 tabular-nums">
                    {formatMoney(resumenHoy.total_ventas, sym)}
                  </span>
                </div>
                <div className="skeu-card p-3">
                  <span className="text-xs text-muted-foreground block">Tickets Emitidos</span>
                  <span className="text-lg font-bold text-foreground tabular-nums">
                    {resumenHoy.num_tickets}
                  </span>
                </div>
                <div className="skeu-card p-3 col-span-2">
                  <span className="text-xs text-muted-foreground block">Utilidad Bruta</span>
                  <span className="text-lg font-bold text-green-600 dark:text-green-400 tabular-nums">
                    {formatMoney(resumenHoy.utilidad_bruta, sym)}
                  </span>
                  <span className="text-[10px] text-muted-foreground block">
                    Costo total mercancía: {formatMoney(resumenHoy.costo_total, sym)}
                  </span>
                </div>
              </div>

              <div className="skeu-card p-4 space-y-2">
                <h4 className="text-xs font-bold text-foreground border-b border-border pb-1">
                  Desglose por método de pago
                </h4>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <Banknote className="h-3.5 w-3.5 text-green-500" /> Efectivo
                    </span>
                    <span className="font-semibold tabular-nums text-foreground">
                      {formatMoney(resumenHoy.total_efectivo, sym)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <CreditCard className="h-3.5 w-3.5 text-blue-500" /> Tarjeta
                    </span>
                    <span className="font-semibold tabular-nums text-foreground">
                      {formatMoney(resumenHoy.total_tarjeta, sym)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <ArrowRightLeft className="h-3.5 w-3.5 text-purple-500" /> Transferencia
                    </span>
                    <span className="font-semibold tabular-nums text-foreground">
                      {formatMoney(resumenHoy.total_transferencia, sym)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm text-center py-4">No se pudo cargar el resumen.</p>
          )}
          <DialogFooter className="sm:justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setResumenOpen(false)}
              className="skeu-card text-xs font-bold"
            >
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

