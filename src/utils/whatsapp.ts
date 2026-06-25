import { formatMoney } from '@/utils/currency';

/**
 * Genera el texto plano del ticket de venta para compartir por WhatsApp.
 * Pensado para abrirse con `https://wa.me/?text=<encodeURIComponent(mensaje)>`
 * (en móvil abre la app; en escritorio, WhatsApp Web).
 *
 * Texto plano legible, con emojis simples (🛒 📋 💰). No depende de Supabase ni
 * de React: recibe los datos ya cargados (venta, items, config) desde el POS.
 */

interface TicketItem {
  producto_nombre?: string | null;
  cantidad?: number | null;
  precio_unitario_snapshot?: number | null;
  subtotal?: number | null;
  total?: number | null;
}

interface TicketVentaData {
  folio?: string | null;
  fecha?: string | null;
  total?: number | null;
  metodo_pago?: string | null;
  monto_recibido?: number | null;
  cambio?: number | null;
}

interface TicketConfig {
  nombre?: string | null;
  simbolo_moneda?: string | null;
  mensaje_ticket?: string | null;
}

function formatFechaHora(fecha?: string | null): string {
  const d = fecha ? new Date(fecha) : new Date();
  const dia = d.toLocaleDateString('es-MX');
  const hora = d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  return `${dia} ${hora}`;
}

function capitalizar(texto?: string | null): string {
  if (!texto) return '';
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export function generarMensajeTicket(
  venta: TicketVentaData,
  items: TicketItem[],
  config?: TicketConfig | null,
  negocioNombre?: string | null,
): string {
  const sym = config?.simbolo_moneda || '$';
  const money = (n?: number | null): string => formatMoney(n ?? 0, sym);
  // El nombre real del negocio vive en `negocios.nombre` (no en configuracion_negocio).
  // Se recibe como parámetro explícito; `config.nombre` queda como fallback histórico.
  const nombreNegocio = negocioNombre || config?.nombre || 'Mi Tienda';

  const lineas: string[] = [];
  lineas.push(`🛒 *${nombreNegocio}*`);
  lineas.push(`📋 Ticket: ${venta?.folio ?? '-'}`);
  lineas.push(`Fecha: ${formatFechaHora(venta?.fecha)}`);
  lineas.push('');

  for (const item of items ?? []) {
    const cantidad = item?.cantidad ?? 1;
    const nombre = item?.producto_nombre ?? 'Producto';
    const precioUnit = money(item?.precio_unitario_snapshot);
    const sub = money(item?.subtotal ?? item?.total);
    lineas.push(`• ${nombre} x${cantidad} — ${precioUnit} c/u = ${sub}`);
  }
  lineas.push('');

  lineas.push(`💰 *Total: ${money(venta?.total)}*`);
  lineas.push(`Pago: ${capitalizar(venta?.metodo_pago) || '-'}`);
  if (venta?.metodo_pago === 'efectivo' && (venta?.cambio ?? 0) > 0) {
    lineas.push(`Recibido: ${money(venta?.monto_recibido)}`);
    lineas.push(`Cambio: ${money(venta?.cambio)}`);
  }

  lineas.push('');
  lineas.push(config?.mensaje_ticket || '¡Gracias por su compra!');

  return lineas.join('\n');
}
