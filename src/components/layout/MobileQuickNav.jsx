'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ShoppingCart, ScanLine, Menu } from 'lucide-react';

export default function MobileQuickNav({ onOpenMenu }) {
  const pathname = usePathname();

  const navItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/venta', label: 'Venta', icon: ShoppingCart },
    { path: '/escaner', label: 'Escáner', icon: ScanLine },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 h-16 bg-card border-t border-border flex items-center justify-around z-50 md:hidden skeu-panel rounded-none border-x-0 border-b-0 shadow-lg">
      {navItems.map((item) => {
        const isActive = pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path));
        const Icon = item.icon;

        return (
          <Link
            key={item.path}
            href={item.path}
            className={`flex flex-col items-center justify-center flex-1 h-full py-1 gap-1 transition-colors select-none ${
              isActive
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon className="h-6 w-6" strokeWidth={2} />
            <span className="text-[10px] font-bold">{item.label}</span>
          </Link>
        );
      })}

      <button
        onClick={onOpenMenu}
        className="flex flex-col items-center justify-center flex-1 h-full py-1 gap-1 transition-colors text-muted-foreground hover:text-foreground select-none"
      >
        <Menu className="h-6 w-6" strokeWidth={2} />
        <span className="text-[10px] font-bold">Menú</span>
      </button>
    </div>
  );
}
