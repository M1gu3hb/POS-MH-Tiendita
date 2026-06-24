'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  LayoutDashboard, ShoppingCart, Landmark, Package,
  Warehouse, ShoppingBag, ClipboardList, Settings, X, Plus, ScanLine
} from 'lucide-react';

// Orden visual: Dashboard arriba → Configuración a la izquierda
const items = [
  { path: '/',              label: 'Dashboard',        icon: LayoutDashboard, color: '#3b82f6' },
  { path: '/venta',         label: 'Punto de Venta',   icon: ShoppingCart,    color: '#22c55e' },
  { path: '/escaner',       label: 'Escáner',          icon: ScanLine,        color: '#14b8a6' },
  { path: '/caja',          label: 'Caja',             icon: Landmark,        color: '#f59e0b' },
  { path: '/productos',     label: 'Productos',        icon: Package,         color: '#a855f7' },
  { path: '/inventario',    label: 'Inventario',       icon: Warehouse,       color: '#06b6d4' },
  { path: '/egresos',       label: 'Compras y Gastos', icon: ShoppingBag,     color: '#f97316' },
  { path: '/registros',     label: 'Registros',        icon: ClipboardList,   color: '#ec4899' },
  { path: '/configuracion', label: 'Configuración',    icon: Settings,        color: '#64748b' },
];

const RADIUS = 135;
const ICON_SIZE = 52; // h-13 w-13 (52px)

