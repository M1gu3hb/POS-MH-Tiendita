'use client';

import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth/AuthContext';
import { useConfig } from '@/hooks/useConfig';
import { getVentas, getDetalleVentasByNegocio } from '@/lib/db/ventas';
import { getGastos, getCompras } from '@/lib/db/egresos';
import { getCortes } from '@/lib/db/caja';
import { getMovimientos } from '@/lib/db/inventario';
import { getReportes, createReporte } from '@/lib/db/reportes';
import { formatMoney } from '@/utils/currency';
import { isDateInRange, getPeriodRange } from '@/utils/dateUtils';
import LoadingState from '@/components/common/LoadingState';
import InlineSyncIndicator from '@/components/common/InlineSyncIndicator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { BarChart2, FileText, TrendingUp, TrendingDown, DollarSign, ShoppingBag, Wallet, Banknote, CreditCard, ArrowRightLeft, Archive, Eye } from 'lucide-react';
import { toast } from 'sonner';
import ResumenFinancieroPDF from '@/components/registros/ResumenFinancieroPDF';
import CortePDF from '@/components/registros/CortePDF';

export default function RegistrosPage() {
  const { negocioId, usuario } = useAuth();
  const { config } = useConfig();
  const queryClient = useQueryClient();
  const sym = config?.simbolo_moneda || '$';
  const [periodo, setPeriodo] = useState('hoy');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [showPDF, setShowPDF] = useState(false);
  const [cortePDFData, setCortePDFData] = useState(null);
  const [reporteAbierto, setReporteAbierto] = useState(null);

  const enabled = !!negocioId;
  const { data: ventas = [], isLoading: ventasLoading, isFetching: ventasFetching } = useQuery({ queryKey: ['registros-ventas', negocioId], queryFn: () => getVentas(negocioId, { limit: 500 }), enabled, placeholderData: (p) => p });
  const { data: gastos = [] } = useQuery({ queryKey: ['registros-gastos', negocioId], queryFn: () => getGastos(negocioId, { limit: 500 }), enabled, placeholderData: (p) => p });
  const { data: compras = [] } = useQuery({ queryKey: ['compras', negocioId], queryFn: () => getCompras(negocioId, 500), enabled, placeholderData: (p) => p });
  const { data: cortes = [] } = useQuery({ queryKey: ['registros-cortes', negocioId], queryFn: () => getCortes(negocioId, 100), enabled, placeholderData: (p) => p });
  const { data: detallesVenta = [] } = useQuery({ queryKey: ['registros-detalles-venta', negocioId], queryFn: () => getDetalleVentasByNegocio(negocioId, 2000), enabled, placeholderData: (p) => p });
  const { data: movimientos = [] } = useQuery({ queryKey: ['registros-movimientos', negocioId], queryFn: () => getMovimientos(negocioId, { limit: 500 }), enabled, placeholderData: (p) => p });
  const { data: reportesGenerados = [] } = useQuery({ queryKey: ['reportes-generados', negocioId], queryFn: () => getReportes(negocioId, 200), enabled, placeholderData: (p) => p });

  const { start, end } = getPeriodRange(periodo, customStart, customEnd);
  const inRange = (dateStr) => isDateInRange(dateStr, start, end);

  const ventasFiltradas = useMemo(() => ventas.filter((v) => v.estado === 'pagada' && inRange(v.fecha)), [ventas, start, end]);
  const canceladasFiltradas = useMemo(() => ventas.filter((v) => v.estado === 'cancelada' && inRange(v.fecha)), [ventas, start, end]);
  const gastosFiltrados = useMemo(() => gastos.filter((g) => inRange(g.fecha)), [gastos, start, end]);
  const comprasFiltradas = useMemo(() => compras.filter((c) => inRange(c.fecha)), [compras, start, end]);
  const cortesFiltrados = useMemo(() => cortes.filter((c) => c.estado === 'cerrada' && inRange(c.fecha_apertura)), [cortes, start, end]);

  const totalVentas = ventasFiltradas.reduce((s, v) => s + (v.total || 0), 0);
  const costoVenta = ventasFiltradas.reduce((s, v) => s + (v.costo_total_snapshot || 0), 0);
  const utilidadBruta = totalVentas - costoVenta;
  const totalGastos = gastosFiltrados.reduce((s, g) => s + (g.monto || 0), 0);
  const totalCompras = comprasFiltradas.reduce((s, c) => s + (c.total || 0), 0);
  const utilidadNeta = utilidadBruta - totalGastos;
  const totalEfectivo = ventasFiltradas.reduce((s, v) => s + (v.monto_efectivo || 0), 0);
  const totalTarjeta = ventasFiltradas.reduce((s, v) => s + (v.monto_tarjeta || 0), 0);
  const totalTransferencia = ventasFiltradas.reduce((s, v) => s + (v.monto_transferencia || 0), 0);

  const ventaIds = new Set(ventasFiltradas.map((v) => v.id));
  const detallesPeriodo = detallesVenta.filter((d) => ventaIds.has(d.venta_id));
  const productosMap = {};
  detallesPeriodo.forEach((d) => {
    if (!productosMap[d.producto_id]) productosMap[d.producto_id] = { nombre: d.producto_nombre, cantidad: 0, importe: 0, costo: 0 };
    productosMap[d.producto_id].cantidad += d.cantidad || 0;
    productosMap[d.producto_id].importe += d.total || 0;
    productosMap[d.producto_id].costo += (d.costo_unitario_snapshot || 0) * (d.cantidad || 0);
  });
  const productosVendidos = Object.values(productosMap).sort((a, b) => b.importe - a.importe);

  const KpiCard = ({ label, value, icon: Icon, color, sub }) => (
    <div className="skeu-panel p-4">
      <div className="flex items-start justify-between mb-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</p>
        <div className={`h-7 w-7 rounded-lg flex items-center justify-center ${color}`}><Icon className="h-3.5 w-3.5" /></div>
      </div>
      <p className="text-xl font-black text-foreground tabular-nums">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );

  const periodLabel = () => {
    const labels = { hoy: 'Hoy', semana: 'Esta semana', '7dias': 'Últimos 7 días', '30dias': 'Últimos 30 días', mes: 'Este mes', 'año': 'Este año', personalizado: `${start} a ${end}` };
    return labels[periodo] || periodo;
  };

  const handleGenerarPDF = async () => {
    const hayDatos = ventasFiltradas.length > 0 || gastosFiltrados.length > 0 || comprasFiltradas.length > 0 || cortesFiltrados.length > 0;
    if (!hayDatos) {
      toast.warning('No hay datos en este periodo para generar reporte');
      return;
    }
    const snapshot = {
      periodo, periodo_label: periodLabel(), start, end,
      totalVentas, costoVenta, utilidadBruta, totalGastos, totalCompras, utilidadNeta,
      totalEfectivo, totalTarjeta, totalTransferencia, numVentas: ventasFiltradas.length,
      productosVendidos, gastosFiltrados, comprasFiltradas,
      cortesFiltrados: cortesFiltrados.map((c) => ({ id: c.id, cajero_nombre: c.cajero_nombre, fecha_apertura: c.fecha_apertura, fecha_cierre: c.fecha_cierre, total_ventas: c.total_ventas, diferencia: c.diferencia, utilidad_neta_estimada: c.utilidad_neta_estimada })),
    };
    try {
      await createReporte({
        negocio_id: negocioId,
        tipo: 'resumen_financiero',
        titulo: 'Reporte financiero interno',
        periodo_inicio: start,
        periodo_fin: end,
        usuario_nombre: usuario?.nombre_visible || 'Admin',
        referencia_tipo: 'periodo',
        estado: 'generado',
        total_ventas: totalVentas,
        costo_venta: costoVenta,
        utilidad_bruta: utilidadBruta,
        gastos_operativos: totalGastos,
        compras_mercancia: totalCompras,
        utilidad_neta: utilidadNeta,
        datos_snapshot: snapshot,
      });
      queryClient.invalidateQueries({ queryKey: ['reportes-generados'] });
      toast.success('Reporte guardado');
    } catch {
      toast.warning('PDF generado, pero no se pudo guardar en Registros');
    }
    setShowPDF(true);
  };

  const abrirReporteGuardado = (rep) => {
    if (!rep.datos_snapshot) {
      toast.error('Este reporte no tiene snapshot guardado');
      return;
    }
    setReporteAbierto({ ...rep, _snapshot: rep.datos_snapshot });
  };

  return (
    <div className="p-3 md:p-6 space-y-4 pb-24 lg:pb-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-foreground">Registros</h1>
          <InlineSyncIndicator active={ventasFetching && !ventasLoading} label="Sincronizando ventas…" />
        </div>
      </div>

      <Tabs defaultValue="resumen">
        <div className="overflow-x-auto -mx-3 md:mx-0 px-3 md:px-0 pb-1" style={{ scrollbarWidth: 'thin', WebkitOverflowScrolling: 'touch' }}>
          <TabsList className="inline-flex w-max gap-1 p-1 h-auto">
            <TabsTrigger value="resumen" className="whitespace-nowrap px-3 py-2 text-xs sm:text-sm"><BarChart2 className="h-3.5 w-3.5 mr-1.5" /><span className="hidden sm:inline">Resumen Financiero</span><span className="sm:hidden">Resumen</span></TabsTrigger>
            <TabsTrigger value="ventas" className="whitespace-nowrap px-3 py-2 text-xs sm:text-sm">Ventas</TabsTrigger>
            <TabsTrigger value="cortes" className="whitespace-nowrap px-3 py-2 text-xs sm:text-sm"><span className="hidden sm:inline">Cortes de Caja</span><span className="sm:hidden">Cortes</span></TabsTrigger>
            <TabsTrigger value="movimientos" className="whitespace-nowrap px-3 py-2 text-xs sm:text-sm"><span className="hidden sm:inline">Mov. Inventario</span><span className="sm:hidden">Mov. Inv.</span></TabsTrigger>
            <TabsTrigger value="reportes" className="whitespace-nowrap px-3 py-2 text-xs sm:text-sm"><Archive className="h-3.5 w-3.5 mr-1.5" /><span className="hidden sm:inline">Reportes generados</span><span className="sm:hidden">Reportes</span></TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="resumen" className="mt-4 space-y-4">
          <div className="skeu-panel p-4 space-y-3">
            <div className="flex flex-wrap gap-2">
              {['hoy', 'semana', '7dias', '30dias', 'mes', 'año', 'personalizado'].map((p) => (
                <button key={p} onClick={() => setPeriodo(p)} className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${periodo === p ? 'skeu-btn-primary text-white' : 'skeu-btn-ghost text-muted-foreground hover:text-foreground'}`}>
                  {p === 'hoy' ? 'Hoy' : p === 'semana' ? 'Esta semana' : p === '7dias' ? 'Últimos 7d' : p === '30dias' ? 'Últimos 30d' : p === 'mes' ? 'Este mes' : p === 'año' ? 'Este año' : 'Personalizado'}
                </button>
              ))}
            </div>
            {periodo === 'personalizado' && (
              <div className="flex gap-3 flex-wrap">
                <div><p className="text-xs font-semibold text-muted-foreground mb-1">Desde</p><Input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="w-40" /></div>
                <div><p className="text-xs font-semibold text-muted-foreground mb-1">Hasta</p><Input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="w-40" /></div>
              </div>
            )}
            <Button onClick={handleGenerarPDF} variant="outline" className="skeu-btn-ghost w-full">
              <FileText className="h-4 w-4 mr-1.5" /> Generar PDF del periodo
            </Button>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard label="Ingresos por ventas" value={formatMoney(totalVentas, sym)} icon={DollarSign} color="bg-blue-500/10 text-blue-500" sub={`${ventasFiltradas.length} ventas`} />
            <KpiCard label="Costo de venta" value={formatMoney(costoVenta, sym)} icon={ShoppingBag} color="bg-amber-500/10 text-amber-500" sub="Mercancía vendida" />
            <KpiCard label="Utilidad bruta" value={formatMoney(utilidadBruta, sym)} icon={TrendingUp} color="bg-green-500/10 text-green-500" sub={totalVentas > 0 ? `Margen ${((utilidadBruta / totalVentas) * 100).toFixed(1)}%` : ''} />
            <KpiCard label="Utilidad neta est." value={formatMoney(utilidadNeta, sym)} icon={Wallet} color="bg-purple-500/10 text-purple-500" sub="Bruta − Gastos op." />
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard label="Efectivo" value={formatMoney(totalEfectivo, sym)} icon={Banknote} color="bg-green-500/10 text-green-500" />
            <KpiCard label="Tarjeta" value={formatMoney(totalTarjeta, sym)} icon={CreditCard} color="bg-blue-400/10 text-blue-400" />
            <KpiCard label="Transferencia" value={formatMoney(totalTransferencia, sym)} icon={ArrowRightLeft} color="bg-purple-500/10 text-purple-500" />
            <KpiCard label="Gastos operativos" value={formatMoney(totalGastos, sym)} icon={TrendingDown} color="bg-red-500/10 text-red-500" sub={`${gastosFiltrados.length} registros`} />
          </div>

          <div className="skeu-panel p-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Compras de mercancía del periodo</p>
            <div className="flex items-center justify-between">
              <p className="text-2xl font-black text-foreground tabular-nums">{formatMoney(totalCompras, sym)}</p>
              <Badge variant="outline">{comprasFiltradas.length} compras</Badge>
            </div>
          </div>

          {canceladasFiltradas.length > 0 && (
            <div className="skeu-panel p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Cancelaciones / Devoluciones</p>
              <div className="flex items-center gap-4">
                <Badge variant="destructive">{canceladasFiltradas.length} canceladas</Badge>
                <span className="text-sm text-muted-foreground">Ventas canceladas en el periodo</span>
              </div>
            </div>
          )}

          {productosVendidos.length > 0 && (
            <div className="skeu-panel overflow-hidden">
              <div className="px-4 py-3 border-b border-border bg-muted/30"><p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Productos vendidos — {periodLabel()}</p></div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/20">
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Producto</th>
                    <th className="text-center px-3 py-2.5 font-medium text-muted-foreground">Cantidad</th>
                    <th className="text-right px-3 py-2.5 font-medium text-muted-foreground">Importe</th>
                    <th className="text-right px-4 py-2.5 font-medium text-muted-foreground hidden md:table-cell">Costo est.</th>
                    <th className="text-right px-4 py-2.5 font-medium text-muted-foreground hidden md:table-cell">Utilidad</th>
                  </tr>
                </thead>
                <tbody>
                  {productosVendidos.slice(0, 30).map((p, i) => (
                    <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/20">
                      <td className="px-4 py-2.5 text-foreground font-medium">{p.nombre}</td>
                      <td className="px-3 py-2.5 text-center text-foreground">{p.cantidad}</td>
                      <td className="px-3 py-2.5 text-right font-semibold text-foreground tabular-nums">{formatMoney(p.importe, sym)}</td>
                      <td className="px-4 py-2.5 text-right text-muted-foreground tabular-nums hidden md:table-cell">{formatMoney(p.costo, sym)}</td>
                      <td className="px-4 py-2.5 text-right hidden md:table-cell"><span className={`font-semibold tabular-nums ${p.importe - p.costo >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>{formatMoney(p.importe - p.costo, sym)}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="ventas" className="mt-4">
          {ventasLoading && ventas.length === 0 ? <LoadingState rows={4} type="list" /> : (
            <div className="skeu-panel overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Folio</th>
                    <th className="text-left px-3 py-3 font-medium text-muted-foreground">Fecha</th>
                    <th className="text-center px-3 py-3 font-medium text-muted-foreground">Estado</th>
                    <th className="text-center px-3 py-3 font-medium text-muted-foreground">Método</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {ventas.slice(0, 100).map((v) => (
                    <tr key={v.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3 font-mono text-xs text-foreground">{v.folio}</td>
                      <td className="px-3 py-3 text-muted-foreground text-xs">{v.fecha ? new Date(v.fecha).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' }) : '-'}</td>
                      <td className="px-3 py-3 text-center"><Badge variant={v.estado === 'pagada' ? 'default' : v.estado === 'cancelada' ? 'destructive' : 'secondary'} className="text-xs">{v.estado}</Badge></td>
                      <td className="px-3 py-3 text-center capitalize text-muted-foreground text-xs">{v.metodo_pago}</td>
                      <td className="px-4 py-3 text-right font-semibold text-foreground tabular-nums">{formatMoney(v.total, sym)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="cortes" className="mt-4 space-y-3">
          {cortes.filter((c) => c.estado === 'cerrada').length === 0 ? (
            <div className="skeu-panel p-8 text-center"><FileText className="h-10 w-10 mx-auto text-muted-foreground mb-2" /><p className="text-sm text-muted-foreground">Aún no hay cortes cerrados.</p></div>
          ) : (
            cortes.filter((c) => c.estado === 'cerrada').map((c) => (
              <div key={c.id} className="skeu-panel p-3 md:p-4">
                <div className="flex items-center justify-between mb-3 gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-foreground text-sm truncate">{c.cajero_nombre}</p>
                    <p className="text-xs text-muted-foreground">{c.fecha_apertura ? new Date(c.fecha_apertura).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' }) : ''}{c.fecha_cierre ? ` → ${new Date(c.fecha_cierre).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}` : ''}</p>
                  </div>
                  <Button variant="outline" size="sm" className="skeu-btn-ghost flex-shrink-0 h-9" onClick={() => setCortePDFData(c)}><FileText className="h-3.5 w-3.5 mr-1" /> PDF</Button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="bg-muted p-2 rounded-lg"><span className="text-muted-foreground text-[10px]">Ventas</span><p className="font-bold text-foreground tabular-nums">{formatMoney(c.total_ventas, sym)}</p></div>
                  <div className="bg-muted p-2 rounded-lg"><span className="text-muted-foreground text-[10px]">Efectivo</span><p className="font-bold text-foreground tabular-nums">{formatMoney(c.efectivo_contado, sym)}</p></div>
                  <div className="bg-muted p-2 rounded-lg"><span className="text-muted-foreground text-[10px]">Diferencia</span><p className={`font-bold tabular-nums ${(c.diferencia || 0) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>{formatMoney(c.diferencia, sym)}</p></div>
                  <div className="bg-muted p-2 rounded-lg"><span className="text-muted-foreground text-[10px]">Ut. Neta</span><p className="font-bold text-foreground tabular-nums">{formatMoney(c.utilidad_neta_estimada, sym)}</p></div>
                </div>
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="reportes" className="mt-4">
          {reportesGenerados.length === 0 ? (
            <div className="skeu-panel p-8 text-center"><Archive className="h-10 w-10 mx-auto text-muted-foreground mb-2" /><p className="text-sm text-muted-foreground">Aún no hay reportes guardados.</p></div>
          ) : (
            <div className="skeu-panel overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Fecha</th>
                    <th className="text-left px-3 py-3 font-medium text-muted-foreground">Tipo</th>
                    <th className="text-left px-3 py-3 font-medium text-muted-foreground">Periodo</th>
                    <th className="text-right px-3 py-3 font-medium text-muted-foreground">Ventas</th>
                    <th className="text-right px-3 py-3 font-medium text-muted-foreground">Ut. Neta</th>
                    <th className="text-center px-3 py-3 font-medium text-muted-foreground">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {reportesGenerados.map((r) => (
                    <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3 text-muted-foreground text-xs">{r.created_at ? new Date(r.created_at).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' }) : '-'}</td>
                      <td className="px-3 py-3"><Badge variant="outline" className="text-xs">{r.tipo === 'corte_caja' ? 'Corte' : r.tipo === 'resumen_financiero' ? 'Resumen' : r.tipo}</Badge></td>
                      <td className="px-3 py-3 text-xs text-foreground">{r.periodo_inicio || '-'} → {r.periodo_fin || '-'}</td>
                      <td className="px-3 py-3 text-right font-semibold text-foreground tabular-nums">{formatMoney(r.total_ventas || 0, sym)}</td>
                      <td className="px-3 py-3 text-right"><span className={`font-semibold tabular-nums ${(r.utilidad_neta || 0) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>{formatMoney(r.utilidad_neta || 0, sym)}</span></td>
                      <td className="px-3 py-3 text-center"><Button size="sm" variant="outline" className="skeu-btn-ghost" onClick={() => abrirReporteGuardado(r)}><Eye className="h-3.5 w-3.5 mr-1" /> Ver PDF</Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="movimientos" className="mt-4">
          <div className="skeu-panel overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Producto</th>
                  <th className="text-center px-3 py-3 font-medium text-muted-foreground">Tipo</th>
                  <th className="text-center px-3 py-3 font-medium text-muted-foreground">Cantidad</th>
                  <th className="text-center px-3 py-3 font-medium text-muted-foreground">Stock</th>
                  <th className="text-left px-3 py-3 font-medium text-muted-foreground">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {movimientos.slice(0, 100).map((m) => (
                  <tr key={m.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3 text-foreground">{m.producto_nombre}</td>
                    <td className="px-3 py-3 text-center"><Badge variant="outline" className="text-xs">{m.tipo_movimiento?.replace(/_/g, ' ')}</Badge></td>
                    <td className="px-3 py-3 text-center font-medium text-foreground">{m.cantidad}</td>
                    <td className="px-3 py-3 text-center text-muted-foreground text-xs">{m.stock_anterior} → {m.stock_nuevo}</td>
                    <td className="px-3 py-3 text-muted-foreground text-xs">{m.fecha ? new Date(m.fecha).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' }) : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>

      {showPDF && (
        <ResumenFinancieroPDF
          config={config} periodo={periodLabel()} start={start} end={end}
          totalVentas={totalVentas} costoVenta={costoVenta} utilidadBruta={utilidadBruta}
          totalGastos={totalGastos} totalCompras={totalCompras} utilidadNeta={utilidadNeta}
          totalEfectivo={totalEfectivo} totalTarjeta={totalTarjeta} totalTransferencia={totalTransferencia}
          numVentas={ventasFiltradas.length} productosVendidos={productosVendidos}
          gastosFiltrados={gastosFiltrados} comprasFiltradas={comprasFiltradas} cortesFiltrados={cortesFiltrados}
          sym={sym} onClose={() => setShowPDF(false)}
        />
      )}

      {cortePDFData && <CortePDF corte={cortePDFData} config={config} sym={sym} onClose={() => setCortePDFData(null)} />}

      {reporteAbierto && reporteAbierto.tipo === 'resumen_financiero' && reporteAbierto._snapshot && (
        <ResumenFinancieroPDF
          config={config} periodo={reporteAbierto._snapshot.periodo_label || reporteAbierto.titulo}
          start={reporteAbierto.periodo_inicio} end={reporteAbierto.periodo_fin}
          totalVentas={reporteAbierto._snapshot.totalVentas || 0} costoVenta={reporteAbierto._snapshot.costoVenta || 0}
          utilidadBruta={reporteAbierto._snapshot.utilidadBruta || 0} totalGastos={reporteAbierto._snapshot.totalGastos || 0}
          totalCompras={reporteAbierto._snapshot.totalCompras || 0} utilidadNeta={reporteAbierto._snapshot.utilidadNeta || 0}
          totalEfectivo={reporteAbierto._snapshot.totalEfectivo || 0} totalTarjeta={reporteAbierto._snapshot.totalTarjeta || 0}
          totalTransferencia={reporteAbierto._snapshot.totalTransferencia || 0} numVentas={reporteAbierto._snapshot.numVentas || 0}
          productosVendidos={reporteAbierto._snapshot.productosVendidos || []} gastosFiltrados={reporteAbierto._snapshot.gastosFiltrados || []}
          comprasFiltradas={reporteAbierto._snapshot.comprasFiltradas || []} cortesFiltrados={reporteAbierto._snapshot.cortesFiltrados || []}
          sym={sym} onClose={() => setReporteAbierto(null)}
        />
      )}

      {reporteAbierto && reporteAbierto.tipo === 'corte_caja' && (
        <CortePDF
          corte={(() => {
            const corteVivo = cortes.find((c) => c.id === reporteAbierto.referencia_id);
            if (corteVivo) return corteVivo;
            const s = reporteAbierto._snapshot || {};
            return {
              cajero_nombre: s.cajero_nombre || reporteAbierto.usuario_nombre,
              fecha_apertura: reporteAbierto.periodo_inicio, fecha_cierre: reporteAbierto.created_at,
              fondo_inicial: s.fondo_inicial || 0, numero_ventas: s.numero_ventas || 0,
              total_ventas: reporteAbierto.total_ventas, total_efectivo: s.total_efectivo || 0,
              total_tarjeta: s.total_tarjeta || 0, total_transferencia: s.total_transferencia || 0,
              total_gastos: reporteAbierto.gastos_operativos, utilidad_bruta: reporteAbierto.utilidad_bruta,
              utilidad_neta_estimada: reporteAbierto.utilidad_neta, efectivo_esperado: s.efectivo_esperado || 0,
              efectivo_contado: s.efectivo_contado || 0, diferencia: s.diferencia || 0,
              efectivo_dejado_en_caja: s.efectivo_dejado_en_caja || 0, efectivo_retirado: s.efectivo_retirado || 0, notas: s.notas || '',
            };
          })()}
          config={config} sym={sym} onClose={() => setReporteAbierto(null)}
        />
      )}
    </div>
  );
}
