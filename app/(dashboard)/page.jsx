'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/AuthContext';
import { useCajaAbierta } from '@/hooks/useCajaAbierta';
import { useConfig } from '@/hooks/useConfig';
import { getVentas, getTopProductos } from '@/lib/db/ventas';
import { getGastos } from '@/lib/db/egresos';
import { getCortes } from '@/lib/db/caja';
import { getProductos } from '@/lib/db/productos';
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

const PAYMENT_COLORS = ['#22c55e', '#3b82f6', '#a855f7'];

export default function DashboardPage() {
  const { negocioId } = useAuth();
  const { config } = useConfig();
  const { cajaAbierta, isLoading: cajaLoading } = useCajaAbierta();

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
        <div className={`px-4 py-2 rounded-full text-xs font-bold tracking-wide skeu-card ${cajaAbierta ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}>
          {cajaAbierta ? '● Caja Abierta' : '○ Caja Cerrada'}
        </div>
      </div>

      <SuscripcionAviso />

      {!cajaAbierta && (
        <div className="skeu-card p-3 text-center text-sm text-muted-foreground">
          Caja cerrada — abre una caja para empezar a registrar ventas. Los datos históricos están en{' '}
          <Link href="/registros" className="text-primary hover:underline">Registros</Link>.
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
    </div>
  );
}
