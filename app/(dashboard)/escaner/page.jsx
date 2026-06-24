'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/AuthContext';
import { useConfig } from '@/hooks/useConfig';
import { useCajaAbierta } from '@/hooks/useCajaAbierta';
import { getProductos, createProducto } from '@/lib/db/productos';
import { getCategorias } from '@/lib/db/categorias';
import { getProveedores } from '@/lib/db/proveedores';
import { createScanEvent } from '@/lib/db/scan';
import { resolveProductByBarcode } from '@/lib/productLookup';
import BarcodeScanner from '@/components/barcode/BarcodeScanner';
import ProductoNoEncontradoDialog from '@/components/venta/ProductoNoEncontradoDialog';
import AsignarCodigoDialog from '@/components/venta/AsignarCodigoDialog';
import ProductoDialog from '@/components/productos/ProductoDialog';
import AbrirCajaDialog from '@/components/caja/AbrirCajaDialog';
import ActivarSonidoButton from '@/components/common/ActivarSonidoButton';
import { Button } from '@/components/ui/button';
import { ScanLine, Lock, Check, RotateCcw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatMoney } from '@/utils/currency';
import { normalizeBarcode } from '@/utils/barcodeUtils';
import { getDeviceId } from '@/utils/deviceId';
import { playScanSuccess, playScanError } from '@/utils/audioFeedback';
import { useGatedAction } from '@/hooks/useGatedAction';

