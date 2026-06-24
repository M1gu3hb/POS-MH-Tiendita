/**
 * Tipos de dominio de la base de datos (POS MH Tiendita).
 *
 * Fuente de verdad: supabase/migrations/001_initial_schema.sql.
 *
 * Decisión (ver docs/DECISIONS.md): en lugar de generar el tipo `Database`
 * con `supabase gen types` (requiere una BD viva, fuera de alcance en la
 * migración "solo archivos"), declaramos a mano los tipos de fila por
 * entidad y los usamos con `.returns<T>()` en la capa de repositorio.
 * Esto mantiene el código libre de `any`. Se puede sustituir por los tipos
 * generados más adelante sin tocar los repositorios.
 */

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

// ── Enums (string literal unions) ────────────────────────────
export type Rol = 'dueno' | 'cajero' | 'admin';
export type Plan = 'trial' | 'basico' | 'pro' | 'enterprise';
export type UnidadVenta =
  | 'pieza' | 'caja' | 'paquete' | 'kg' | 'gramos' | 'litro' | 'mililitro' | 'metro' | 'otro';
export type UnidadCompra = 'pieza' | 'caja' | 'paquete' | 'kg' | 'litro' | 'otro';
export type EstadoCorte = 'abierta' | 'cerrada';
export type EstadoVenta = 'abierta' | 'pagada' | 'cancelada';
export type MetodoPagoVenta = 'efectivo' | 'tarjeta' | 'transferencia' | 'mixto';
export type MetodoPagoSimple = 'efectivo' | 'tarjeta' | 'transferencia' | 'otro';
export type TipoMovimiento =
  | 'entrada_compra' | 'salida_venta' | 'ajuste' | 'merma' | 'devolucion' | 'cancelacion';
export type CategoriaGasto =
  | 'luz' | 'renta' | 'agua' | 'internet' | 'sueldos' | 'mantenimiento'
  | 'bolsas' | 'transporte' | 'comisiones' | 'otro';
export type EstadoCarrito = 'activo' | 'cerrado' | 'cancelado';
export type SourceDevice = 'mobile_scanner' | 'desktop_pos' | 'other';
export type EstadoScan = 'pendiente' | 'procesado' | 'error' | 'descartado';
export type EstadoSuscripcion =
  | 'sin_suscripcion' | 'trialing' | 'active' | 'past_due' | 'unpaid'
  | 'canceled' | 'incomplete' | 'incomplete_expired' | 'paused';
export type TipoReporte =
  | 'corte_caja' | 'resumen_financiero' | 'ventas_periodo' | 'compras' | 'gastos' | 'inventario';
export type EstadoReporte = 'generado' | 'cancelado';

// ── Filas (Row types) ────────────────────────────────────────

