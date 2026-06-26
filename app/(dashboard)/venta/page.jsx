'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth/AuthContext';
import { useConfig } from '@/hooks/useConfig';
import { useNegocio } from '@/hooks/useNegocio';
import { useCajaAbierta } from '@/hooks/useCajaAbierta';
import { useCarritoActivo } from '@/hooks/useCarritoActivo';
import { useFiado } from '@/hooks/useFiado';
import { useOffline } from '@/hooks/useOffline';
import { useEscanerFisico } from '@/hooks/useEscanerFisico';
import { useBascula } from '@/hooks/useBascula';
import { getProductos, createProducto } from '@/lib/db/productos';
import { getCombos, getProductosComboStock } from '@/lib/db/combos';
import { getCategorias } from '@/lib/db/categorias';
import { getProveedores } from '@/lib/db/proveedores';
import { createVenta } from '@/lib/db/ventas';
import { ajustarStock } from '@/lib/db/inventario';
import { getScanEventsPendientes, marcarScanEvent, subscribeScanEvents } from '@/lib/db/scan';
import { registrarCargo } from '@/lib/db/fiado';
import { cacheProductos, buscarProductoOffline } from '@/lib/offline/productos';
import { cacheConfig } from '@/lib/offline/config';
import { guardarVentaPendiente } from '@/lib/offline/ventas';
import { resolveProductByBarcode } from '@/lib/productLookup';
import { formatMoney } from '@/utils/currency';
import { generateFolio } from '@/utils/folioUtils';
import { normalizeBarcode } from '@/utils/barcodeUtils';
import { construirUrlWhatsApp, generarMensajeTicket } from '@/utils/whatsapp';
import { playScanSuccess, playScanError, playSaleSuccess } from '@/utils/audioFeedback';
import BuscadorProducto from '@/components/venta/BuscadorProducto';
import CombosDisponibles from '@/components/venta/CombosDisponibles';
import CategoriaTabs from '@/components/venta/CategoriaTabs';
import CarritoVenta from '@/components/venta/CarritoVenta';
import MobileCartBar from '@/components/venta/MobileCartBar';
import CobroDialog from '@/components/venta/CobroDialog';
import TicketVenta from '@/components/venta/TicketVenta';
import AbrirCajaDialog from '@/components/caja/AbrirCajaDialog';
import CierreCajaDialog from '@/components/caja/CierreCajaDialog';
import BarcodeScanner from '@/components/barcode/BarcodeScanner';
import ProductoNoEncontradoDialog from '@/components/venta/ProductoNoEncontradoDialog';
import ProductoDialog from '@/components/productos/ProductoDialog';
import AsignarCodigoDialog from '@/components/venta/AsignarCodigoDialog';
import InlineSyncIndicator from '@/components/common/InlineSyncIndicator';
import OfflineBanner from '@/components/venta/OfflineBanner';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { ShoppingCart, DollarSign, Trash2, Monitor, Printer, Lock, DoorClosed, Camera, MessageCircle, CreditCard, UserPlus, X } from 'lucide-react';
import { useGatedAction } from '@/hooks/useGatedAction';