export default function EscanerPage() {
  const { negocioId, usuario } = useAuth();
  const { config } = useConfig();
  const { cajaAbierta, isLoading: cajaLoading, refetch: refetchCaja } = useCajaAbierta();
  const queryClient = useQueryClient();
  const sym = config?.simbolo_moneda || '$';
  const gated = useGatedAction();

  const [scannerOpen, setScannerOpen] = useState(false);
  const [cajaDialogOpen, setCajaDialogOpen] = useState(false);
  const [noEncontradoCode, setNoEncontradoCode] = useState(null);
  const [asignarOpen, setAsignarOpen] = useState(false);
  const [codigoParaAsignar, setCodigoParaAsignar] = useState('');
  const [nuevoProdOpen, setNuevoProdOpen] = useState(false);
  const [codigoParaNuevo, setCodigoParaNuevo] = useState('');
  const [scanFeedback, setScanFeedback] = useState(null);
  const [enviados, setEnviados] = useState([]);
  const lastSentRef = useRef({ code: '', ts: 0 });

  useEffect(() => {
    if (!cajaAbierta && scannerOpen) {
      setScannerOpen(false);
      toast.warning('La caja fue cerrada. Abre una caja para seguir escaneando.');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cajaAbierta]);

  const { data: productos = [] } = useQuery({ queryKey: ['productos-pos', negocioId], queryFn: () => getProductos(negocioId, { soloActivos: true }), enabled: !!negocioId, staleTime: 1000 * 60 });
  const { data: categorias = [] } = useQuery({ queryKey: ['categorias', negocioId], queryFn: () => getCategorias(negocioId), enabled: !!negocioId, staleTime: 1000 * 60 * 5 });
  const { data: proveedores = [] } = useQuery({ queryKey: ['proveedores', negocioId], queryFn: () => getProveedores(negocioId), enabled: !!negocioId, staleTime: 1000 * 60 * 5 });

  const totalEnviados = enviados.reduce((s, x) => s + (x.cantidad || 1), 0);
  const totalMonto = enviados.reduce((s, x) => s + (x.precio_unitario || 0) * (x.cantidad || 1), 0);

  const sendScanEvent = useCallback(async (producto) => {
    if (!gated.ensureAccess()) return;
    if (!cajaAbierta?.id) {
      toast.error('Abre caja antes de escanear');
      return;
    }
    try {
      await createScanEvent({
        negocio_id: negocioId,
        corte_id: cajaAbierta.id,
        codigo_barras: producto.codigo_barras || '',
        producto_id: producto.id,
        producto_nombre: producto.nombre,
        cantidad: 1,
        precio_unitario: producto.precio_venta || 0,
        estado: 'pendiente',
        source_device: 'mobile_scanner',
        device_id: getDeviceId(),
        usuario_id: usuario?.id ?? null,
      });
      const entrada = { id: Date.now(), producto_nombre: producto.nombre, cantidad: 1, precio_unitario: producto.precio_venta || 0 };
      setEnviados((prev) => [...prev, entrada]);
      setScanFeedback({ id: entrada.id, nombre: producto.nombre, cantidad: 1, precio: producto.precio_venta || 0, modo: 'remote' });
      playScanSuccess();
    } catch {
      playScanError();
      toast.error('Error al enviar a caja');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cajaAbierta, negocioId, usuario]);

  const handleBarcodeScan = useCallback(async (code) => {
    const normalized = normalizeBarcode(code);
    if (!normalized) return;
    const now = Date.now();
    if (lastSentRef.current.code === normalized && now - lastSentRef.current.ts < 1200) return;
    const result = resolveProductByBarcode(normalized, productos);
    if (result.status === 'not_found') {
      playScanError();
      setNoEncontradoCode(normalized);
      setScannerOpen(false);
      return;
    }
    if (result.status === 'duplicate') {
      playScanError();
      toast.error('Código duplicado en productos. Revisa el catálogo.');
      return;
    }
    lastSentRef.current = { code: normalized, ts: now };
    sendScanEvent(result.producto);
  }, [productos, sendScanEvent]);

  const handleCrearProducto = () => { setCodigoParaNuevo(noEncontradoCode || ''); setNoEncontradoCode(null); setNuevoProdOpen(true); };
  const handleAsignarExistente = () => { setCodigoParaAsignar(noEncontradoCode || ''); setNoEncontradoCode(null); setAsignarOpen(true); };
  const handleCodigoAsignado = async (productoActualizado) => {
    setAsignarOpen(false);
    setCodigoParaAsignar('');
    await queryClient.invalidateQueries({ queryKey: ['productos-pos'] });
    await queryClient.refetchQueries({ queryKey: ['productos-pos'] });
    sendScanEvent(productoActualizado);
  };
  const handleGuardarNuevoProducto = async (data) => {
    try {
      const prod = await createProducto({ ...data, negocio_id: negocioId });
      toast.success('Producto creado');
      setNuevoProdOpen(false);
      setCodigoParaNuevo('');
      await queryClient.invalidateQueries({ queryKey: ['productos-pos'] });
      await queryClient.refetchQueries({ queryKey: ['productos-pos'] });
      sendScanEvent(prod);
    } catch {
      toast.error('Error al crear producto');
    }
  };

  if (cajaLoading) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-full p-4 lg:p-6 max-w-2xl mx-auto pb-24">
      <header className="mb-4">
        <h1 className="text-xl font-black text-foreground">Escáner</h1>
        <p className="text-sm text-muted-foreground">Usa este dispositivo para escanear productos. Se enviarán a la caja activa.</p>
      </header>

      {!cajaAbierta ? (
        <div className="skeu-card p-6 flex flex-col items-center gap-3 text-center">
          <div className="h-16 w-16 rounded-2xl bg-amber-500/10 flex items-center justify-center skeu-input"><Lock className="h-8 w-8 text-amber-500" /></div>
          <p className="text-base font-black text-foreground">Caja cerrada</p>
          <p className="text-sm text-muted-foreground">Abre caja antes de escanear productos.</p>
          <Button onClick={gated(() => setCajaDialogOpen(true))} className="skeu-btn-primary h-11 px-6 font-bold">Abrir caja</Button>
        </div>
      ) : (
        <>
          <div className="skeu-card p-3 mb-3 flex items-center justify-between text-xs">
            <span className="text-green-500 font-semibold">● Caja abierta — {cajaAbierta.cajero_nombre}</span>
            <span className="text-muted-foreground">enviando a esta caja</span>
          </div>

          <div className="mb-3"><ActivarSonidoButton variant="card" /></div>

          <button onClick={gated(() => setScannerOpen(true))} className="skeu-btn-primary w-full h-20 rounded-2xl flex items-center justify-center gap-3 font-black text-lg mb-4">
            <ScanLine className="h-7 w-7" /> Iniciar escáner
          </button>

          <div className="skeu-card p-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-bold text-sm text-foreground">Enviados a caja</h2>
              {enviados.length > 0 && (
                <button onClick={() => setEnviados([])} className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1" title="Limpiar lista local">
                  <Trash2 className="h-3.5 w-3.5" /> Limpiar
                </button>
              )}
            </div>
            {enviados.length === 0 ? (
              <p className="text-sm text-muted-foreground italic py-2">Aún no has escaneado nada.</p>
            ) : (
              <>
                <ul className="divide-y divide-border max-h-72 overflow-y-auto">
                  {[...enviados].reverse().map((ev) => (
                    <li key={ev.id} className="py-2 flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                      <span className="flex-1 truncate text-foreground">{ev.producto_nombre}</span>
                      <span className="text-muted-foreground tabular-nums">{formatMoney(ev.precio_unitario, sym)} · x{ev.cantidad}</span>
                    </li>
                  ))}
                </ul>
                <div className="border-t border-border mt-2 pt-2 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{totalEnviados} {totalEnviados === 1 ? 'producto' : 'productos'}</span>
                  <span className="font-bold text-foreground tabular-nums">{formatMoney(totalMonto, sym)}</span>
                </div>
              </>
            )}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <Link href="/venta" className="skeu-btn-ghost h-11 rounded-xl flex items-center justify-center font-bold text-sm text-foreground">Ir a Punto de Venta</Link>
            <button onClick={() => setEnviados([])} disabled={enviados.length === 0} className="skeu-btn-ghost h-11 rounded-xl flex items-center justify-center gap-1 font-bold text-sm text-foreground disabled:opacity-40">
              <RotateCcw className="h-4 w-4" /> Reiniciar lista
            </button>
          </div>

          <p className="text-[11px] text-muted-foreground mt-4 text-center px-4">
            Los productos escaneados se envían a la caja activa. Abre Punto de Venta en otra pantalla para verlos llegar al carrito en tiempo real.
          </p>
        </>
      )}

      <BarcodeScanner open={scannerOpen} onClose={() => setScannerOpen(false)} onDetected={handleBarcodeScan} continuous title="Escáner remoto" mode="remote" feedback={scanFeedback} onFeedbackHide={() => setScanFeedback(null)} miniCart={{ items: [], total: totalMonto, sym, recentScans: enviados, mode: 'remote' }} onFinish={() => setScannerOpen(false)} />

      <AbrirCajaDialog open={cajaDialogOpen} onClose={() => setCajaDialogOpen(false)} onSuccess={() => { setCajaDialogOpen(false); refetchCaja(); queryClient.invalidateQueries({ queryKey: ['caja-abierta'] }); }} />

      <ProductoNoEncontradoDialog open={!!noEncontradoCode} codigo={noEncontradoCode || ''} onCrear={handleCrearProducto} onAsignarExistente={handleAsignarExistente} onReintentar={() => { setNoEncontradoCode(null); setScannerOpen(true); }} onCancelar={() => setNoEncontradoCode(null)} />

      <AsignarCodigoDialog open={asignarOpen} codigo={codigoParaAsignar} productos={productos} onClose={() => { setAsignarOpen(false); setCodigoParaAsignar(''); }} onAsignado={handleCodigoAsignado} />

      <ProductoDialog open={nuevoProdOpen} onClose={() => { setNuevoProdOpen(false); setCodigoParaNuevo(''); }} onSave={handleGuardarNuevoProducto} producto={null} categorias={categorias} proveedores={proveedores} codigoInicial={codigoParaNuevo} />
    </div>
  );
}
