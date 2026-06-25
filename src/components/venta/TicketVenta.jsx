'use client';
import { forwardRef, useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { formatMoney } from '@/utils/currency';

const TicketVenta = forwardRef(({ venta, detalles, config }, ref) => {
  const sym = config?.simbolo_moneda || '$';
  const fecha = venta?.fecha ? new Date(venta.fecha) : new Date();
  const [qrDataUrl, setQrDataUrl] = useState('');

  useEffect(() => {
    const url = config?.qr_url?.trim();
    let cancelled = false;
    if (!url) {
      setQrDataUrl('');
      return () => { cancelled = true; };
    }
    QRCode.toDataURL(url, { width: 80, margin: 1 })
      .then((dataUrl) => {
        if (!cancelled) setQrDataUrl(dataUrl);
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl('');
      });
    return () => { cancelled = true; };
  }, [config?.qr_url]);

  const row = (left, right, bold = false) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px', fontWeight: bold ? 'bold' : 'normal' }}>
      <span>{left}</span>
      <span>{right}</span>
    </div>
  );

  return (
    <div
      ref={ref}
      className="ticket-printable"
      style={{
        width: '80mm',
        maxWidth: '80mm',
        minWidth: '80mm',
        fontFamily: "'Courier New', Courier, monospace",
        fontSize: '11px',
        lineHeight: '1.4',
        padding: '4mm',
        background: 'white',
        color: '#000',
        boxSizing: 'border-box',
        margin: 0,
      }}
    >
      {/* ===== HEADER ===== */}
      <div style={{ textAlign: 'center', marginBottom: '6px' }}>
        {config?.mostrar_logo_ticket && config?.logo_url && (
          <img
            src={config.logo_url}
            alt=""
            style={{ height: '40px', maxWidth: '60mm', margin: '0 auto 4px', display: 'block', objectFit: 'contain' }}
          />
        )}
        <div style={{ fontWeight: '900', fontSize: '14px', letterSpacing: '0.5px' }}>
          {config?.nombre_negocio || 'Mi Tienda'}
        </div>
        {config?.direccion && (
          <div style={{ fontSize: '9px', marginTop: '2px' }}>{config.direccion}</div>
        )}
        {config?.telefono && (
          <div style={{ fontSize: '9px' }}>Tel: {config.telefono}</div>
        )}
        {config?.whatsapp && (
          <div style={{ fontSize: '9px' }}>WhatsApp: {config.whatsapp}</div>
        )}
      </div>

      <div style={{ borderTop: '1px dashed #555', margin: '4px 0' }} />

      {/* ===== META ===== */}
      <div style={{ fontSize: '10px' }}>
        <div><strong>Folio:</strong> {venta?.folio}</div>
        <div><strong>Fecha:</strong> {fecha.toLocaleDateString('es-MX')} {fecha.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</div>
        <div><strong>Cajero:</strong> {venta?.cajero_nombre || '-'}</div>
      </div>

      <div style={{ borderTop: '1px dashed #555', margin: '4px 0' }} />

      {/* ===== ITEMS ===== */}
      <table style={{ width: '100%', fontSize: '10px', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
        <colgroup>
          <col style={{ width: '44%' }} />
          <col style={{ width: '12%' }} />
          <col style={{ width: '20%' }} />
          <col style={{ width: '24%' }} />
        </colgroup>
        <thead>
          <tr style={{ borderBottom: '1px solid #000' }}>
            <th style={{ textAlign: 'left', paddingBottom: '2px', fontWeight: 'bold' }}>Producto</th>
            <th style={{ textAlign: 'center', paddingBottom: '2px', fontWeight: 'bold' }}>Cant</th>
            <th style={{ textAlign: 'right', paddingBottom: '2px', fontWeight: 'bold' }}>P.U.</th>
            <th style={{ textAlign: 'right', paddingBottom: '2px', fontWeight: 'bold' }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {(detalles || []).map((d, i) => {
            const nombre = d.producto_nombre || '';
            // Partir nombre cada ~20 caracteres
            const lineas = [];
            for (let j = 0; j < nombre.length; j += 20) lineas.push(nombre.slice(j, j + 20));
            if (lineas.length === 0) lineas.push('');
            return (
              <tr key={i} style={{ verticalAlign: 'top' }}>
                <td style={{ paddingTop: '2px', paddingRight: '2px', wordBreak: 'break-word' }}>
                  {lineas.map((l, k) => <div key={k}>{l}</div>)}
                </td>
                <td style={{ textAlign: 'center', paddingTop: '2px' }}>{d.cantidad}</td>
                <td style={{ textAlign: 'right', paddingTop: '2px' }}>{formatMoney(d.precio_unitario_snapshot, sym)}</td>
                <td style={{ textAlign: 'right', paddingTop: '2px', fontWeight: '600' }}>{formatMoney(d.total, sym)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div style={{ borderTop: '1px dashed #555', margin: '4px 0' }} />

      {/* ===== TOTALS ===== */}
      <div style={{ fontSize: '11px' }}>
        {row('Subtotal:', formatMoney(venta?.subtotal, sym))}
        {(venta?.descuento_total || 0) > 0 && row('Descuento:', `−${formatMoney(venta.descuento_total, sym)}`)}
      </div>

      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginTop: '4px', padding: '3px 0', borderTop: '2px solid #000', borderBottom: '2px solid #000',
        fontWeight: '900', fontSize: '14px',
      }}>
        <span>TOTAL:</span>
        <span>{formatMoney(venta?.total, sym)}</span>
      </div>

      {/* ===== PAYMENT ===== */}
      <div style={{ fontSize: '10px', marginTop: '4px' }}>
        <div>Forma de pago: <strong style={{ textTransform: 'capitalize' }}>
          {venta?.metodo_pago === 'fiado'
            ? `Fiado${venta?.fiado_cliente_nombre ? ` - ${venta.fiado_cliente_nombre}` : ''}`
            : venta?.metodo_pago}
        </strong></div>
        {venta?.metodo_pago === 'efectivo' && (venta?.monto_recibido || 0) > 0 && (
          <>
            <div>Recibido: {formatMoney(venta.monto_recibido, sym)}</div>
            <div style={{ fontWeight: 'bold' }}>Cambio: {formatMoney(venta.cambio || 0, sym)}</div>
          </>
        )}
        {venta?.metodo_pago === 'tarjeta' && venta?.monto_tarjeta > 0 && (
          <div>Tarjeta: {formatMoney(venta.monto_tarjeta, sym)}</div>
        )}
        {venta?.metodo_pago === 'transferencia' && venta?.monto_transferencia > 0 && (
          <div>Transferencia: {formatMoney(venta.monto_transferencia, sym)}</div>
        )}
        {venta?.metodo_pago === 'mixto' && (
          <>
            {(venta.monto_efectivo || 0) > 0 && <div>Efectivo: {formatMoney(venta.monto_efectivo, sym)}</div>}
            {(venta.monto_tarjeta || 0) > 0 && <div>Tarjeta: {formatMoney(venta.monto_tarjeta, sym)}</div>}
            {(venta.monto_transferencia || 0) > 0 && <div>Transferencia: {formatMoney(venta.monto_transferencia, sym)}</div>}
          </>
        )}
      </div>

      <div style={{ borderTop: '1px dashed #555', margin: '6px 0' }} />

      {/* ===== FOOTER ===== */}
      <div style={{ textAlign: 'center', fontSize: '11px', fontWeight: '600' }}>
        {config?.mensaje_ticket || '¡Gracias por su compra!'}
      </div>
      {config?.qr_url && qrDataUrl && (
        <div style={{ textAlign: 'center', marginTop: '6px' }}>
          <img src={qrDataUrl} alt="" style={{ width: '80px', height: '80px', margin: '0 auto', display: 'block' }} />
          <div style={{ fontSize: '9px', marginTop: '2px' }}>Síguenos / Contáctanos</div>
        </div>
      )}
    </div>
  );
});

TicketVenta.displayName = 'TicketVenta';
export default TicketVenta;
