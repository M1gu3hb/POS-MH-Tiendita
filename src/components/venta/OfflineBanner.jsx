'use client';

/**
 * Aviso de modo offline / sincronización para la pantalla de venta.
 * - sincronizando: barra azul "🔄 Sincronizando [n] ventas pendientes...".
 * - sin conexión: barra amarilla de aviso.
 * No renderiza nada cuando hay conexión y no se está sincronizando.
 */
export default function OfflineBanner({ isOffline, sincronizando, ventasPendientes = 0 }) {
  if (sincronizando) {
    return (
      <div className="w-full bg-blue-500 text-white text-sm font-semibold text-center py-2 px-3">
        🔄 Sincronizando {ventasPendientes} {ventasPendientes === 1 ? 'venta pendiente' : 'ventas pendientes'}...
      </div>
    );
  }
  if (isOffline) {
    return (
      <div className="w-full bg-yellow-400 text-yellow-950 text-sm font-semibold text-center py-2 px-3">
        ⚠️ Sin conexión — Las ventas se guardarán y sincronizarán al recuperar internet
      </div>
    );
  }
  return null;
}
