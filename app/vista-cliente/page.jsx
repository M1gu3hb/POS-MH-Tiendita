'use client';

import { useState, useEffect, useMemo } from 'react';
import { formatMoney } from '@/utils/currency';
import { useAuth } from '@/lib/auth/AuthContext';
import { useConfig } from '@/hooks/useConfig';

/**
 * Vista Cliente — pantalla de display (segundo monitor). Pública: puede abrirse
 * sin sesión y hereda las cookies de la pestaña principal del POS.
 *
 * Migrado: la config viene de useConfig (cuando hay sesión); el carrito y la
 * última venta llegan por localStorage + BroadcastChannel (sync mismo dispositivo,
 * datos efímeros de UI, no de negocio). El sync cross-device por Realtime queda
 * como mejora pendiente (ver docs/BUGS_PENDING.md).
 */
export default function VistaClientePage() {
  const [cart, setCart] = useState({ items: [], total: 0, subtotal: 0, descuento: 0, config: null });
  const [lastSale, setLastSale] = useState(null);
  const { authUser } = useAuth();
  const { config: dbConfig } = useConfig();

  const { KEY_CART, KEY_LAST_SALE } = useMemo(() => {
    const scope = authUser?.email ? `::${authUser.email}` : '';
    return { KEY_CART: `pos-mh-cart${scope}`, KEY_LAST_SALE: `pos-mh-last-sale${scope}` };
  }, [authUser?.email]);

  useEffect(() => {
    const interval = setInterval(() => {
      try {
        const cartData = localStorage.getItem(KEY_CART);
        if (cartData) setCart(JSON.parse(cartData));
        const saleData = localStorage.getItem(KEY_LAST_SALE);
        if (saleData) {
          const parsed = JSON.parse(saleData);
          setLastSale((prev) => {
            if (parsed?.venta?.id && parsed.venta.id !== prev?.venta?.id) return parsed;
            return prev || parsed;
          });
        }
      } catch {
        /* noop */
      }
    }, 300);
    return () => clearInterval(interval);
  }, [KEY_CART, KEY_LAST_SALE]);

  useEffect(() => {
    if (!lastSale?.venta?.id) return;
    const timer = setTimeout(() => {
      setLastSale(null);
      try { localStorage.removeItem(KEY_LAST_SALE); } catch { /* noop */ }
    }, 6000);
    return () => clearTimeout(timer);
  }, [lastSale?.venta?.id, KEY_LAST_SALE]);

  const [broadcastSupported] = useState(() => typeof window !== 'undefined' && !!window.BroadcastChannel);

  useEffect(() => {
    if (!broadcastSupported) return;
    try {
      const bc = new BroadcastChannel('pos-mh-channel');
      bc.onmessage = (e) => {
        if (e.data?.type === 'cart') setCart(e.data.payload);
        if (e.data?.type === 'sale') setLastSale(e.data.payload);
        if (e.data?.type === 'reset') {
          setLastSale(null);
          setCart({ items: [], total: 0, subtotal: 0, descuento: 0, config: null });
        }
      };
      return () => bc.close();
    } catch {
      return undefined;
    }
  }, [broadcastSupported]);

  const config = dbConfig || cart.config || lastSale?.config;
  const sym = config?.simbolo_moneda || '$';
  const nombre = config?.nombre_negocio || 'POS MH Tiendita';
  const logo = config?.logo_url;
  const mensaje = config?.mensaje_ticket || '¡Gracias por su compra!';

  const showingSale = lastSale && cart.items.length === 0;
  const hasItems = cart.items.length > 0;

  return (
    <div className="select-none overflow-hidden" style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'linear-gradient(160deg, hsl(220 25% 97%) 0%, hsl(220 20% 93%) 100%)' }}>
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, padding: '14px 24px', background: 'linear-gradient(to bottom, hsl(220 25% 13%), hsl(220 25% 10%))', boxShadow: '0 4px 16px rgba(0,0,0,0.3)' }}>
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logo} alt={nombre} style={{ height: 48, width: 48, borderRadius: 12, objectFit: 'contain', border: '2px solid rgba(255,255,255,0.15)' }} />
        ) : (
          <div style={{ height: 48, width: 48, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 900, color: 'white', background: 'linear-gradient(135deg, hsl(214 80% 58%), hsl(214 80% 42%))' }}>{nombre.charAt(0)}</div>
        )}
        <h1 style={{ fontSize: 28, fontWeight: 900, color: 'white', letterSpacing: '-0.5px' }}>{nombre}</h1>
      </div>

      {logo && (
        <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', zIndex: 0, opacity: 0.03 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logo} alt="" style={{ width: '60vmin', height: '60vmin', objectFit: 'contain' }} />
        </div>
      )}

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative', zIndex: 1 }}>
        {showingSale && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, gap: 24 }}>
            <div style={{ height: 96, width: 96, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48, background: 'linear-gradient(135deg, #22c55e, #16a34a)', boxShadow: '0 8px 24px rgba(34,197,94,0.4)' }}>✓</div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: 4 }}>Total</p>
              <p style={{ fontSize: 72, fontWeight: 900, color: '#0f172a', lineHeight: 1, marginTop: 8, fontVariantNumeric: 'tabular-nums' }}>{formatMoney(lastSale.venta?.total, sym)}</p>
            </div>
            {lastSale.venta?.metodo_pago === 'efectivo' && (lastSale.venta?.cambio || 0) > 0 && (
              <div style={{ borderRadius: 16, padding: '20px 32px', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', textAlign: 'center' }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#15803d', textTransform: 'uppercase', letterSpacing: 3 }}>Su cambio</p>
                <p style={{ fontSize: 56, fontWeight: 900, color: '#16a34a', fontVariantNumeric: 'tabular-nums' }}>{formatMoney(lastSale.venta.cambio, sym)}</p>
              </div>
            )}
            <p style={{ fontSize: 22, fontWeight: 600, color: '#64748b' }}>{mensaje}</p>
          </div>
        )}

        {hasItems && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '16px 24px', gap: 12 }}>
            <div style={{ flex: 1, overflow: 'hidden', borderRadius: 16, background: 'white', boxShadow: '0 8px 32px rgba(0,0,0,0.10)', border: '1px solid rgba(0,0,0,0.08)', display: 'flex', flexDirection: 'column' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', flexShrink: 0 }}>
                <thead>
                  <tr style={{ background: 'hsl(220 25% 13%)' }}>
                    <th style={{ textAlign: 'left', padding: '10px 20px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, color: 'rgba(255,255,255,0.7)' }}>Producto</th>
                    <th style={{ textAlign: 'center', padding: '10px 12px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, color: 'rgba(255,255,255,0.7)', width: 60 }}>Cant.</th>
                    <th style={{ textAlign: 'right', padding: '10px 12px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, color: 'rgba(255,255,255,0.7)', width: 90 }}>Precio</th>
                    <th style={{ textAlign: 'right', padding: '10px 20px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, color: 'rgba(255,255,255,0.7)', width: 110 }}>Subtotal</th>
                  </tr>
                </thead>
              </table>
              <div style={{ flex: 1, overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <tbody>
                    {cart.items.map((item, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                        <td style={{ padding: '12px 20px', fontSize: 16, fontWeight: 600, color: '#1e293b' }}>{item.nombre}</td>
                        <td style={{ padding: '12px 12px', textAlign: 'center', fontSize: 22, fontWeight: 900, color: '#334155', width: 60 }}>{item.cantidad}</td>
                        <td style={{ padding: '12px 12px', textAlign: 'right', fontSize: 13, color: '#64748b', width: 90, fontVariantNumeric: 'tabular-nums' }}>{formatMoney(item.precio, sym)}</td>
                        <td style={{ padding: '12px 20px', textAlign: 'right', fontSize: 18, fontWeight: 700, color: '#0f172a', width: 110, fontVariantNumeric: 'tabular-nums' }}>{formatMoney(item.subtotal, sym)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={{ flexShrink: 0, borderRadius: 16, background: 'white', boxShadow: '0 8px 32px rgba(0,0,0,0.10)', border: '1px solid rgba(0,0,0,0.08)', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                {cart.descuento > 0 && <p style={{ fontSize: 13, color: '#ef4444', fontWeight: 600, marginBottom: 2 }}>Descuento: −{formatMoney(cart.descuento, sym)}</p>}
                <p style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 3 }}>Total</p>
              </div>
              <p style={{ fontSize: 56, fontWeight: 900, color: '#0f172a', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{formatMoney(cart.total, sym)}</p>
            </div>
          </div>
        )}

        {!hasItems && !showingSale && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24 }}>
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logo} alt={nombre} style={{ height: 120, width: 120, borderRadius: 24, objectFit: 'contain', opacity: 0.25 }} />
            ) : (
              <div style={{ height: 120, width: 120, borderRadius: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48, fontWeight: 900, color: '#cbd5e1', background: 'rgba(0,0,0,0.04)' }}>{nombre.charAt(0)}</div>
            )}
            <p style={{ fontSize: 28, fontWeight: 700, color: '#94a3b8' }}>{nombre}</p>
            <p style={{ fontSize: 18, color: '#94a3b8' }}>Esperando venta...</p>
          </div>
        )}
      </div>
    </div>
  );
}
