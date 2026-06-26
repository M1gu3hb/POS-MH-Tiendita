'use client';

import { useState, useEffect, useMemo } from 'react';
import { formatMoney } from '@/utils/currency';
import { useAuth } from '@/lib/auth/AuthContext';
import { useConfig } from '@/hooks/useConfig';
import { useNegocio } from '@/hooks/useNegocio';

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
  const { negocio } = useNegocio();

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
  // El nombre real del negocio vive en `negocios.nombre` (vía useNegocio), NO en
  // configuracion_negocio. Fallbacks por si la vista se abre sin sesión.
  const nombre = negocio?.nombre || config?.nombre_negocio || 'POS MH Tiendita';
  const logo = config?.logo_url;
  const mensaje = config?.mensaje_ticket || '¡Gracias por su compra!';
  // Iniciales del avatar: primeras letras de cada palabra (máx 2, mayúsculas) —
  // mismas que el sidebar. Fallback "MH" si aún no carga el nombre.
  const iniciales = (() => {
    const n = (negocio?.nombre || '').trim();
    if (!n) return 'MH';
    const palabras = n.split(/\s+/).filter(Boolean);
    if (palabras.length >= 2) return (palabras[0][0] + palabras[1][0]).toUpperCase();
    return n.slice(0, 2).toUpperCase();
  })();

  const showingSale = lastSale && cart.items.length === 0;
  const hasItems = cart.items.length > 0;

  return (
    <div className="select-none overflow-hidden" style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'linear-gradient(160deg, hsl(220 25% 97%) 0%, hsl(220 20% 93%) 100%)' }}>
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, padding: '14px 24px', background: 'linear-gradient(to bottom, hsl(220 25% 13%), hsl(220 25% 10%))', boxShadow: '0 4px 16px rgba(0,0,0,0.3)' }}>
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logo} alt={nombre} style={{ height: 56, width: 56, borderRadius: 14, objectFit: 'contain', border: '2px solid rgba(255,255,255,0.15)' }} />
        ) : (
          <div style={{ height: 56, width: 56, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, fontWeight: 900, color: 'white', background: 'linear-gradient(135deg, hsl(214 80% 58%), hsl(214 80% 42%))' }}>{iniciales}</div>
        )}
        <h1 style={{ fontSize: 'clamp(1.75rem, 2.6vw, 2.5rem)', fontWeight: 900, color: 'white', letterSpacing: '-0.5px' }}>{nombre}</h1>
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
                    <th style={{ textAlign: 'left', padding: '14px 24px', fontSize: 15, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'rgba(255,255,255,0.75)' }}>Producto</th>
                    <th style={{ textAlign: 'center', padding: '14px 12px', fontSize: 15, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'rgba(255,255,255,0.75)', width: 110 }}>Cant.</th>
                    <th style={{ textAlign: 'right', padding: '14px 16px', fontSize: 15, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'rgba(255,255,255,0.75)', width: 180 }}>Precio</th>
                    <th style={{ textAlign: 'right', padding: '14px 24px', fontSize: 15, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'rgba(255,255,255,0.75)', width: 220 }}>Subtotal</th>
                  </tr>
                </thead>
              </table>
              <div style={{ flex: 1, overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <tbody>
                    {cart.items.map((item, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                        <td style={{ padding: '18px 24px', fontSize: 'clamp(1.5rem, 2.2vw, 2.1rem)', fontWeight: 700, color: '#1e293b' }}>{item.nombre}</td>
                        <td style={{ padding: '18px 12px', textAlign: 'center', fontSize: 'clamp(1.5rem, 2.2vw, 2.1rem)', fontWeight: 900, color: '#334155', width: 110 }}>{item.cantidad}</td>
                        <td style={{ padding: '18px 16px', textAlign: 'right', fontSize: 'clamp(1.1rem, 1.7vw, 1.6rem)', color: '#475569', width: 180, fontVariantNumeric: 'tabular-nums' }}>{formatMoney(item.precio, sym)}</td>
                        <td style={{ padding: '18px 24px', textAlign: 'right', fontSize: 'clamp(1.5rem, 2.2vw, 2.1rem)', fontWeight: 800, color: '#0f172a', width: 220, fontVariantNumeric: 'tabular-nums' }}>{formatMoney(item.subtotal, sym)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={{ flexShrink: 0, borderRadius: 16, background: 'white', boxShadow: '0 8px 32px rgba(0,0,0,0.10)', border: '1px solid rgba(0,0,0,0.08)', padding: '20px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                {cart.descuento > 0 && <p style={{ fontSize: 18, color: '#ef4444', fontWeight: 700, marginBottom: 4 }}>Descuento: −{formatMoney(cart.descuento, sym)}</p>}
                <p style={{ fontSize: 'clamp(1.25rem, 1.8vw, 1.75rem)', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 3 }}>Total</p>
              </div>
              <p style={{ fontSize: 'clamp(3.5rem, 8vw, 7rem)', fontWeight: 900, color: '#0f172a', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{formatMoney(cart.total, sym)}</p>
            </div>
          </div>
        )}

        {!hasItems && !showingSale && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 28 }}>
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logo} alt={nombre} style={{ height: 160, width: 160, borderRadius: 28, objectFit: 'contain', opacity: 0.35 }} />
            ) : (
              <div style={{ height: 160, width: 160, borderRadius: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 64, fontWeight: 900, color: '#cbd5e1', background: 'rgba(0,0,0,0.04)' }}>{iniciales}</div>
            )}
            <p style={{ fontSize: 'clamp(2rem, 3vw, 2.75rem)', fontWeight: 800, color: '#475569' }}>{nombre}</p>
            <p style={{ fontSize: 'clamp(1.5rem, 2.4vw, 2rem)', color: '#94a3b8' }}>Esperando venta…</p>
          </div>
        )}
      </div>
    </div>
  );
}
