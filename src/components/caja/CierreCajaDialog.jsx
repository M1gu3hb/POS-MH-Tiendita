'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/lib/auth/AuthContext';
import { cerrarCaja } from '@/lib/db/caja';
import { createReporte } from '@/lib/db/reportes';
import { formatMoney } from '@/utils/currency';
import { toast } from 'sonner';
import { ChevronRight, ChevronLeft } from 'lucide-react';

export default function CierreCajaDialog({ open, onClose, onSuccess, cajaAbierta, ventas = [], gastos = [] }) {
  const { negocioId } = useAuth();
  const [paso, setPaso] = useState(1);
  const [efectivoContado, setEfectivoContado] = useState('');
  const [efectivoDejar, setEfectivoDejar] = useState('');
  const [notas, setNotas] = useState('');
  const [loading, setLoading] = useState(false);

  const totalVentas = ventas.reduce((s, v) => s + (v.total || 0), 0);
  const totalEfectivo = ventas.reduce((s, v) => s + (v.monto_efectivo || 0), 0);
  const totalTarjeta = ventas.reduce((s, v) => s + (v.monto_tarjeta || 0), 0);
  const totalTransferencia = ventas.reduce((s, v) => s + (v.monto_transferencia || 0), 0);
  const totalGastos = gastos.reduce((s, g) => s + (g.monto || 0), 0);
  const gastosEfectivo = gastos.filter((g) => !g.metodo_pago || g.metodo_pago === 'efectivo').reduce((s, g) => s + (g.monto || 0), 0);
  const costoVentas = ventas.reduce((s, v) => s + (v.costo_total_snapshot || 0), 0);
  const utilidadBruta = totalVentas - costoVentas;
  const utilidadNeta = utilidadBruta - totalGastos;
  const fondo = cajaAbierta?.fondo_inicial || 0;
  const efectivoEsperado = fondo + totalEfectivo - gastosEfectivo;
  const contado = parseFloat(efectivoContado) || 0;
  const dejar = parseFloat(efectivoDejar) || 0;
  const diferencia = contado - efectivoEsperado;
  const retirado = contado - dejar;

  const handleCerrar = async () => {
    setLoading(true);
    try {
      const fechaCierre = new Date().toISOString();
      const corteCerrado = await cerrarCaja(cajaAbierta.id, {
        fecha_cierre: fechaCierre,
        efectivo_esperado: efectivoEsperado,
        efectivo_contado: contado,
        diferencia,
        efectivo_dejado_en_caja: dejar,
        efectivo_retirado: retirado,
        total_ventas: totalVentas,
        total_efectivo: totalEfectivo,
        total_tarjeta: totalTarjeta,
        total_transferencia: totalTransferencia,
        total_gastos: totalGastos,
        utilidad_bruta: utilidadBruta,
        utilidad_neta_estimada: utilidadNeta,
        numero_ventas: ventas.length,
        notas,
      });

      // Snapshot como JSONB nativo (no string).
      const snapshot = {
        fondo_inicial: fondo,
        efectivo_esperado: efectivoEsperado,
        efectivo_contado: contado,
        diferencia,
        efectivo_dejado_en_caja: dejar,
        efectivo_retirado: retirado,
        total_efectivo: totalEfectivo,
        total_tarjeta: totalTarjeta,
        total_transferencia: totalTransferencia,
        numero_ventas: ventas.length,
        ventas: ventas.map((v) => ({ id: v.id, folio: v.folio, fecha: v.fecha, total: v.total, metodo_pago: v.metodo_pago, estado: v.estado })),
        gastos: gastos.map((g) => ({ id: g.id, fecha: g.fecha, concepto: g.concepto, categoria: g.categoria, monto: g.monto })),
        cajero_nombre: cajaAbierta?.cajero_nombre,
        notas,
      };
      const fechaApertura = cajaAbierta?.fecha_apertura;
      try {
        await createReporte({
          negocio_id: negocioId,
          tipo: 'corte_caja',
          titulo: 'Corte de caja',
          periodo_inicio: fechaApertura ? fechaApertura.split('T')[0] : fechaCierre.split('T')[0],
          periodo_fin: fechaCierre.split('T')[0],
          usuario_nombre: cajaAbierta?.cajero_nombre || 'Cajero',
          referencia_tipo: 'CorteCaja',
          referencia_id: cajaAbierta.id,
          estado: 'generado',
          total_ventas: totalVentas,
          costo_venta: costoVentas,
          utilidad_bruta: utilidadBruta,
          gastos_operativos: totalGastos,
          compras_mercancia: 0,
          utilidad_neta: utilidadNeta,
          datos_snapshot: snapshot,
        });
        toast.success('Caja cerrada correctamente');
      } catch {
        toast.warning('Caja cerrada, pero no se pudo guardar el reporte. Revise Registros.');
      }

      setPaso(1);
      setEfectivoContado('');
      setEfectivoDejar('');
      setNotas('');
      onSuccess(corteCerrado);
    } catch {
      toast.error('Error al cerrar caja');
    } finally {
      setLoading(false);
    }
  };

  const Row = ({ label, value, bold, color }) => (
    <div className="flex justify-between py-2 border-b border-border last:border-0 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={`tabular-nums ${bold ? 'font-bold' : ''} ${color || 'text-foreground'}`}>{value}</span>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={() => { onClose(); setPaso(1); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cierre de Caja — Paso {paso} de 4</DialogTitle>
          <div className="flex gap-1 mt-2">
            {[1, 2, 3, 4].map((n) => <div key={n} className={`h-1.5 flex-1 rounded-full transition-colors ${n <= paso ? 'bg-primary' : 'bg-border'}`} />)}
          </div>
        </DialogHeader>

        {paso === 1 && (
          <div className="space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Resumen del turno</p>
            <Row label="Fondo inicial registrado" value={formatMoney(fondo)} />
            <Row label="Ventas totales" value={formatMoney(totalVentas)} bold />
            <Row label="Ventas en efectivo" value={formatMoney(totalEfectivo)} />
            <Row label="Ventas con tarjeta" value={formatMoney(totalTarjeta)} />
            <Row label="Ventas por transferencia" value={formatMoney(totalTransferencia)} />
            <Row label="Costo de venta" value={formatMoney(costoVentas)} />
            <Row label="Utilidad bruta" value={formatMoney(utilidadBruta)} bold color="text-green-600 dark:text-green-400" />
            <Row label="Gastos operativos" value={formatMoney(totalGastos)} color="text-red-600 dark:text-red-400" />
            <Row label="Gastos pagados en efectivo" value={formatMoney(gastosEfectivo)} color="text-red-500" />
            <Row label="Utilidad neta estimada" value={formatMoney(utilidadNeta)} bold color={utilidadNeta >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'} />
            <div className="mt-3 p-3 rounded-xl bg-primary/10 border border-primary/20">
              <p className="text-xs text-primary font-semibold">Efectivo esperado en caja</p>
              <p className="text-2xl font-black text-primary tabular-nums">{formatMoney(efectivoEsperado)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Fondo + Ventas efectivo − Gastos en efectivo</p>
            </div>
          </div>
        )}

        {paso === 2 && (
          <div className="space-y-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Conteo de efectivo</p>
            <div className="p-3 rounded-xl bg-muted">
              <p className="text-xs text-muted-foreground">Efectivo esperado</p>
              <p className="text-xl font-bold text-foreground tabular-nums">{formatMoney(efectivoEsperado)}</p>
            </div>
            <div>
              <Label className="text-sm font-semibold">Efectivo contado físicamente en caja</Label>
              <Input type="number" placeholder="0.00" value={efectivoContado} onChange={(e) => setEfectivoContado(e.target.value)} className="h-14 text-2xl text-center font-black mt-2" autoFocus />
            </div>
            {efectivoContado && (
              <div className={`p-3 rounded-xl ${diferencia >= 0 ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'}`}>
                <p className="text-xs text-muted-foreground">Diferencia</p>
                <p className={`text-xl font-black tabular-nums ${diferencia >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {diferencia > 0 ? '+' : ''}{formatMoney(diferencia)}
                  <span className="text-sm font-normal ml-2">{diferencia > 0 ? '(sobrante)' : diferencia < 0 ? '(faltante)' : '(cuadra perfectamente)'}</span>
                </p>
              </div>
            )}
          </div>
        )}

        {paso === 3 && (
          <div className="space-y-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Dinero que se deja en caja</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-muted">
                <p className="text-xs text-muted-foreground">Efectivo contado</p>
                <p className="font-bold tabular-nums text-foreground">{formatMoney(contado)}</p>
              </div>
              <div className="p-3 rounded-xl bg-muted">
                <p className="text-xs text-muted-foreground">Diferencia</p>
                <p className={`font-bold tabular-nums ${diferencia >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>{diferencia >= 0 ? '+' : ''}{formatMoney(diferencia)}</p>
              </div>
            </div>
            <div>
              <Label className="text-sm font-semibold">Efectivo que se deja en caja (fondo siguiente turno)</Label>
              <Input type="number" placeholder="0.00" value={efectivoDejar} onChange={(e) => setEfectivoDejar(e.target.value)} className="h-14 text-2xl text-center font-black mt-2" autoFocus />
              <p className="text-[11px] text-muted-foreground mt-1">Solo registro operativo. No es gasto, no afecta ventas ni utilidad.</p>
            </div>
            {efectivoDejar !== '' && (
              <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                <p className="text-xs text-blue-700 dark:text-blue-300">Efectivo retirado físicamente</p>
                <p className="text-xl font-black text-blue-700 dark:text-blue-300 tabular-nums">{formatMoney(retirado)}</p>
              </div>
            )}
            <div>
              <Label>Notas u observaciones</Label>
              <Input value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Opcional..." className="mt-1" />
            </div>
          </div>
        )}

        {paso === 4 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Confirmación final</p>
            <Row label="Ventas totales" value={formatMoney(totalVentas)} bold />
            <Row label="Utilidad bruta" value={formatMoney(utilidadBruta)} color="text-green-600 dark:text-green-400" />
            <Row label="Gastos operativos" value={formatMoney(totalGastos)} color="text-red-500" />
            <Row label="Utilidad neta estimada" value={formatMoney(utilidadNeta)} bold color={utilidadNeta >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'} />
            <div className="border-t border-border my-2" />
            <Row label="Efectivo esperado" value={formatMoney(efectivoEsperado)} />
            <Row label="Efectivo contado" value={formatMoney(contado)} bold />
            <Row label="Diferencia" value={`${diferencia >= 0 ? '+' : ''}${formatMoney(diferencia)}`} color={diferencia >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'} />
            <Row label="Efectivo dejado en caja" value={formatMoney(dejar)} />
            <Row label="Efectivo retirado físicamente" value={formatMoney(retirado)} bold />
            {notas && <p className="text-xs text-muted-foreground pt-2">Nota: {notas}</p>}
          </div>
        )}

        <DialogFooter className="flex gap-2">
          {paso > 1 && (
            <Button variant="outline" onClick={() => setPaso((p) => p - 1)} disabled={loading}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Atrás
            </Button>
          )}
          <Button variant="outline" onClick={() => { onClose(); setPaso(1); }} disabled={loading}>Cancelar</Button>
          {paso < 4 ? (
            <Button className="bg-primary" onClick={() => setPaso((p) => p + 1)} disabled={paso === 2 && !efectivoContado}>
              Siguiente <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleCerrar} disabled={loading} className="skeu-btn-danger">{loading ? 'Cerrando...' : 'Confirmar Cierre'}</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
