'use client';

import { useAuth } from '@/lib/auth/AuthContext';
import { Sparkles, Info, ShieldCheck, ScanLine, Smartphone, Package, FileText, CreditCard, Headphones, Check } from 'lucide-react';
import { LEGAL_CONFIG } from '@/utils/legalConfig';

/**
 * Página de Suscripción — MODO PAUSA TEMPORAL (igual que el original).
 * El cobro en línea está desactivado mientras Stripe no se use en producción.
 */
export default function SuscripcionPage() {
  const { authUser } = useAuth();

  const beneficios = [
    { icon: CreditCard, text: 'Punto de venta completo' },
    { icon: Package, text: 'Productos e inventario' },
    { icon: FileText, text: 'Caja, cortes y tickets imprimibles' },
    { icon: FileText, text: 'Reportes de ventas, gastos y utilidad' },
    { icon: ScanLine, text: 'Escáner con cámara' },
    { icon: Smartphone, text: 'Teléfono como escáner remoto' },
    { icon: ShieldCheck, text: 'Datos privados y aislados por cuenta' },
    { icon: Headphones, text: 'Soporte por WhatsApp y correo' },
  ];

  return (
    <div className="p-3 md:p-6 space-y-4 max-w-3xl mx-auto pb-24 lg:pb-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Sparkles className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Suscripción</h1>
          <p className="text-xs text-muted-foreground">Estado del cobro en línea</p>
        </div>
      </div>

      <div className="skeu-panel p-4 sm:p-5 flex items-start gap-3 bg-amber-50 dark:bg-amber-500/10">
        <Info className="h-6 w-6 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1">
          <p className="text-base font-bold text-amber-800 dark:text-amber-300">Cobro en línea pendiente de activación</p>
          <p className="text-sm text-amber-900/80 dark:text-amber-200/80 mt-1">
            Stripe está pendiente de configuración. El cobro mensual todavía no está activo.
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Mientras tanto puedes usar el POS sin restricciones: vender, registrar productos,
            controlar inventario, abrir y cerrar caja, generar reportes y usar el escáner.
          </p>
          {authUser?.email && (
            <p className="text-[11px] text-muted-foreground mt-2">Cuenta: <strong>{authUser.email}</strong></p>
          )}
        </div>
      </div>

      <div className="skeu-panel p-5 sm:p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Plan previsto</p>
            <h2 className="text-xl font-bold text-foreground">{LEGAL_CONFIG.appName}</h2>
          </div>
          <div className="text-right">
            <p className="text-3xl font-extrabold text-muted-foreground">—</p>
            <p className="text-xs text-muted-foreground">Precio por definir</p>
          </div>
        </div>

        <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
          Cuando se active el cobro en línea, podrás iniciar tu prueba gratis y administrar
          tu método de pago desde esta misma sección.
        </p>

        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {beneficios.map((b, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-foreground">
              <Check className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
              <span>{b.text}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