export default function MobileQuickNav() {
  const [open, setOpen] = useState(false);
  const [hoveredIdx, setHoveredIdx] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const containerRef = useRef(null);
  const justDragged = useRef(false);

  // Arco desde "arriba" hasta "izquierda" del botón
  const total = items.length;
  const positions = items.map((_, i) => {
    const angleDeg = (i / (total - 1)) * 90; // 0° = arriba, 90° = izquierda
    const angle = (angleDeg * Math.PI) / 180;
    return {
      dx: -Math.sin(angle) * RADIUS,
      dy: -Math.cos(angle) * RADIUS,
    };
  });

  const closeMenu = useCallback(() => {
    setOpen(false);
    setHoveredIdx(null);
    setIsDragging(false);
  }, []);

  // Cerrar con Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') closeMenu(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, closeMenu]);

  const handleSelect = (path) => {
    closeMenu();
    router.push(path);
  };

  // Determinar qué icono está bajo (clientX, clientY)
  const findIconAt = (clientX, clientY) => {
    const container = containerRef.current;
    if (!container) return null;
    const rect = container.getBoundingClientRect();
    const centerX = rect.left + 4 + 28;
    const centerY = rect.bottom - 4 - 28;
    const px = clientX - centerX;
    const py = clientY - centerY;

    let bestIdx = null;
    let bestDist = ICON_SIZE / 1.2;
    for (let i = 0; i < items.length; i++) {
      const pos = positions[i];
      const dxp = px - pos.dx;
      const dyp = py - pos.dy;
      const dist = Math.sqrt(dxp * dxp + dyp * dyp);
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = i;
      }
    }
    return bestIdx;
  };

  // Pointer handlers para drag
  const handlePointerDown = (e) => {
    if (!open) {
      setOpen(true);
      setIsDragging(true);
      try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
    } else {
      setIsDragging(true);
      try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
    }
  };

  const handlePointerMove = (e) => {
    if (!isDragging || !open) return;
    const idx = findIconAt(e.clientX, e.clientY);
    setHoveredIdx(idx);
  };

  const handlePointerUp = (e) => {
    if (!isDragging) return;
    const idx = findIconAt(e.clientX, e.clientY);
    setIsDragging(false);
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
    if (idx !== null) {
      justDragged.current = true;
      setTimeout(() => { justDragged.current = false; }, 300);
      handleSelect(items[idx].path);
    } else {
      setHoveredIdx(null);
    }
  };

  const handlePointerCancel = () => {
    setIsDragging(false);
    setHoveredIdx(null);
  };

  const handleCenterClick = () => {
    if (justDragged.current) return;
    if (open) closeMenu();
  };

  const activeColor = hoveredIdx !== null ? items[hoveredIdx].color : null;
  const activeLabel = hoveredIdx !== null ? items[hoveredIdx].label : 'Acceso rápido';

  return (
    <>
      {/* Backdrop con blur — solo cuando abierto */}
      {open && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          onClick={closeMenu}
          aria-hidden="true"
          style={{
            background: 'rgba(0,0,0,0.45)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            transition: 'opacity 200ms ease',
          }}
        />
      )}

      <div
        ref={containerRef}
        className="fixed bottom-5 right-5 z-50 lg:hidden"
        style={{ width: 56, height: 56 }}
      >
        {/* ===== LABEL CÁPSULA — ARRIBA del quick nav ===== */}
        {open && (
          <div
            className="absolute pointer-events-none whitespace-nowrap"
            style={{
              right: -4,
              bottom: RADIUS + 42,
              padding: '10px 18px',
              borderRadius: '999px',
              fontSize: '14px',
              fontWeight: 800,
              letterSpacing: '0.2px',
              background: activeColor || 'rgba(20,20,28,0.92)',
              color: '#fff',
              border: activeColor ? `2px solid ${activeColor}` : '2px solid rgba(255,255,255,0.12)',
              boxShadow: activeColor
                ? `0 10px 28px ${activeColor}aa, 0 2px 0 rgba(255,255,255,0.18) inset`
                : '0 10px 28px rgba(0,0,0,0.5), 0 2px 0 rgba(255,255,255,0.08) inset',
              transition: 'background 180ms ease, box-shadow 180ms ease, transform 180ms ease',
              transform: hoveredIdx !== null ? 'scale(1.06)' : 'scale(1)',
              transformOrigin: 'right center',
              textShadow: '0 1px 2px rgba(0,0,0,0.3)',
            }}
          >
            {activeLabel}
          </div>
        )}

        {/* ===== ICONOS EN ARCO ===== */}
        {items.map((item, i) => {
          const pos = positions[i];
          const Icon = item.icon;
          const isHovered = hoveredIdx === i;
          const isCurrent = pathname === item.path;
          const isActive = isHovered;
          const otherHovered = hoveredIdx !== null && !isHovered;

          const scale = !open ? 0 : isActive ? 1.4 : otherHovered ? 0.85 : 1;

          return (
            <button
              key={item.path}
              type="button"
              onClick={(e) => { e.stopPropagation(); if (!justDragged.current) handleSelect(item.path); }}
              onMouseEnter={() => { if (!isDragging) setHoveredIdx(i); }}
              onMouseLeave={() => { if (!isDragging) setHoveredIdx(null); }}
              aria-label={item.label}
              className="absolute rounded-full flex items-center justify-center"
              style={{
                width: ICON_SIZE,
                height: ICON_SIZE,
                left: 2,
                bottom: 2,
                transform: open
                  ? `translate(${pos.dx}px, ${pos.dy}px) scale(${scale})`
                  : 'translate(0px, 0px) scale(0)',
                opacity: open ? (otherHovered ? 0.55 : 1) : 0,
                transition: `transform 320ms cubic-bezier(0.34, 1.56, 0.64, 1) ${i * 22}ms, opacity 220ms ease ${i * 22}ms, background 180ms, box-shadow 180ms`,
                background: isActive || isCurrent
                  ? `linear-gradient(160deg, ${item.color} 0%, ${item.color}d0 100%)`
                  : 'linear-gradient(160deg, #ffffff 0%, #e5e7eb 100%)',
                color: isActive || isCurrent ? '#fff' : item.color,
                boxShadow: isActive
                  ? `0 14px 36px ${item.color}, 0 0 0 4px ${item.color}33, 0 2px 0 rgba(255,255,255,0.45) inset, 0 -2px 0 rgba(0,0,0,0.15) inset`
                  : isCurrent
                  ? `0 6px 18px ${item.color}80, 0 1px 0 rgba(255,255,255,0.4) inset`
                  : '0 4px 12px rgba(0,0,0,0.30), 0 1px 0 rgba(255,255,255,0.8) inset, 0 -1px 0 rgba(0,0,0,0.10) inset',
                pointerEvents: open ? 'auto' : 'none',
                border: isActive ? `2px solid #fff` : '1px solid rgba(0,0,0,0.10)',
                touchAction: 'none',
                zIndex: isActive ? 10 : 1,
              }}
            >
              <Icon
                style={{
                  width: isActive ? 26 : 22,
                  height: isActive ? 26 : 22,
                  transition: 'width 180ms, height 180ms',
                }}
                strokeWidth={2.6}
              />
            </button>
          );
        })}

        {/* ===== BOTÓN CENTRAL ===== */}
        <button
          type="button"
          onClick={handleCenterClick}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          aria-label={open ? 'Cerrar menú rápido' : 'Abrir menú rápido'}
          aria-expanded={open}
          className="absolute h-14 w-14 rounded-full flex items-center justify-center active:scale-95"
          style={{
            left: 0,
            bottom: 0,
            background: open
              ? 'linear-gradient(160deg, #ef4444 0%, #b91c1c 100%)'
              : 'linear-gradient(160deg, hsl(214 80% 58%) 0%, hsl(214 80% 42%) 100%)',
            color: '#fff',
            boxShadow: open
              ? '0 10px 28px rgba(239,68,68,0.6), 0 1px 0 rgba(255,255,255,0.25) inset, 0 -1px 0 rgba(0,0,0,0.2) inset'
              : '0 10px 28px rgba(37,99,235,0.5), 0 1px 0 rgba(255,255,255,0.25) inset, 0 -1px 0 rgba(0,0,0,0.2) inset',
            border: '1px solid rgba(0,0,0,0.15)',
            transition: 'transform 220ms ease, background 220ms, box-shadow 220ms',
            transform: open ? 'rotate(135deg)' : 'rotate(0deg)',
            touchAction: 'none',
            zIndex: 20,
          }}
        >
          {open ? <X className="h-6 w-6" strokeWidth={2.6} /> : <Plus className="h-6 w-6" strokeWidth={2.6} />}
        </button>
      </div>
    </>
  );
}