export interface Negocio {
  id: string;
  nombre: string;
  slug: string | null;
  plan: Plan;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export interface Usuario {
  id: string;
  auth_user_id: string | null;
  negocio_id: string | null;
  nombre_visible: string;
  rol: Rol;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export interface Sucursal {
  id: string;
  negocio_id: string;
  nombre: string;
  direccion: string | null;
  activa: boolean;
  created_at: string;
}

export interface ConfiguracionNegocio {
  id: string;
  negocio_id: string;
  logo_url: string | null;
  background_logo_url: string | null;
  color_primario: string;
  color_secundario: string;
  telefono: string | null;
  whatsapp: string | null;
  correo: string | null;
  direccion: string | null;
  moneda: string;
  simbolo_moneda: string;
  mensaje_ticket: string;
  colorear_importes_monetarios: boolean;
  permitir_venta_sin_stock: boolean;
  activar_mayoreo: boolean;
  activar_descuentos: boolean;
  vista_cliente_activa: boolean;
  abrir_caja_obligatorio: boolean;
  iva_porcentaje: number;
  mostrar_logo_ticket: boolean;
  updated_at: string;
}

export interface CategoriaProducto {
  id: string;
  negocio_id: string;
  nombre: string;
  color: string;
  icono: string;
  activa: boolean;
  orden: number;
  created_at: string;
}

export interface Proveedor {
  id: string;
  negocio_id: string;
  nombre: string;
  contacto: string | null;
  telefono: string | null;
  whatsapp: string | null;
  correo: string | null;
  notas: string | null;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export interface Producto {
  id: string;
  negocio_id: string;
  categoria_id: string | null;
  proveedor_id: string | null;
  nombre: string;
  marca: string | null;
  descripcion: string | null;
  imagen_url: string | null;
  sku: string | null;
  codigo_barras: string | null;
  unidad_venta: UnidadVenta;
  precio_venta: number;
  costo_unitario: number;
  stock_actual: number;
  stock_minimo: number;
  stock_maximo: number;
  precio_mayoreo: number;
  cantidad_minima_mayoreo: number;
  activo: boolean;
  permite_venta_sin_stock: boolean;
  notas: string | null;
  created_at: string;
  updated_at: string;
}

export interface CorteCaja {
  id: string;
  negocio_id: string;
  sucursal_id: string | null;
  cajero_id: string | null;
  cajero_nombre: string;
  fecha_apertura: string;
  fecha_cierre: string | null;
  estado: EstadoCorte;
  fondo_inicial: number;
  efectivo_esperado: number;
  efectivo_contado: number;
  diferencia: number;
  efectivo_dejado_en_caja: number;
  efectivo_retirado: number;
  total_ventas: number;
  total_efectivo: number;
  total_tarjeta: number;
  total_transferencia: number;
  total_gastos: number;
  utilidad_bruta: number;
  utilidad_neta_estimada: number;
  numero_ventas: number;
  ticket_promedio: number;
  notas: string | null;
  created_at: string;
}

export interface Venta {
  id: string;
  negocio_id: string;
  sucursal_id: string | null;
  corte_id: string | null;
  cajero_id: string | null;
  cajero_nombre: string;
  folio: string;
  fecha: string;
  estado: EstadoVenta;
  subtotal: number;
  descuento_total: number;
  total: number;
  costo_total_snapshot: number;
  utilidad_bruta_snapshot: number;
  margen_snapshot: number;
  metodo_pago: MetodoPagoVenta;
  monto_efectivo: number;
  monto_tarjeta: number;
  monto_transferencia: number;
  monto_recibido: number;
  cambio: number;
  notas: string | null;
  motivo_cancelacion: string | null;
  created_at: string;
}

export interface DetalleVenta {
  id: string;
  venta_id: string;
  negocio_id: string;
  producto_id: string | null;
  producto_nombre: string;
  sku: string | null;
  codigo_barras: string | null;
  cantidad: number;
  unidad_venta: string | null;
  precio_unitario_snapshot: number;
  costo_unitario_snapshot: number;
  subtotal: number;
  descuento: number;
  total: number;
  utilidad_snapshot: number;
}

export interface CompraMercancia {
  id: string;
  negocio_id: string;
  proveedor_id: string | null;
  proveedor_nombre: string;
  usuario_id: string | null;
  usuario_nombre: string | null;
  fecha: string;
  total: number;
  metodo_pago: MetodoPagoSimple;
  notas: string | null;
  created_at: string;
}

export interface DetalleCompra {
  id: string;
  compra_id: string;
  negocio_id: string;
  producto_id: string | null;
  producto_nombre: string;
  cantidad_compra: number;
  unidad_compra: UnidadCompra;
  piezas_por_caja: number;
  cantidad_stock_agregada: number;
  costo_unitario: number;
  costo_total: number;
}

export interface MovimientoInventario {
  id: string;
  negocio_id: string;
  producto_id: string | null;
  producto_nombre: string;
  usuario_id: string | null;
  usuario_nombre: string | null;
  tipo_movimiento: TipoMovimiento;
  cantidad: number;
  unidad: string | null;
  stock_anterior: number;
  stock_nuevo: number;
  costo_unitario: number;
  referencia_tipo: string | null;
  referencia_id: string | null;
  motivo: string | null;
  fecha: string;
}

export interface GastoOperativo {
  id: string;
  negocio_id: string;
  corte_id: string | null;
  usuario_id: string | null;
  usuario_nombre: string | null;
  concepto: string;
  categoria: CategoriaGasto;
  monto: number;
  fecha: string;
  metodo_pago: MetodoPagoSimple;
  notas: string | null;
  recurrente: boolean;
  created_at: string;
}

export interface CarritoActivo {
  id: string;
  negocio_id: string;
  corte_id: string | null;
  cajero_id: string | null;
  estado: EstadoCarrito;
  total: number;
  subtotal: number;
  descuento_total: number;
  cantidad_items: number;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface CarritoItem {
  id: string;
  carrito_id: string;
  negocio_id: string;
  producto_id: string | null;
  producto_nombre: string;
  sku: string | null;
  codigo_barras: string | null;
  cantidad: number;
  precio_unitario: number;
  costo_unitario: number;
  descuento: number;
  subtotal: number;
  es_mayoreo: boolean;
}

export interface ScanEvent {
  id: string;
  negocio_id: string;
  corte_id: string | null;
  device_id: string | null;
  source_device: SourceDevice;
  codigo_barras: string;
  producto_id: string | null;
  producto_nombre: string | null;
  cantidad: number;
  precio_unitario: number;
  estado: EstadoScan;
  usuario_id: string | null;
  error_msg: string | null;
  created_at: string;
}

export interface Suscripcion {
  id: string;
  negocio_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_checkout_session_id: string | null;
  stripe_price_id: string | null;
  estado: EstadoSuscripcion;
  trial_inicio: string | null;
  trial_fin: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  ultimo_pago_estado: string | null;
  ultimo_error_pago: string | null;
  trial_usado: boolean;
  updated_at: string;
}

export interface ReporteGenerado {
  id: string;
  negocio_id: string;
  usuario_id: string | null;
  usuario_nombre: string | null;
  tipo: TipoReporte;
  titulo: string;
  periodo_inicio: string | null;
  periodo_fin: string | null;
  referencia_tipo: string | null;
  referencia_id: string | null;
  estado: EstadoReporte;
  total_ventas: number;
  costo_venta: number;
  utilidad_bruta: number;
  gastos_operativos: number;
  compras_mercancia: number;
  utilidad_neta: number;
  datos_snapshot: Json | null;
  created_at: string;
}

export interface AuditLog {
  id: string;
  negocio_id: string;
  usuario_id: string | null;
  usuario_nombre: string | null;
  accion: string;
  entidad: string;
  entidad_id: string | null;
  payload: Json | null;
  ip: string | null;
  created_at: string;
}

// ── Helpers de Insert/Update ─────────────────────────────────
// Campos que la BD genera o defaultea y que normalmente NO se envían al insertar.
type Generated = 'id' | 'created_at' | 'updated_at';

/** Datos para insertar una fila: todo menos los campos autogenerados; los que tienen DEFAULT son opcionales vía Partial en cada repo. */
export type Insert<T> = Omit<T, Generated>;

/** Datos para actualizar una fila: subconjunto parcial del Row sin campos autogenerados. */
export type Update<T> = Partial<Omit<T, Generated>>;
