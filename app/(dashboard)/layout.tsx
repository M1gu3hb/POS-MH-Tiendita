'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import {
  LayoutDashboard, ShoppingCart, Package, Warehouse,
  ClipboardList, Settings, ChevronLeft, ChevronRight,
  Menu, X, Landmark, ShoppingBag, ScanLine, UserCircle, CreditCard,
} from 'lucide-react';
import ThemeToggle from '@/components/layout/ThemeToggle';
import MobileQuickNav from '@/components/layout/MobileQuickNav';
import { useTheme } from '@/hooks/useTheme';
import { useConfig } from '@/hooks/useConfig';
import { useNegocio } from '@/hooks/useNegocio';
import { useCajaAbierta } from '@/hooks/useCajaAbierta';
import { Button } from '@/components/ui/button';

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/venta', label: 'Punto de Venta', icon: ShoppingCart },
  { path: '/escaner', label: 'Escáner', icon: ScanLine },
  { path: '/caja', label: 'Caja', icon: Landmark },
  { path: '/fiado', label: 'Fiado', icon: CreditCard },
  { path: '/productos', label: 'Productos', icon: Package },
  { path: '/inventario', label: 'Inventario', icon: Warehouse },
  { path: '/egresos', label: 'Compras y Gastos', icon: ShoppingBag },
  { path: '/registros', label: 'Registros', icon: ClipboardList },
  { path: '/configuracion', label: 'Configuración', icon: Settings },
  { path: '/cuenta', label: 'Cuenta', icon: UserCircle },
  { path: '/suscripcion', label: 'Suscripción', icon: CreditCard },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { theme, toggleTheme } = useTheme();
  const { config } = useConfig();
  const { negocio } = useNegocio();
  const { cajaAbierta } = useCajaAbierta();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const logo = config?.logo_url;
  // El nombre del negocio vive en `negocios.nombre` (no en configuracion_negocio).
  // useNegocio lo lee por la capa de datos (src/lib/db/configuracion.ts), sin
  // consultar Supabase directamente desde el layout. Fallback 'POS MH' mientras carga.
  const nombre = negocio?.nombre || 'POS MH';

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mobileOpen]);
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-[2px] z-40 lg:hidden animate-in fade-in duration-200"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed lg:relative z-50 h-full flex flex-col transition-all duration-300 ease-in-out ${collapsed ? 'w-[68px]' : 'w-60'} ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
        style={{
          background: 'hsl(var(--sidebar-background))',
          borderRight: '1px solid hsl(var(--sidebar-border))',
          boxShadow: '2px 0 12px rgba(0,0,0,0.15)',
        }}
      >
        <div
          className={`flex items-center gap-3 px-3 h-16 flex-shrink-0 ${collapsed ? 'justify-center' : ''}`}
          style={{ borderBottom: '1px solid hsl(var(--sidebar-border))' }}
        >
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} alt={nombre} className="h-9 w-9 rounded-xl object-contain flex-shrink-0 ring-2 ring-white/10" />
          ) : (
            <div
              className="h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{
                background: 'linear-gradient(135deg, hsl(214 80% 58%), hsl(214 80% 42%))',
                boxShadow: '0 2px 8px rgba(37,99,235,0.5), 0 1px 0 rgba(255,255,255,0.1) inset',
              }}
            >
              <span className="text-white font-black text-sm">MH</span>
            </div>
          )}
          {!collapsed && (
            <span className="font-bold text-sm truncate flex-1" style={{ color: 'hsl(var(--sidebar-foreground))' }}>
              {nombre}
            </span>
          )}
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden h-8 w-8 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors"
            style={{ color: 'hsl(var(--sidebar-foreground))' }}
            aria-label="Cerrar menú"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto scrollbar-hide">
          {navItems.map((item) => {
            const isActive = pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path));
            const isCaja = item.path === '/caja';
            const Icon = item.icon;

            return (
              <Link
                key={item.path}
                href={item.path}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 relative ${collapsed ? 'justify-center' : ''}`}
                style={
                  isActive
                    ? {
                        background: 'linear-gradient(to right, hsl(214 80% 52%), hsl(214 80% 44%))',
                        color: 'white',
                        boxShadow: '0 2px 8px rgba(37,99,235,0.4), 0 1px 0 rgba(255,255,255,0.15) inset',
                      }
                    : { color: 'hsl(var(--sidebar-foreground))', opacity: 0.7 }
                }
                title={collapsed ? item.label : undefined}
              >
                <Icon className="flex-shrink-0" style={{ height: '18px', width: '18px' }} />
                {!collapsed && <span className="flex-1">{item.label}</span>}
                {isCaja && !collapsed && (
                  <span className={`h-2 w-2 rounded-full flex-shrink-0 ${cajaAbierta ? 'bg-green-400' : 'bg-amber-400'}`} />
                )}
              </Link>
            );
          })}
        </nav>

        {!collapsed && (
          <div className="px-3 pb-2">
            <div
              className="rounded-xl px-3 py-2 text-xs font-semibold text-center"
              style={{
                background: cajaAbierta ? 'rgba(34,197,94,0.12)' : 'rgba(245,158,11,0.12)',
                color: cajaAbierta ? '#4ade80' : '#fbbf24',
                border: cajaAbierta ? '1px solid rgba(34,197,94,0.25)' : '1px solid rgba(245,158,11,0.25)',
              }}
            >
              {cajaAbierta ? '● Caja Abierta' : '○ Caja Cerrada'}
            </div>
          </div>
        )}

        <div className="hidden lg:flex justify-center py-3" style={{ borderTop: '1px solid hsl(var(--sidebar-border))' }}>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="h-8 w-8 rounded-lg flex items-center justify-center transition-colors"
            style={{ color: 'hsl(var(--sidebar-foreground))', opacity: 0.5 }}
            aria-label={collapsed ? 'Expandir menú' : 'Colapsar menú'}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header
          className="h-14 flex items-center justify-between px-4 flex-shrink-0"
          style={{
            background: 'hsl(var(--card))',
            borderBottom: '1px solid hsl(var(--border))',
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
          }}
        >
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto pb-16 md:pb-0">{children}</main>
      </div>

      <MobileQuickNav onOpenMenu={() => setMobileOpen(true)} />
    </div>
  );
}
