'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth/AuthContext';
import { useCajaAbierta } from '@/hooks/useCajaAbierta';
import { useConfig } from '@/hooks/useConfig';
import { getVentas } from '@/lib/db/ventas';
import { getGastos } from '@/lib/db/egresos';
import { getCortes } from '@/lib/db/caja';
import { formatMoney } from '@/utils/currency';
import AbrirCajaDialog from '@/components/caja/AbrirCajaDialog';
import CierreCajaDialog from '@/components/caja/CierreCajaDialog';
import TicketViewerDialog from '@/components/caja/TicketViewerDialog';
import CortePDF from '@/components/registros/CortePDF';
import { Button } from '@/components/ui/button';
import { DoorOpen, DoorClosed, Landmark, TrendingUp, Wallet, Banknote, CreditCard, ArrowRightLeft, Receipt, FileText, Eye } from 'lucide-react';
import { useGatedAction } from '@/hooks/useGatedAction';

export default function CajaPage() {
  const { negocioId } = useAuth();
  const { config } = useConfig();
  const { cajaAbierta, isLoading, refetch } = useCajaAbierta();
  const queryClient = useQueryClient();
  const sym = config?.simbolo_moneda || '$';
  const gated = useGatedAction();

  const [abrirOpen, setAbrirOpen] = useState(false);
  const [cierreOpen, setCierreOpen] = useState(false);
  const [cortePDFData, setCortePDFData] = useState(null);
  const [autoDownloadPDF, setAutoDownloadPDF] = useState(false);
  const [ticketVenta, setTicketVenta] = useState(null);

  const cajaId = cajaAbierta?.id || null;

  const { data: ventas = [] } = useQuery({
    queryKey: ['ventas-caja', negocioId, cajaId],
    queryFn: async () => {
      const all = await getVentas(negocioId, { corteId: cajaId });
      return all.filter((v) => v.estado === 'pagada');
    },
    enabled: !!negocioId && !!cajaId,
    staleTime: 0,
    refetchInterval: () => (typeof document !== 'undefined' && document.hidden ? false : 2000),
    refetchOnWindowFocus: true,
    placeholderData: (p) => p,
  });

  const { data: gastos = [] } = useQuery({
    queryKey: ['gastos-caja', negocioId, cajaId],
    queryFn: () => getGastos(negocioId, { corteId: cajaId }),
    enabled: !!negocioId && !!cajaId,
    staleTime: 0,
    refetchInterval: () => (typeof document !== 'undefined' && document.hidden ? false : 2000),
    placeholderData: (p) => p,
  });

  const { data: cortes = [] } = useQuery({
    queryKey: ['caja-cortes', negocioId],
    queryFn: () => getCortes(negocioId, 5),
    enabled: !!negocioId,
    staleTime: 0,
    refetchInterval: () => (typeof document !== 'undefined' && document.hidden ? false : 3000),
    refetchOnWindowFocus: true,
    placeholderData: (p) => p,
  });

  const totalVentas = ventas.reduce((s, v) => s + (v.total || 0), 0);
  const totalEfectivo = ventas.reduce((s, v) => s + (v.monto_efectivo || 0), 0);
  const totalTarjeta = ventas.reduce((s, v) => s + (v.monto_tarjeta || 0), 0);
  const totalTransferencia = ventas.reduce((s, v) => s + (v.monto_transferencia || 0), 0);
  const costoVentas = ventas.reduce((s, v) => s + (v.costo_total_snapshot || 0), 0);
  const utilidadBruta = totalVentas - costoVentas;
  const totalGastos = gastos.reduce((s, g) => s + (g.monto || 0), 0);
  const utilidadNeta = utilidadBruta - totalGastos;
  const gastosEfectivo = gastos.filter((g) => !g.metodo_pago || g.metodo_pago === 'efectivo').reduce((s, g) => s + (g.monto || 0), 0);
  const efectivoEsperado = (cajaAbierta?.fondo_inicial || 0) + totalEfectivo - gastosEfectivo;

  const invalidateAll = () => {
    ['caja-abierta', 'caja-cortes', 'ventas-caja', 'gastos-caja', 'dashboard-cortes', 'reportes-generados', 'productos-dashboard'].forEach((k) =>
      queryClient.invalidateQueries({ queryKey: [k] }),
    );
  };

  const handleAbrirSuccess = () => { refetch(); invalidateAll(); setAbrirOpen(false); };
  const handleCierreSuccess = (corteCerrado) => {
    refetch();
    invalidateAll();
    setCierreOpen(false);
    if (corteCerrado) {
      setAutoDownloadPDF(true);
      setCortePDFData(corteCerrado);
    }
  };

  const statRow = (label, value, icon, color) => (
    <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
      <div className="flex items-center gap-3">
        <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${color}`}>{icon}</div>
        <span className="text-sm font-medium text-foreground">{label}</span>
      </div>
      <span className="text-sm font-bold text-foreground tabular-nums">{formatMoney(value, sym)}</span>
    </div>
  );

  return (
    <div className="p-3 md:p-6 space-y-4 md:space-y-6 max-w-2xl mx-auto pb-24 lg:pb-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Landmark className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Caja</h1>
          <p className="text-xs text-muted-foreground">{new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>
      </div>

      <div className="skeu-panel p-5" style={{ borderColor: cajaAbierta ? 'rgba(34,197,94,0.3)' : 'rgba(245,158,11,0.3)' }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wide">Estado</p>
            <p className={`text-xl font-black mt-0.5 ${cajaAbierta ? 'text-green-500' : 'text-amber-500'}`}>{cajaAbierta ? '● Caja Abierta' : '○ Caja Cerrada'}</p>
            {cajaAbierta && (
              <>
                <p className="text-xs text-muted-foreground mt-1">Cajero: <strong>{cajaAbierta.cajero_nombre}</strong></p>
                <p className="text-xs text-muted-foreground">Fondo inicial: <strong>{formatMoney(cajaAbierta.fondo_inicial, sym)}</strong></p>
                {cajaAbierta.fecha_apertura && (
                  <p className="text-xs text-muted-foreground">Abierta: {new Date(cajaAbierta.fecha_apertura).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</p>
                )}
              </>
            )}
          </div>
          <div className="flex flex-col gap-2">
            {cajaAbierta ? (
              <Button className="skeu-btn-danger" onClick={gated(() => setCierreOpen(true))}>
                <DoorClosed className="h-4 w-4 mr-1" /> Cerrar Caja
              </Button>
            ) : (
              <Button className="skeu-btn-primary" onClick={gated(() => setAbrirOpen(true))}>
                <DoorOpen className="h-4 w-4 mr-1" /> Abrir Caja
              </Button>
            )}
          </div>
        </div>

        {cajaAbierta && (
          <div className="pt-3 border-t border-border">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Efectivo esperado en caja:</span>
              <span className="font-bold text-foreground tabular-nums">{formatMoney(efectivoEsperado, sym)}</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Fondo + Ventas efectivo − Gastos en efectivo</p>
          </div>
        )}
      </div>

      {cajaAbierta && (
        <div className="skeu-panel p-5">
          <h2 className="font-bold text-foreground mb-3 text-sm uppercase tracking-wide">Resumen de caja actual</h2>
          {statRow('Ventas totales', totalVentas, <TrendingUp className="h-4 w-4 text-blue-500" />, 'bg-blue-500/10')}
          {statRow('Efectivo', totalEfectivo, <Banknote className="h-4 w-4 text-green-500" />, 'bg-green-500/10')}
          {statRow('Tarjeta', totalTarjeta, <CreditCard className="h-4 w-4 text-blue-400" />, 'bg-blue-400/10')}
          {statRow('Transferencia', totalTransferencia, <ArrowRightLeft className="h-4 w-4 text-purple-500" />, 'bg-purple-500/10')}
          {statRow('Gastos operativos', totalGastos, <Receipt className="h-4 w-4 text-red-500" />, 'bg-red-500/10')}
          {statRow('Utilidad bruta', utilidadBruta, <TrendingUp className="h-4 w-4 text-green-600" />, 'bg-green-600/10')}
          {statRow('Utilidad neta', utilidadNeta, <Wallet className="h-4 w-4 text-purple-600" />, 'bg-purple-600/10')}
        </div>
      )}

      {cajaAbierta && (
        <div className="skeu-panel p-4 md:p-5">
          <h2 className="font-bold text-foreground mb-3 text-sm uppercase tracking-wide">Ventas de caja ({ventas.length})</h2>
          {ventas.length === 0 ? (
            <p className="text-sm text-muted-foreground italic py-3 text-center">{isLoading ? 'Cargando…' : 'Aún no hay ventas en este turno.'}</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {ventas.map((v) => (
                <div key={v.id} className="skeu-card p-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs text-muted-foreground">{v.folio}</span>
                      <span className="text-xs text-muted-foreground">·</span>
                      <span className="text-xs text-muted-foreground capitalize">{v.metodo_pago}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {v.fecha ? new Date(v.fecha).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : ''}
                      {' · '}{v.cajero_nombre || 'Cajero'}
                    </p>
                  </div>
                  <p className="font-bold text-foreground tabular-nums text-sm">{formatMoney(v.total, sym)}</p>
                  <Button size="sm" variant="outline" className="skeu-btn-ghost h-9" onClick={() => setTicketVenta(v)}>
                    <Eye className="h-3.5 w-3.5 mr-1" /> Ticket
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {cortes.filter((c) => c.estado === 'cerrada').length > 0 && (
        <div className="skeu-panel p-5">
          <h2 className="font-bold text-foreground mb-3 text-sm uppercase tracking-wide">Últimos cortes</h2>
          <div className="space-y-3">
            {cortes.filter((c) => c.estado === 'cerrada').slice(0, 3).map((c) => (
              <div key={c.id} className="skeu-card p-3">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-semibold text-foreground text-sm">{c.cajero_nombre}</p>
                    <p className="text-xs text-muted-foreground">{c.fecha_cierre ? new Date(c.fecha_cierre).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' }) : ''}</p>
                  </div>
                  <button onClick={() => { setAutoDownloadPDF(false); setCortePDFData(c); }} className="text-xs text-primary flex items-center gap-1 hover:underline">
                    <FileText className="h-3.5 w-3.5" /> PDF
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="text-center"><p className="text-muted-foreground">Ventas</p><p className="font-bold text-foreground tabular-nums">{formatMoney(c.total_ventas, sym)}</p></div>
                  <div className="text-center"><p className="text-muted-foreground">Diferencia</p><p className={`font-bold tabular-nums ${(c.diferencia || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>{formatMoney(c.diferencia, sym)}</p></div>
                  <div className="text-center"><p className="text-muted-foreground">Ut. Neta</p><p className="font-bold text-foreground tabular-nums">{formatMoney(c.utilidad_neta_estimada, sym)}</p></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {cortePDFData && (
        <CortePDF corte={cortePDFData} config={config} sym={sym} autoDownload={autoDownloadPDF} onClose={() => { setCortePDFData(null); setAutoDownloadPDF(false); }} />
      )}
      {ticketVenta && <TicketViewerDialog venta={ticketVenta} config={config} onClose={() => setTicketVenta(null)} />}
      <AbrirCajaDialog open={abrirOpen} onClose={() => setAbrirOpen(false)} onSuccess={handleAbrirSuccess} />
      <CierreCajaDialog open={cierreOpen} onClose={() => setCierreOpen(false)} onSuccess={handleCierreSuccess} cajaAbierta={cajaAbierta} ventas={ventas} gastos={gastos} />
    </div>
  );
}