export default function VentaPage() {
  const { negocioId, usuario } = useAuth();
  const { config } = useConfig();
  const { negocio } = useNegocio();
  const { clientes: fiadoClientes, crearCliente: crearClienteFiado } = useFiado();
  const { cajaAbierta, isLoading: cajaLoading, refetch: refetchCaja } = useCajaAbierta();
  const cajeroNombre = usuario?.nombre_visible || 'Cajero';

  const userScope = usuario?.id ? `::${usuario.id}` : '';
  const KEY_CART = `pos-mh-cart${userScope}`;
  const KEY_LAST_SALE = `pos-mh-last-sale${userScope}`;
  const queryClient = useQueryClient();
  const ticketRef = useRef(null);
  const bascula = useBascula(config);

  const { items, addItem, updateQty: updateQtyShared, removeItem: removeItemShared, clear: clearCartShared, cerrarVenta: cerrarVentaCarrito } = useCarritoActivo(cajaAbierta?.id || null);

  // Modo offline: el carrito normal es DB-backed (useCarritoActivo) y no funciona sin
  // conexión, así que offline se usa un carrito local en esta página.
  const { isOffline, ventasPendientes, sincronizando, refrescarPendientes } = useOffline();
  const [offlineCart, setOfflineCart] = useState([]);
  const [offlineProductos, setOfflineProductos] = useState([]);

  // Vista del carrito para la UI (nombre/precio/costo). Offline → carrito local.
  const carrito = isOffline
    ? offlineCart
    : items.map((i) => ({ ...i, nombre: i.producto_nombre, precio: i.precio_unitario, costo: i.costo_unitario, es_mayoreo: i.es_mayoreo }));

  const [cobroOpen, setCobroOpen] = useState(false);
  const [cajaDialogOpen, setCajaDialogOpen] = useState(false);
  const [lastVenta, setLastVenta] = useState(null);
  const [lastDetalles, setLastDetalles] = useState([]);
  const [showTicket, setShowTicket] = useState(false);
  const [whatsappTelefono, setWhatsappTelefono] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [cierreOpen, setCierreOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [noEncontradoCode, setNoEncontradoCode] = useState(null);
  const [nuevoProdOpen, setNuevoProdOpen] = useState(false);
  const [codigoParaNuevo, setCodigoParaNuevo] = useState('');
  const [asignarOpen, setAsignarOpen] = useState(false);
  const [codigoParaAsignar, setCodigoParaAsignar] = useState('');
  const [scanFeedback, setScanFeedback] = useState(null);
  const [fiadoOpen, setFiadoOpen] = useState(false);
  const [fiadoSearch, setFiadoSearch] = useState('');
  // Flujo de fiado desde el POS: selección de cliente o alta inline.
  const [fiadoSelectedCliente, setFiadoSelectedCliente] = useState(null);
  const [fiadoCreating, setFiadoCreating] = useState(false);
  const [fiadoNewNombre, setFiadoNewNombre] = useState('');
  const [fiadoNewTelefono, setFiadoNewTelefono] = useState('');
  const [fiadoNewNotas, setFiadoNewNotas] = useState('');
  const [fiadoSavingCliente, setFiadoSavingCliente] = useState(false);
  const [selectedCategoriaId, setSelectedCategoriaId] = useState(null);
  const [pesoDialog, setPesoDialog] = useState(null);
  const [pendingPesoItem, setPendingPesoItem] = useState(null);
  const processedEventIdsRef = useRef(new Set());

  const { data: categorias = [] } = useQuery({ queryKey: ['categorias', negocioId], queryFn: () => getCategorias(negocioId), enabled: !!negocioId, staleTime: 1000 * 60 * 5 });
  const { data: proveedores = [] } = useQuery({ queryKey: ['proveedores', negocioId], queryFn: () => getProveedores(negocioId), enabled: !!negocioId, staleTime: 1000 * 60 * 5 });
  const { data: productos = [], isLoading: prodLoading, isFetching: prodFetching } = useQuery({ queryKey: ['productos-pos', negocioId], queryFn: () => getProductos(negocioId, { soloActivos: true }), enabled: !!negocioId, staleTime: 1000 * 60 });
  const { data: combos = [] } = useQuery({ queryKey: ['combos-pos', negocioId], queryFn: () => getCombos(negocioId), enabled: !!negocioId, staleTime: 1000 * 60 });

  const sym = config?.simbolo_moneda || '$';
  const total = carrito.reduce((s, i) => s + i.subtotal - (i.descuento || 0), 0);
  const gated = useGatedAction();

  // Productos a mostrar/buscar: offline usa el cache de IndexedDB.
  const productosUI = isOffline ? offlineProductos : productos;

  const productosFiltrados = selectedCategoriaId
    ? productosUI.filter((p) => p.categoria_id === selectedCategoriaId)
    : productosUI;
  const hoy = new Date().toISOString().slice(0, 10);
  const combosVigentes = combos.filter((combo) => (
    combo.activo
    && (!combo.fecha_inicio || combo.fecha_inicio <= hoy)
    && (!combo.fecha_fin || combo.fecha_fin >= hoy)
  ));

  // Registrar el Service Worker. STEP 6 movido aquí porque app/layout.tsx NO está en
  // los archivos permitidos esta ronda; registrado desde /venta queda activo para todo el origen.
  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);

  // Cachear productos y config para uso offline mientras hay conexión.
  useEffect(() => {
    if (!isOffline && productos.length > 0) void cacheProductos(productos);
  }, [productos, isOffline]);
  useEffect(() => {
    if (!isOffline && config) void cacheConfig(config);
  }, [config, isOffline]);

  // Al entrar en modo offline, cargar los productos cacheados.
  useEffect(() => {
    if (isOffline) {
      void buscarProductoOffline('').then(setOfflineProductos).catch(() => setOfflineProductos([]));
    }
  }, [isOffline]);

  const focusSearchInput = useCallback(() => {
    if (typeof document === 'undefined') return;
    window.requestAnimationFrame(() => {
      document.querySelector('input[placeholder^="Buscar producto"]')?.focus();
    });
  }, []);

  useEffect(() => {
    focusSearchInput();
  }, [focusSearchInput]);

  // Agregar al carrito local (offline).
  const addOfflineItem = useCallback((producto) => {
    setOfflineCart((prev) => {
      const idx = prev.findIndex((i) => i.producto_id === producto.id);
      if (idx >= 0) {
        const copy = [...prev];
        const it = copy[idx];
        const cantidad = (it.cantidad || 0) + 1;
        copy[idx] = { ...it, cantidad, subtotal: (it.precio || 0) * cantidad };
        return copy;
      }
      return [
        ...prev,
        {
          producto_id: producto.id,
          nombre: producto.nombre,
          precio: producto.precio_venta || 0,
          costo: producto.costo_unitario || 0,
          cantidad: 1,
          subtotal: producto.precio_venta || 0,
          descuento: 0,
          sku: producto.sku || null,
          codigo_barras: producto.codigo_barras || null,
          unidad_venta: producto.unidad_venta || null,
        },
      ];
    });
    playScanSuccess();
  }, []);

  const getPrecioPorKg = (producto) => Number(producto?.precio_por_kg || 0);

  const abrirProductoPorPeso = useCallback((producto, opts = {}) => {
    const precioPorKg = getPrecioPorKg(producto);
    if (precioPorKg <= 0) {
      toast.error('Configura el precio por kg de este producto');
      return false;
    }

    if (!isOffline && !gated.ensureAccess()) return false;
    if (!isOffline && !config?.permitir_venta_sin_stock && !producto.permite_venta_sin_stock && producto.stock_actual <= 0) {
      toast.error('Producto sin stock');
      return false;
    }

    setPesoDialog({
      producto,
      peso: '',
      leyendo: bascula.conectada,
      error: bascula.conectada ? null : (bascula.soportada ? 'Conecta la báscula o ingresa el peso manualmente.' : 'Tu navegador no soporta conexión de báscula. Usa Chrome o Edge.'),
      showFeedback: !!opts.showFeedback,
    });
    if (opts.showFeedback) setScannerOpen(false);
    focusSearchInput();

    if (bascula.conectada) {
      void bascula.leerPeso()
        .then((peso) => {
          setPesoDialog((actual) => (
            actual?.producto?.id === producto.id
              ? { ...actual, peso: String(peso), leyendo: false, error: null }
              : actual
          ));
        })
        .catch((error) => {
          setPesoDialog((actual) => (
            actual?.producto?.id === producto.id
              ? { ...actual, leyendo: false, error: error?.message || 'No se pudo leer el peso de la báscula.' }
              : actual
          ));
        });
    }

    return false;
  }, [bascula, config, focusSearchInput, gated, isOffline]);

  const addToCart = useCallback((producto, opts = {}) => {
    if (producto?.vendido_por_peso) {
      return abrirProductoPorPeso(producto, opts);
    }

    if (isOffline) {
      // Offline: carrito local, sin gating de suscripción (modo degradado para seguir vendiendo).
      addOfflineItem(producto);
      if (opts.showFeedback) {
        setScanFeedback({ id: Date.now(), nombre: producto.nombre, cantidad: 1, precio: producto.precio_venta, modo: 'local' });
      }
      return true;
    }
    if (!gated.ensureAccess()) return false;
    if (!config?.permitir_venta_sin_stock && !producto.permite_venta_sin_stock && producto.stock_actual <= 0) {
      toast.error('Producto sin stock');
      return false;
    }
    const existente = items.find((i) => i.producto_id === producto.id);
    const nuevaCant = (existente?.cantidad || 0) + 1;
    const esMayoreo = !!(config?.activar_mayoreo && producto.cantidad_minima_mayoreo > 0 && nuevaCant >= producto.cantidad_minima_mayoreo);
    const precioUnitario = esMayoreo ? producto.precio_mayoreo : producto.precio_venta;

    void addItem(producto, precioUnitario, esMayoreo);
    playScanSuccess();
    if (opts.showFeedback) {
      setScanFeedback({ id: Date.now(), nombre: producto.nombre, cantidad: nuevaCant, precio: precioUnitario, modo: 'local' });
    }
    return true;
  }, [abrirProductoPorPeso, config, addItem, gated, items, isOffline, addOfflineItem]);

  const confirmarProductoPorPeso = async () => {
    if (!pesoDialog?.producto) return;

    const producto = pesoDialog.producto;
    const peso = Number(String(pesoDialog.peso).replace(',', '.'));
    const precioPorKg = getPrecioPorKg(producto);

    if (!Number.isFinite(peso) || peso <= 0) {
      toast.error('Ingresa un peso válido');
      return;
    }
    if (precioPorKg <= 0) {
      toast.error('Configura el precio por kg de este producto');
      return;
    }

    const cantidad = Number(peso.toFixed(3));
    const productoParaCarrito = { ...producto, precio_venta: precioPorKg, unidad_venta: producto.unidad_venta || 'kg' };

    if (isOffline) {
      setOfflineCart((prev) => {
        const idx = prev.findIndex((i) => i.producto_id === producto.id);
        if (idx >= 0) {
          const copy = [...prev];
          const it = copy[idx];
          const nuevaCantidad = Number(((it.cantidad || 0) + cantidad).toFixed(3));
          copy[idx] = { ...it, cantidad: nuevaCantidad, precio: precioPorKg, subtotal: precioPorKg * nuevaCantidad };
          return copy;
        }
        return [
          ...prev,
          {
            producto_id: producto.id,
            nombre: producto.nombre,
            precio: precioPorKg,
            costo: producto.costo_unitario || 0,
            cantidad,
            subtotal: precioPorKg * cantidad,
            descuento: 0,
            sku: producto.sku || null,
            codigo_barras: producto.codigo_barras || null,
            unidad_venta: producto.unidad_venta || 'kg',
          },
        ];
      });
    } else {
      const existente = items.find((i) => i.producto_id === producto.id);
      const cantidadObjetivo = Number(((existente?.cantidad || 0) + cantidad).toFixed(3));
      await addItem(productoParaCarrito, precioPorKg, false);
      if (existente) {
        await updateQtyShared(existente.id, cantidadObjetivo, precioPorKg, false);
      } else {
        setPendingPesoItem({ productoId: producto.id, cantidad: cantidadObjetivo, precio: precioPorKg });
      }
    }

    playScanSuccess();
    if (pesoDialog.showFeedback) {
      setScanFeedback({ id: Date.now(), nombre: producto.nombre, cantidad, precio: precioPorKg, modo: 'local' });
    }
    toast.success(`Agregado: ${producto.nombre} (${cantidad} kg)`);
    setPesoDialog(null);
    focusSearchInput();
  };

  const leerPesoDesdeBascula = useCallback(() => {
    if (!pesoDialog?.producto || !bascula.conectada) return;

    const productoId = pesoDialog.producto.id;
    setPesoDialog((actual) => (actual ? { ...actual, leyendo: true, error: null } : actual));
    void bascula.leerPeso()
      .then((peso) => {
        setPesoDialog((actual) => (
          actual?.producto?.id === productoId
            ? { ...actual, peso: String(peso), leyendo: false, error: null }
            : actual
        ));
      })
      .catch((error) => {
        setPesoDialog((actual) => (
          actual?.producto?.id === productoId
            ? { ...actual, leyendo: false, error: error?.message || 'No se pudo leer el peso de la báscula.' }
            : actual
        ));
      });
  }, [bascula, pesoDialog?.producto]);

  useEffect(() => {
    if (!pendingPesoItem || isOffline) return;

    const item = items.find((i) => i.producto_id === pendingPesoItem.productoId);
    if (!item) return;

    void updateQtyShared(item.id, pendingPesoItem.cantidad, pendingPesoItem.precio, false);
    setPendingPesoItem(null);
  }, [items, isOffline, pendingPesoItem, updateQtyShared]);

  const getComboIdFromItem = (item) => {
    const sku = item?.sku || '';
    return sku.startsWith('COMBO:') ? sku.slice('COMBO:'.length) : null;
  };

  const addComboToCart = useCallback((combo) => {
    if (isOffline) {
      toast.error('Los combos requieren conexión');
      return;
    }
    if (!gated.ensureAccess()) return;

    const costoCombo = (combo.combo_productos || []).reduce((sum, item) => {
      const prod = productos.find((p) => p.id === item.producto_id);
      return sum + Number(prod?.costo_unitario || 0) * Number(item.cantidad || 0);
    }, 0);

    const comboProducto = {
      id: undefined,
      nombre: `COMBO: ${combo.nombre}`,
      sku: `COMBO:${combo.id}`,
      codigo_barras: null,
      precio_venta: combo.precio_combo,
      costo_unitario: costoCombo,
      unidad_venta: 'pieza',
      stock_actual: 999999,
      stock_minimo: 0,
      precio_mayoreo: combo.precio_combo,
      cantidad_minima_mayoreo: 0,
      permite_venta_sin_stock: true,
      vendido_por_peso: false,
    };

    void addItem(comboProducto, combo.precio_combo, false);
    playScanSuccess();
    toast.success(`Combo agregado: ${combo.nombre}`);
  }, [addItem, gated, isOffline, productos]);

  const updateQty = (idx, qty) => {
    if (isOffline) {
      setOfflineCart((prev) => {
        if (qty <= 0) return prev.filter((_, i) => i !== idx);
        const copy = [...prev];
        const it = copy[idx];
        if (it) copy[idx] = { ...it, cantidad: qty, subtotal: (it.precio || 0) * qty };
        return copy;
      });
      return;
    }
    const item = items[idx];
    if (item) {
      const prod = productos.find((p) => p.id === item.producto_id);
      if (prod) {
        const esMayoreo = !!(config?.activar_mayoreo && prod.cantidad_minima_mayoreo > 0 && qty >= prod.cantidad_minima_mayoreo);
        const precioUnitario = esMayoreo ? prod.precio_mayoreo : prod.precio_venta;
        updateQtyShared(item.id, qty, precioUnitario, esMayoreo);
      } else {
        updateQtyShared(item.id, qty);
      }
    }
  };
  const removeItem = (idx) => {
    if (isOffline) {
      setOfflineCart((prev) => prev.filter((_, i) => i !== idx));
      return;
    }
    const item = items[idx];
    if (item) removeItemShared(item.id);
  };

  const handleBarcodeScan = useCallback(async (code) => {
    const normalized = normalizeBarcode(code);
    if (!normalized) return;
    const result = resolveProductByBarcode(normalized, productosUI);
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
    const agregado = addToCart(result.producto, { showFeedback: scannerOpen });
    if (!scannerOpen && agregado) toast.success(`Agregado: ${result.producto.nombre}`);
    focusSearchInput();
  }, [productosUI, addToCart, scannerOpen, focusSearchInput]);

  useEscanerFisico(config, handleBarcodeScan);

  const handleCrearProductoDesdeNoEncontrado = () => {
    setCodigoParaNuevo(noEncontradoCode || '');
    setNoEncontradoCode(null);
    setNuevoProdOpen(true);
  };
  const handleAsignarExistenteDesdeNoEncontrado = () => {
    setCodigoParaAsignar(noEncontradoCode || '');
    setNoEncontradoCode(null);
    setAsignarOpen(true);
  };

  const handleCodigoAsignado = async (productoActualizado) => {
    setAsignarOpen(false);
    setCodigoParaAsignar('');
    await queryClient.invalidateQueries({ queryKey: ['productos-pos'] });
    await queryClient.refetchQueries({ queryKey: ['productos-pos'] });
    addToCart({ ...productoActualizado });
    toast.success(`Código actualizado y ${productoActualizado.nombre} agregado al carrito`);
  };

  const handleGuardarNuevoProducto = async (data) => {
    try {
      await createProducto({ ...data, negocio_id: negocioId });
      toast.success('Producto creado');
      setNuevoProdOpen(false);
      setCodigoParaNuevo('');
      queryClient.invalidateQueries({ queryKey: ['productos-pos'] });
      queryClient.invalidateQueries({ queryKey: ['productos-all'] });
    } catch {
      toast.error('Error al crear producto');
    }
  };

  const cancelSale = () => {
    if (carrito.length === 0) return;
    if (window.confirm('¿Cancelar la venta actual?')) {
      if (isOffline) setOfflineCart([]);
      else clearCartShared();
      toast.info('Venta cancelada');
    }
  };

  // Cobro OFFLINE: guarda la venta en IndexedDB para sincronizar al volver internet.
  // No toca Supabase. Usa el carrito local (offlineCart). Método de pago: efectivo
  // (offline no se abre CobroDialog). Stock/kardex se aplican al sincronizar (vía repo).
  const handleCobroOffline = async () => {
    if (carrito.length === 0 || isProcessing) return;
    setIsProcessing(true);
    try {
      const folio = generateFolio();
      const subtotalVenta = carrito.reduce((s, i) => s + i.subtotal, 0);
      const descuentoVenta = carrito.reduce((s, i) => s + (i.descuento || 0), 0);
      const costoTotal = carrito.reduce((s, i) => s + i.costo * i.cantidad, 0);
      const totalVenta = subtotalVenta - descuentoVenta;
      const utilidadBruta = totalVenta - costoTotal;
      const margen = totalVenta > 0 ? utilidadBruta / totalVenta : 0;

      const detalle = carrito.map((item) => ({
        producto_id: item.producto_id,
        producto_nombre: item.nombre,
        sku: item.sku,
        codigo_barras: item.codigo_barras,
        cantidad: item.cantidad,
        unidad_venta: item.unidad_venta || null,
        precio_unitario_snapshot: item.precio,
        costo_unitario_snapshot: item.costo,
        subtotal: item.subtotal,
        descuento: item.descuento || 0,
        total: item.subtotal - (item.descuento || 0),
        utilidad_snapshot: (item.precio - item.costo) * item.cantidad,
      }));

      await guardarVentaPendiente({
        venta: {
          negocio_id: negocioId,
          folio,
          fecha: new Date().toISOString(),
          estado: 'pagada',
          cajero_id: usuario?.id ?? null,
          cajero_nombre: cajeroNombre,
          subtotal: subtotalVenta,
          descuento_total: descuentoVenta,
          total: totalVenta,
          costo_total_snapshot: costoTotal,
          utilidad_bruta_snapshot: utilidadBruta,
          margen_snapshot: margen,
          corte_id: cajaAbierta?.id ?? null,
          metodo_pago: 'efectivo',
        },
        detalle,
      });

      setOfflineCart([]);
      await refrescarPendientes();
      toast.success('Venta guardada. Se sincronizará cuando vuelva el internet.');
    } catch (err) {
      toast.error('No se pudo guardar la venta offline: ' + (err?.message || ''));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCobro = async (pagoData) => {
    if (!gated.ensureAccess()) return;
    if (isProcessing) return;
    setIsProcessing(true);

    const folio = generateFolio();
    const subtotalVenta = carrito.reduce((s, i) => s + i.subtotal, 0);
    const descuentoVenta = carrito.reduce((s, i) => s + (i.descuento || 0), 0);
    const costoTotal = carrito.reduce((s, i) => s + i.costo * i.cantidad, 0);
    const totalVenta = subtotalVenta - descuentoVenta;
    const utilidadBruta = totalVenta - costoTotal;
    const margen = totalVenta > 0 ? utilidadBruta / totalVenta : 0;

    try {
      const detalle = carrito.map((item) => ({
        producto_id: item.producto_id,
        producto_nombre: item.nombre,
        sku: item.sku,
        codigo_barras: item.codigo_barras,
        cantidad: item.cantidad,
        unidad_venta: item.unidad_venta || null,
        precio_unitario_snapshot: item.precio,
        costo_unitario_snapshot: item.costo,
        subtotal: item.subtotal,
        descuento: item.descuento || 0,
        total: item.subtotal - (item.descuento || 0),
        utilidad_snapshot: (item.precio - item.costo) * item.cantidad,
      }));
      const comboProductoIds = new Set();
      for (const item of carrito) {
        const comboId = getComboIdFromItem(item);
        if (!comboId) continue;
        const combo = combos.find((c) => c.id === comboId);
        for (const comboItem of combo?.combo_productos || []) {
          if (comboItem.producto_id) comboProductoIds.add(comboItem.producto_id);
        }
      }
      const productosComboStock = comboProductoIds.size > 0
        ? await getProductosComboStock(negocioId, Array.from(comboProductoIds))
        : [];
      const productosParaStock = new Map(productos.map((p) => [p.id, p]));
      productosComboStock.forEach((p) => productosParaStock.set(p.id, p));

      const venta = await createVenta({
        venta: {
          negocio_id: negocioId,
          folio,
          fecha: new Date().toISOString(),
          estado: 'pagada',
          cajero_id: usuario?.id ?? null,
          cajero_nombre: cajeroNombre,
          subtotal: subtotalVenta,
          descuento_total: descuentoVenta,
          total: totalVenta,
          costo_total_snapshot: costoTotal,
          utilidad_bruta_snapshot: utilidadBruta,
          margen_snapshot: margen,
          corte_id: cajaAbierta?.id ?? null,
          ...pagoData,
        },
        detalle,
      });

      const stockBajo = [];
      const stockActualPorProducto = new Map(Array.from(productosParaStock.values()).map((p) => [p.id, Number(p.stock_actual || 0)]));

      // Descontar stock + kardex por cada renglón.
      for (const item of carrito) {
        const comboId = getComboIdFromItem(item);
        if (comboId) {
          const combo = combos.find((c) => c.id === comboId);
          for (const comboItem of combo?.combo_productos || []) {
            const prodCombo = productosParaStock.get(comboItem.producto_id);
            if (!prodCombo) continue;
            const cantidadCombo = Number(comboItem.cantidad || 0) * Number(item.cantidad || 1);
            const stockAnteriorCombo = stockActualPorProducto.get(prodCombo.id) ?? Number(prodCombo.stock_actual || 0);
            const newStockCombo = Math.max(0, stockAnteriorCombo - cantidadCombo);
            stockActualPorProducto.set(prodCombo.id, newStockCombo);
            await ajustarStock({
              negocioId,
              productoId: prodCombo.id,
              productoNombre: prodCombo.nombre,
              stockAnterior: stockAnteriorCombo,
              stockNuevo: newStockCombo,
              tipoMovimiento: 'salida_venta',
              usuarioId: usuario?.id ?? null,
              usuarioNombre: cajeroNombre,
              costoUnitario: prodCombo.costo_unitario || 0,
              referenciaTipo: 'venta',
              referenciaId: venta.id,
            });
            if (newStockCombo <= (prodCombo.stock_minimo || 0)) {
              stockBajo.push({
                nombre: prodCombo.nombre,
                stock_actual: newStockCombo,
                unidad: prodCombo.unidad_venta || 'pieza',
              });
            }
          }
          continue;
        }

        const prod = productosParaStock.get(item.producto_id);
        if (!prod) continue;
        const stockAnterior = stockActualPorProducto.get(prod.id) ?? Number(prod.stock_actual || 0);
        const newStock = Math.max(0, stockAnterior - item.cantidad);
        stockActualPorProducto.set(prod.id, newStock);
        await ajustarStock({
          negocioId,
          productoId: prod.id,
          productoNombre: prod.nombre,
          stockAnterior,
          stockNuevo: newStock,
          tipoMovimiento: 'salida_venta',
          usuarioId: usuario?.id ?? null,
          usuarioNombre: cajeroNombre,
          costoUnitario: prod.costo_unitario || item.costo,
          referenciaTipo: 'venta',
          referenciaId: venta.id,
        });
        if (newStock <= (prod.stock_minimo || 0)) {
          stockBajo.push({
            nombre: prod.nombre,
            stock_actual: newStock,
            unidad: prod.unidad_venta || 'pieza',
          });
        }
      }

      // Sync a Vista Cliente (mismo dispositivo).
      const detalleView = detalle.map((d) => ({ nombre: d.producto_nombre, cantidad: d.cantidad, precio: d.precio_unitario_snapshot, subtotal: d.subtotal }));
      const salePayload = { venta, detalles: detalle, config };
      try {
        localStorage.setItem(KEY_LAST_SALE, JSON.stringify(salePayload));
        localStorage.setItem(KEY_CART, JSON.stringify({ items: [], total: 0, subtotal: 0, descuento: 0, config }));
        const bc = new BroadcastChannel('pos-mh-channel');
        bc.postMessage({ type: 'sale', payload: { ...salePayload, detalles: detalleView } });
        bc.postMessage({ type: 'cart', payload: { items: [], total: 0, subtotal: 0, descuento: 0, config } });
        bc.close();
      } catch { /* noop */ }
      setTimeout(() => {
        try {
          localStorage.removeItem(KEY_LAST_SALE);
          const bc2 = new BroadcastChannel('pos-mh-channel');
          bc2.postMessage({ type: 'reset' });
          bc2.close();
        } catch { /* noop */ }
      }, 6000);

      setLastVenta(venta);
      setLastDetalles(detalle);
      await cerrarVentaCarrito();
      setCobroOpen(false);
      setShowTicket(true);
      playSaleSuccess();
      toast.success(`Venta ${folio} cobrada exitosamente`);
      stockBajo.forEach((p) => {
        toast.warning(`⚠️ Stock bajo: ${p.nombre} — quedan ${p.stock_actual} ${p.unidad}`);
      });

      ['ventas-caja', 'gastos-caja', 'productos-pos', 'productos-dashboard', 'caja-cortes', 'dashboard-cortes', 'registros-ventas'].forEach((k) =>
        queryClient.invalidateQueries({ queryKey: [k] }),
      );
    } catch (err) {
      toast.error('Error al procesar venta: ' + (err?.message || ''));
    } finally {
      setIsProcessing(false);
    }
  };

  const cerrarFiadoModal = () => {
    setFiadoOpen(false);
    setFiadoSelectedCliente(null);
    setFiadoCreating(false);
    setFiadoSearch('');
    setFiadoNewNombre('');
    setFiadoNewTelefono('');
    setFiadoNewNotas('');
  };

  // Alta de cliente de fiado INLINE desde el POS (sin navegar). Solo nombre/teléfono/
  // notas (sin límite de crédito). Al crear, lo selecciona para confirmar el fiado.
  const handleCrearClienteFiado = async () => {
    const nombre = fiadoNewNombre.trim();
    if (!nombre) {
      toast.error('El nombre es requerido');
      return;
    }
    setFiadoSavingCliente(true);
    try {
      const nuevo = await crearClienteFiado({
        nombre,
        telefono: fiadoNewTelefono.trim() || null,
        notas: fiadoNewNotas.trim() || null,
      });
      setFiadoSelectedCliente(nuevo);
      setFiadoCreating(false);
      setFiadoNewNombre('');
      setFiadoNewTelefono('');
      setFiadoNewNotas('');
      toast.success(`Cliente "${nombre}" creado`);
    } catch (err) {
      toast.error('No se pudo crear el cliente', { description: err?.message });
    } finally {
      setFiadoSavingCliente(false);
    }
  };

  // Cobro a FIADO: crea la venta con metodo_pago='fiado' (igual que efectivo:
  // createVenta + ajustarStock → descuenta stock + kardex) y registra el cargo al
  // cliente. Función separada para no alterar el handleCobro existente (efectivo/
  // tarjeta/transferencia/mixto). CobroDialog no se modifica (fuera de los archivos
  // permitidos esta ronda); el fiado entra por su propio botón + selector.
  const handleCobroFiado = async (cliente) => {
    if (!gated.ensureAccess()) return;
    if (isProcessing || !cliente) return;
    setIsProcessing(true);

    const folio = generateFolio();
    const subtotalVenta = carrito.reduce((s, i) => s + i.subtotal, 0);
    const descuentoVenta = carrito.reduce((s, i) => s + (i.descuento || 0), 0);
    const costoTotal = carrito.reduce((s, i) => s + i.costo * i.cantidad, 0);
    const totalVenta = subtotalVenta - descuentoVenta;
    const utilidadBruta = totalVenta - costoTotal;
    const margen = totalVenta > 0 ? utilidadBruta / totalVenta : 0;

    try {
      const detalle = carrito.map((item) => ({
        producto_id: item.producto_id,
        producto_nombre: item.nombre,
        sku: item.sku,
        codigo_barras: item.codigo_barras,
        cantidad: item.cantidad,
        unidad_venta: item.unidad_venta || null,
        precio_unitario_snapshot: item.precio,
        costo_unitario_snapshot: item.costo,
        subtotal: item.subtotal,
        descuento: item.descuento || 0,
        total: item.subtotal - (item.descuento || 0),
        utilidad_snapshot: (item.precio - item.costo) * item.cantidad,
      }));

      const venta = await createVenta({
        venta: {
          negocio_id: negocioId,
          folio,
          fecha: new Date().toISOString(),
          estado: 'pagada',
          cajero_id: usuario?.id ?? null,
          cajero_nombre: cajeroNombre,
          subtotal: subtotalVenta,
          descuento_total: descuentoVenta,
          total: totalVenta,
          costo_total_snapshot: costoTotal,
          utilidad_bruta_snapshot: utilidadBruta,
          margen_snapshot: margen,
          corte_id: cajaAbierta?.id ?? null,
          metodo_pago: 'fiado',
        },
        detalle,
      });

      // Descontar stock + kardex por cada renglón (igual que el cobro normal).
      for (const item of carrito) {
        const prod = productos.find((p) => p.id === item.producto_id);
        if (!prod) continue;
        const newStock = Math.max(0, (prod.stock_actual || 0) - item.cantidad);
        await ajustarStock({
          negocioId,
          productoId: item.producto_id,
          productoNombre: item.nombre,
          stockAnterior: prod.stock_actual || 0,
          stockNuevo: newStock,
          tipoMovimiento: 'salida_venta',
          usuarioId: usuario?.id ?? null,
          usuarioNombre: cajeroNombre,
          costoUnitario: item.costo,
          referenciaTipo: 'venta',
          referenciaId: venta.id,
        });
      }

      // Cargo al fiado del cliente (suma al saldo pendiente).
      await registrarCargo(cliente.id, negocioId, totalVenta, venta.id, cajeroNombre, `Venta ${folio}`);

      // Vista Cliente (mismo dispositivo): limpiar el carrito de la segunda pantalla.
      try {
        localStorage.setItem(KEY_CART, JSON.stringify({ items: [], total: 0, subtotal: 0, descuento: 0, config }));
        const bc = new BroadcastChannel('pos-mh-channel');
        bc.postMessage({ type: 'cart', payload: { items: [], total: 0, subtotal: 0, descuento: 0, config } });
        bc.close();
      } catch { /* noop */ }

      // fiado_cliente_nombre es solo para el ticket en memoria (no es columna de ventas).
      setLastVenta({ ...venta, fiado_cliente_nombre: cliente.nombre });
      setLastDetalles(detalle);
      await cerrarVentaCarrito();
      cerrarFiadoModal();
      setShowTicket(true);
      playSaleSuccess();
      const nuevoSaldo = Number(cliente.saldo_pendiente || 0) + totalVenta;
      toast.success(`Fiado registrado para ${cliente.nombre}. Debe: ${formatMoney(nuevoSaldo, sym)}`);

      ['ventas-caja', 'productos-pos', 'productos-dashboard', 'caja-cortes', 'dashboard-cortes', 'registros-ventas', 'fiado-clientes'].forEach((k) =>
        queryClient.invalidateQueries({ queryKey: [k] }),
      );
    } catch (err) {
      toast.error('Error al procesar venta a fiado: ' + (err?.message || ''));
    } finally {
      setIsProcessing(false);
    }
  };

  const printTicket = () => {
    if (!ticketRef.current) return;
    const html = ticketRef.current.outerHTML;
    const win = window.open('', '_blank', 'width=380,height=700');
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Ticket ${lastVenta?.folio || ''}</title>
      <style>@page { size: 80mm auto; margin: 0; } html, body { margin: 0 !important; padding: 0 !important; background: white; } * { box-sizing: border-box; } body { font-family: 'Courier New', monospace; } .ticket-printable { width: 80mm !important; max-width: 80mm !important; min-width: 80mm !important; margin: 0 !important; padding: 4mm !important; background: white !important; color: #000 !important; box-shadow: none !important; border: none !important; }</style>
      </head><body>${html}</body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 400);
  };

  const closeTicket = () => {
    setShowTicket(false);
    setWhatsappTelefono('');
  };

  const handleWhatsappTelefonoChange = (event) => {
    setWhatsappTelefono(event.target.value.replace(/\D/g, '').slice(0, 10));
  };

  // Compartir el ticket de la venta recién completada por WhatsApp.
  // Solo se invoca desde el modal de ticket (que ya requiere una venta completada).
  // wa.me sin número abre el selector de chat: en móvil usa la app, en escritorio WhatsApp Web.
  const shareWhatsApp = () => {
    if (!lastVenta) return;
    const mensaje = generarMensajeTicket(lastVenta, lastDetalles, config, negocio?.nombre);
    window.open(construirUrlWhatsApp(mensaje, whatsappTelefono), '_blank', 'noopener,noreferrer');
  };

  const openVistaCliente = () => {
    const itemsView = carrito.map((i) => ({ nombre: i.nombre, cantidad: i.cantidad, precio: i.precio, subtotal: i.subtotal }));
    try { localStorage.setItem(KEY_CART, JSON.stringify({ items: itemsView, total, config })); } catch { /* noop */ }
    window.open('/vista-cliente', '_blank', 'width=800,height=600');
  };

  // Sync carrito → Vista Cliente al cambiar.
  const subtotalCarrito = carrito.reduce((s, i) => s + i.subtotal, 0);
  const descuentoCarrito = carrito.reduce((s, i) => s + (i.descuento || 0), 0);
  useEffect(() => {
    const itemsView = carrito.map((i) => ({ nombre: i.nombre, cantidad: i.cantidad, precio: i.precio, subtotal: i.subtotal }));
    const cartPayload = { items: itemsView, total, subtotal: subtotalCarrito, descuento: descuentoCarrito, config };
    try { localStorage.setItem(KEY_CART, JSON.stringify(cartPayload)); } catch { /* noop */ }
    let bc;
    try {
      bc = new BroadcastChannel('pos-mh-channel');
      bc.postMessage({ type: 'cart', payload: cartPayload });
    } catch { /* noop */ }
    return () => { try { bc?.close(); } catch { /* noop */ } };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, total, subtotalCarrito, descuentoCarrito, config, KEY_CART]);

  const needsCaja = config?.abrir_caja_obligatorio && !cajaAbierta && !cajaLoading;

  // Consumir ScanEvent del escáner móvil vía Supabase Realtime PURO (reemplaza el
  // polling de 1.5s). Cross-device: el teléfono inserta scan_events y este POS los
  // recibe por suscripción (canal scan_events, filtro corte_id=eq.[corteId], INSERT).
  // Cada scan 'pendiente' se reclama (→ 'procesado'), se resuelve el producto y se
  // agrega al carrito (con precio de mayoreo si aplica). El mismo dispositivo escanea
  // por handleBarcodeScan/addToCart (no por scan_events); la Vista Cliente sigue por
  // BroadcastChannel (efecto de arriba), preservado como fallback de mismo dispositivo.
  useEffect(() => {
    const corteId = cajaAbierta?.id;
    if (!corteId) return;
    let cancelled = false;

    const procesarEvento = async (ev) => {
      if (cancelled || !ev) return;
      if (ev.estado && ev.estado !== 'pendiente') return;
      if (processedEventIdsRef.current.has(ev.id)) return;
      processedEventIdsRef.current.add(ev.id);
      try { await marcarScanEvent(ev.id, 'procesado'); } catch { return; }

      let producto = null;
      if (ev.producto_id) producto = productos.find((p) => p.id === ev.producto_id) || null;
      if (!producto && ev.codigo_barras) {
        const r = resolveProductByBarcode(ev.codigo_barras, productos);
        if (r.status === 'found') producto = r.producto;
      }
      if (!producto) {
        try { await marcarScanEvent(ev.id, 'error', 'Producto no encontrado'); } catch { /* noop */ }
        return;
      }
      const cantidad = ev.cantidad && ev.cantidad > 0 ? ev.cantidad : 1;
      let actualCant = items.find((i) => i.producto_id === producto.id)?.cantidad || 0;
      for (let i = 0; i < cantidad; i += 1) {
        actualCant += 1;
        const esMayoreo = !!(config?.activar_mayoreo && producto.cantidad_minima_mayoreo > 0 && actualCant >= producto.cantidad_minima_mayoreo);
        const precioUnitario = esMayoreo ? producto.precio_mayoreo : producto.precio_venta;
        void addItem(producto, precioUnitario, esMayoreo);
      }
      playScanSuccess();
      toast.success(`Recibido desde escáner: ${producto.nombre}`);
    };

    // Catch-up inicial (una sola vez, NO es polling): drena pendientes que pudieran
    // haberse insertado antes de que la suscripción Realtime estuviera conectada.
    void (async () => {
      try {
        const pendientes = await getScanEventsPendientes(corteId);
        for (const ev of pendientes) {
          if (cancelled) break;
          await procesarEvento(ev);
        }
      } catch { /* noop */ }
    })();

    // Suscripción Realtime pura sobre scan_events del corte (evento INSERT).
    const unsubscribe = subscribeScanEvents(corteId, (ev) => {
      void procesarEvento(ev);
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cajaAbierta?.id, productos, addItem]);

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] bg-background">
      <OfflineBanner isOffline={isOffline} sincronizando={sincronizando} ventasPendientes={ventasPendientes} />
      <div className="flex flex-col lg:flex-row flex-1 min-h-0 pb-16 lg:pb-0">
      <div className="flex-1 flex flex-col p-3 lg:p-4 overflow-hidden gap-3">
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <BuscadorProducto productos={productosFiltrados} onSelect={addToCart} onNotFound={(code) => setNoEncontradoCode(code)} />
          </div>
          <button onClick={gated(() => setScannerOpen(true))} title="Escanear código de barras" className="skeu-btn-primary h-12 px-3 sm:px-4 rounded-xl flex items-center gap-1.5 font-bold text-sm flex-shrink-0">
            <Camera className="h-5 w-5" />
            <span className="hidden sm:inline">Escanear</span>
          </button>
          <button onClick={openVistaCliente} title="Abrir Vista Cliente" className="skeu-btn-ghost h-12 w-12 rounded-xl items-center justify-center flex-shrink-0 transition-all hidden sm:flex">
            <Monitor className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        {needsCaja && (
          <div className="flex flex-col items-center justify-center flex-1 gap-4">
            <div className="h-20 w-20 rounded-2xl bg-amber-500/10 flex items-center justify-center skeu-input"><Lock className="h-10 w-10 text-amber-500" /></div>
            <p className="text-xl font-black text-foreground">Caja Cerrada</p>
            <p className="text-sm text-muted-foreground">Abre la caja para comenzar a vender</p>
            <button onClick={gated(() => setCajaDialogOpen(true))} className="skeu-btn-primary px-8 h-12 rounded-xl font-bold text-sm">Abrir Caja</button>
          </div>
        )}

        {cajaAbierta && (
          <div className="flex items-center justify-between px-3 py-2 rounded-xl skeu-card text-xs">
            <span className="text-green-500 font-semibold">● Caja abierta — {cajaAbierta.cajero_nombre}</span>
            <div className="flex items-center gap-2">
              <InlineSyncIndicator active={prodFetching && !prodLoading} label="Sincronizando…" />
              <button onClick={() => setCierreOpen(true)} className="flex items-center gap-1 text-muted-foreground hover:text-destructive transition-colors font-medium">
                <DoorClosed className="h-3.5 w-3.5" /> Cerrar caja
              </button>
            </div>
          </div>
        )}

        {prodLoading && !needsCaja && (
          <div className="flex items-center justify-center gap-2 py-3 text-sm text-muted-foreground">
            <span className="inline-block h-4 w-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            Cargando productos…
          </div>
        )}

        {!needsCaja && (
          <>
            <CategoriaTabs
              categorias={categorias}
              selectedCategoriaId={selectedCategoriaId}
              onSelectCategoria={setSelectedCategoriaId}
            />
            <CombosDisponibles
              combos={combosVigentes}
              onSelect={addComboToCart}
              sym={sym}
              disabled={isOffline || needsCaja}
            />
            <div className="flex-1 overflow-y-auto">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-2">
                {productosFiltrados.map((p) => (
                <button key={p.id} onClick={() => addToCart(p)} className="skeu-card flex flex-col p-3 text-left transition-all duration-150 hover:translate-y-[-1px] active:translate-y-[1px] active:shadow-sm" style={{ minHeight: '100px' }}>
                  {p.imagen_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.imagen_url} alt={p.nombre} className="h-14 w-full object-contain rounded-lg mb-2 bg-muted/50" />
                  ) : (
                    <div className="h-14 w-full rounded-lg bg-muted flex items-center justify-center mb-2 skeu-input"><ShoppingCart className="h-5 w-5 text-muted-foreground/40" /></div>
                  )}
                  <p className="text-xs font-semibold text-foreground leading-tight w-full line-clamp-2">{p.nombre}</p>
                  <div className="flex items-center justify-between mt-1.5 w-full">
                    <span className="text-sm font-black text-primary tabular-nums">{formatMoney(p.precio_venta, sym)}</span>
                    <span className={`text-xs font-semibold tabular-nums ${p.stock_actual <= p.stock_minimo ? 'text-red-500' : 'text-muted-foreground'}`}>{p.stock_actual}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
      </div>

      <div className="hidden lg:flex w-full lg:w-96 border-t lg:border-t-0 lg:border-l border-border flex-col" style={{ background: 'hsl(var(--card))', boxShadow: '-4px 0 16px rgba(0,0,0,0.06)' }}>
        <CarritoVenta items={carrito} onUpdateQty={updateQty} onRemove={removeItem} sym={sym} />
        <div className="p-3 flex flex-col gap-2 border-t border-border">
          <div className="flex gap-2">
            <button onClick={cancelSale} disabled={carrito.length === 0} className="skeu-btn-danger flex-1 h-12 rounded-xl font-bold text-sm flex items-center justify-center gap-1 disabled:opacity-40 disabled:pointer-events-none transition-all">
              <Trash2 className="h-4 w-4" /> Cancelar
            </button>
            <button onClick={gated(() => (isOffline ? handleCobroOffline() : setCobroOpen(true)))} disabled={carrito.length === 0 || isProcessing || (!isOffline && needsCaja)} className="skeu-btn-primary flex-[2] h-12 rounded-xl font-black text-base flex items-center justify-center gap-1 disabled:opacity-40 disabled:pointer-events-none transition-all">
              <DollarSign className="h-5 w-5" /> Cobrar {formatMoney(total, sym)}
            </button>
          </div>
          <button onClick={gated(() => { setFiadoSelectedCliente(null); setFiadoCreating(false); setFiadoSearch(''); setFiadoOpen(true); })} disabled={carrito.length === 0 || needsCaja || isProcessing} className="skeu-btn-ghost h-10 rounded-xl font-bold text-sm flex items-center justify-center gap-1.5 text-foreground disabled:opacity-40 disabled:pointer-events-none transition-all">
            <CreditCard className="h-4 w-4" /> Fiado
          </button>
        </div>
      </div>

      <MobileCartBar items={carrito} total={total} sym={sym} onUpdateQty={updateQty} onRemove={removeItem} onCobrar={gated(() => (isOffline ? handleCobroOffline() : setCobroOpen(true)))} onCancelar={() => (isOffline ? setOfflineCart([]) : clearCartShared())} disabled={carrito.length === 0 || (!isOffline && needsCaja)} isProcessing={isProcessing} />

      <CobroDialog open={cobroOpen} onClose={() => setCobroOpen(false)} total={total} onConfirm={handleCobro} sym={sym} isProcessing={isProcessing} />

      {pesoDialog && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 no-print" onClick={() => { setPesoDialog(null); focusSearchInput(); }}>
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-4 py-3 border-b border-border">
              <h2 className="font-bold text-sm text-foreground">Producto por peso</h2>
              <p className="text-xs text-muted-foreground truncate">{pesoDialog.producto.nombre}</p>
            </div>
            <div className="p-4 space-y-4">
              <div className="skeu-card p-3 text-center">
                <p className="text-xs text-muted-foreground">Peso leído</p>
                <p className="text-3xl font-black tabular-nums text-primary">
                  {Number(String(pesoDialog.peso || 0).replace(',', '.')).toFixed(3)} kg
                </p>
                {pesoDialog.leyendo && (
                  <p className="text-xs text-muted-foreground mt-1">Leyendo báscula...</p>
                )}
              </div>

              {pesoDialog.error && (
                <p className="text-xs text-amber-600">{pesoDialog.error}</p>
              )}

              <div>
                <label className="text-xs font-semibold text-muted-foreground">Peso manual (kg)</label>
                <input
                  type="number"
                  min="0"
                  step="0.001"
                  value={pesoDialog.peso}
                  onChange={(e) => setPesoDialog((actual) => actual ? { ...actual, peso: e.target.value } : actual)}
                  className="skeu-input w-full rounded-md bg-card px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring mt-1"
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Precio por kg</span>
                <span className="font-bold tabular-nums">{formatMoney(getPrecioPorKg(pesoDialog.producto), sym)}</span>
              </div>
              <div className="flex items-center justify-between text-base">
                <span className="font-bold text-foreground">Total</span>
                <span className="font-black tabular-nums text-primary">
                  {formatMoney((Number(String(pesoDialog.peso || 0).replace(',', '.')) || 0) * getPrecioPorKg(pesoDialog.producto), sym)}
                </span>
              </div>

              <div className="flex gap-2 pt-1">
                <button onClick={() => { setPesoDialog(null); focusSearchInput(); }} className="skeu-btn-ghost flex-1 h-10 rounded-xl font-bold text-sm text-foreground">
                  Cancelar
                </button>
                {bascula.conectada && (
                  <button onClick={leerPesoDesdeBascula} disabled={pesoDialog.leyendo} className="skeu-btn-ghost flex-1 h-10 rounded-xl font-bold text-sm text-foreground disabled:opacity-50">
                    {pesoDialog.leyendo ? 'Leyendo...' : 'Leer báscula'}
                  </button>
                )}
                <button onClick={confirmarProductoPorPeso} disabled={pesoDialog.leyendo} className="skeu-btn-primary flex-1 h-10 rounded-xl font-bold text-sm disabled:opacity-50">
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showTicket && lastVenta && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-2 sm:p-4 no-print" onClick={closeTicket}>
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-sm max-h-[95vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="no-print flex items-center justify-between px-4 py-3 bg-gray-900 text-white flex-shrink-0">
              <h2 className="font-bold text-sm">Ticket — {lastVenta.folio}</h2>
              <div className="flex gap-2">
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  value={whatsappTelefono}
                  onChange={handleWhatsappTelefonoChange}
                  placeholder="Número WhatsApp (opcional)"
                  className="h-9 w-32 sm:w-44 rounded-md border border-white/20 bg-white px-2 text-xs text-gray-900 placeholder:text-gray-500 outline-none focus:ring-2 focus:ring-[#25D366]"
                />
                <Button size="sm" onClick={shareWhatsApp} title="Compartir por WhatsApp" className="bg-[#25D366] hover:bg-[#1ebe5d] text-white h-9"><MessageCircle className="h-4 w-4 mr-1" /> WhatsApp</Button>
                <Button size="sm" onClick={printTicket} className="bg-green-600 hover:bg-green-700 text-white h-9"><Printer className="h-4 w-4 mr-1" /> Imprimir</Button>
                <Button size="sm" onClick={closeTicket} className="bg-gray-700 hover:bg-gray-600 text-white h-9">Cerrar</Button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto flex justify-center items-start py-6" style={{ background: 'repeating-linear-gradient(135deg, hsl(var(--muted)) 0 8px, hsl(var(--muted)/0.7) 8px 16px)' }}>
              <div style={{ background: 'white', boxShadow: '0 10px 30px rgba(0,0,0,0.35), 0 2px 6px rgba(0,0,0,0.2)', borderRadius: '3px' }}>
                <TicketVenta ref={ticketRef} venta={lastVenta} detalles={lastDetalles} config={config} />
              </div>
            </div>
          </div>
        </div>
      )}

      <AbrirCajaDialog open={cajaDialogOpen} onClose={() => setCajaDialogOpen(false)} onSuccess={() => { setCajaDialogOpen(false); refetchCaja(); queryClient.invalidateQueries({ queryKey: ['caja-abierta'] }); }} />

      <BarcodeScanner open={scannerOpen} onClose={() => setScannerOpen(false)} onDetected={handleBarcodeScan} continuous title="Escanear producto" feedback={scanFeedback} onFeedbackHide={() => setScanFeedback(null)} miniCart={{ items: carrito, total, sym, mode: 'local' }} onViewCart={() => setScannerOpen(false)} onFinish={() => setScannerOpen(false)} />

      <ProductoNoEncontradoDialog open={!!noEncontradoCode} codigo={noEncontradoCode || ''} onCrear={handleCrearProductoDesdeNoEncontrado} onAsignarExistente={handleAsignarExistenteDesdeNoEncontrado} onReintentar={() => { setNoEncontradoCode(null); setScannerOpen(true); }} onCancelar={() => setNoEncontradoCode(null)} />

      <AsignarCodigoDialog open={asignarOpen} codigo={codigoParaAsignar} productos={productos} onClose={() => { setAsignarOpen(false); setCodigoParaAsignar(''); }} onAsignado={handleCodigoAsignado} />

      <ProductoDialog open={nuevoProdOpen} onClose={() => { setNuevoProdOpen(false); setCodigoParaNuevo(''); }} onSave={handleGuardarNuevoProducto} producto={null} categorias={categorias} proveedores={proveedores} codigoInicial={codigoParaNuevo} />

      <CierreCajaDialog open={cierreOpen} onClose={() => setCierreOpen(false)} cajaAbierta={cajaAbierta} ventas={[]} gastos={[]} onSuccess={() => { setCierreOpen(false); refetchCaja(); ['caja-abierta', 'caja-cortes', 'registros-cortes', 'reportes-generados'].forEach((k) => queryClient.invalidateQueries({ queryKey: [k] })); }} />

      {fiadoOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 no-print" onClick={cerrarFiadoModal}>
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-sm max-h-[85vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h2 className="font-bold text-sm text-foreground">Fiado · {formatMoney(total, sym)}</h2>
              <button onClick={cerrarFiadoModal} aria-label="Cerrar" className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-3 overflow-y-auto">
              {fiadoSelectedCliente ? (
                /* Cliente seleccionado → confirmar */
                <div className="space-y-3">
                  <div className="skeu-card p-3 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-foreground truncate">{fiadoSelectedCliente.nombre}</p>
                      {fiadoSelectedCliente.telefono && <p className="text-xs text-muted-foreground">{fiadoSelectedCliente.telefono}</p>}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-[11px] text-muted-foreground">Saldo actual</p>
                      <p className={`text-sm font-bold tabular-nums ${fiadoSelectedCliente.saldo_pendiente > 0 ? 'text-red-500' : 'text-green-500'}`}>{formatMoney(fiadoSelectedCliente.saldo_pendiente, sym)}</p>
                    </div>
                  </div>
                  <button onClick={() => handleCobroFiado(fiadoSelectedCliente)} disabled={isProcessing || carrito.length === 0} className="skeu-btn-primary w-full h-11 rounded-xl font-black text-sm disabled:opacity-50">
                    {isProcessing ? 'Procesando…' : `Confirmar fiado a ${fiadoSelectedCliente.nombre}`}
                  </button>
                  <button onClick={() => setFiadoSelectedCliente(null)} className="skeu-btn-ghost w-full h-9 rounded-xl font-bold text-xs text-foreground">← Elegir otro cliente</button>
                </div>
              ) : fiadoCreating ? (
                /* Alta inline de cliente (sin límite de crédito) */
                <div className="space-y-2">
                  <input value={fiadoNewNombre} onChange={(e) => setFiadoNewNombre(e.target.value)} placeholder="Nombre *" autoFocus className="skeu-input w-full rounded-md bg-card px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring" />
                  <input value={fiadoNewTelefono} onChange={(e) => setFiadoNewTelefono(e.target.value)} placeholder="Teléfono (opcional)" className="skeu-input w-full rounded-md bg-card px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring" />
                  <input value={fiadoNewNotas} onChange={(e) => setFiadoNewNotas(e.target.value)} placeholder="Notas (opcional)" className="skeu-input w-full rounded-md bg-card px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring" />
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => setFiadoCreating(false)} className="skeu-btn-ghost flex-1 h-10 rounded-xl font-bold text-sm text-foreground">Cancelar</button>
                    <button onClick={handleCrearClienteFiado} disabled={!fiadoNewNombre.trim() || fiadoSavingCliente} className="skeu-btn-primary flex-1 h-10 rounded-xl font-bold text-sm disabled:opacity-50">{fiadoSavingCliente ? 'Guardando…' : 'Guardar'}</button>
                  </div>
                </div>
              ) : (
                /* Buscar / seleccionar cliente existente */
                <>
                  <input
                    value={fiadoSearch}
                    onChange={(e) => setFiadoSearch(e.target.value)}
                    placeholder="Buscar por nombre o teléfono…"
                    className="skeu-input w-full rounded-md bg-card px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring mb-2"
                  />
                  <div className="max-h-60 overflow-y-auto">
                    {(() => {
                      const q = fiadoSearch.toLowerCase().trim();
                      const filtrados = fiadoClientes.filter((c) => !q || c.nombre.toLowerCase().includes(q) || (c.telefono || '').toLowerCase().includes(q));
                      if (filtrados.length === 0) {
                        return <p className="text-sm text-muted-foreground py-3 text-center italic">Sin clientes que coincidan.</p>;
                      }
                      return (
                        <ul className="divide-y divide-border">
                          {filtrados.map((c) => (
                            <li key={c.id}>
                              <button onClick={() => setFiadoSelectedCliente(c)} className="w-full text-left py-2.5 px-2 flex items-center justify-between gap-2 hover:bg-muted/50 rounded-lg">
                                <span className="min-w-0">
                                  <span className="block text-sm font-semibold text-foreground truncate">{c.nombre}</span>
                                  {c.telefono && <span className="block text-xs text-muted-foreground">{c.telefono}</span>}
                                </span>
                                <span className={`text-xs font-bold tabular-nums ${c.saldo_pendiente > 0 ? 'text-red-500' : 'text-green-500'}`}>{formatMoney(c.saldo_pendiente, sym)}</span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      );
                    })()}
                  </div>
                  <button onClick={() => setFiadoCreating(true)} className="skeu-btn-ghost w-full h-10 rounded-xl font-bold text-sm text-foreground mt-2 flex items-center justify-center gap-1.5">
                    <UserPlus className="h-4 w-4" /> Nuevo cliente de fiado
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
