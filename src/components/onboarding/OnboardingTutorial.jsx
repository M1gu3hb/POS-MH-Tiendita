'use client';

import { useRouter } from 'next/navigation';
import { useOnboarding } from '@/hooks/useOnboarding';
import { Store, Package, DollarSign, ShoppingCart, X } from 'lucide-react';

export default function OnboardingTutorial() {
  const router = useRouter();
  const {
    mostrarTutorial,
    completarOnboarding,
    pasoActual,
    siguientePaso,
  } = useOnboarding();

  if (!mostrarTutorial) return null;

  const handleClose = () => {
    completarOnboarding();
  };

  const handleGoToProductos = () => {
    router.push('/productos');
    siguientePaso();
  };

  const handleGoToCaja = () => {
    router.push('/caja');
    siguientePaso();
  };

  const handleGoToVenta = () => {
    completarOnboarding();
    router.push('/venta');
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="relative w-full max-w-[400px] skeu-panel p-6 flex flex-col items-center text-center gap-4 bg-card text-card-foreground border border-border shadow-2xl">
        {/* Botón X de cerrar en la esquina superior derecha */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-lg hover:bg-muted/50"
          aria-label="Cerrar tutorial"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Indicador de pasos */}
        <div className="flex gap-2 justify-center mb-1">
          {[1, 2, 3, 4].map((step) => (
            <span
              key={step}
              className={`h-2.5 w-2.5 rounded-full transition-colors ${
                pasoActual === step ? 'bg-primary scale-110 shadow-sm' : 'bg-muted'
              }`}
            />
          ))}
        </div>

        {/* Paso 1: Bienvenida */}
        {pasoActual === 1 && (
          <div className="flex flex-col items-center gap-3 w-full animate-in fade-in duration-300">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center skeu-input mb-1">
              <Store className="h-8 w-8 text-primary animate-pulse" />
            </div>
            <h2 className="text-lg font-bold text-foreground">
              ¡Bienvenido a tu punto de venta!
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              En menos de 2 minutos configuras todo. Te guiamos paso a paso.
            </p>
            <button
              onClick={siguientePaso}
              className="skeu-btn-primary w-full h-11 rounded-xl font-bold text-sm flex items-center justify-center transition-all mt-2"
            >
              Comenzar →
            </button>
          </div>
        )}

        {/* Paso 2: Agregar productos */}
        {pasoActual === 2 && (
          <div className="flex flex-col items-center gap-3 w-full animate-in fade-in duration-300">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center skeu-input mb-1">
              <Package className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-lg font-bold text-foreground">
              Agrega tus productos
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Ve a Productos → Nuevo producto. Ponle nombre, precio y cantidad.
            </p>
            <button
              onClick={handleGoToProductos}
              className="skeu-btn-primary w-full h-11 rounded-xl font-bold text-sm flex items-center justify-center transition-all mt-2"
            >
              Ir a Productos
            </button>
            <button
              onClick={siguientePaso}
              className="skeu-btn-ghost w-full h-11 rounded-xl font-bold text-sm flex items-center justify-center transition-all text-muted-foreground hover:text-foreground"
            >
              Lo hago después →
            </button>
          </div>
        )}

        {/* Paso 3: Abrir caja */}
        {pasoActual === 3 && (
          <div className="flex flex-col items-center gap-3 w-full animate-in fade-in duration-300">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center skeu-input mb-1">
              <DollarSign className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-lg font-bold text-foreground">
              Abre tu caja antes de vender
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Ve a Caja → Abrir caja. Pon el dinero con que empiezas el día.
            </p>
            <button
              onClick={handleGoToCaja}
              className="skeu-btn-primary w-full h-11 rounded-xl font-bold text-sm flex items-center justify-center transition-all mt-2"
            >
              Ir a Caja
            </button>
            <button
              onClick={siguientePaso}
              className="skeu-btn-ghost w-full h-11 rounded-xl font-bold text-sm flex items-center justify-center transition-all text-muted-foreground hover:text-foreground"
            >
              Lo hago después →
            </button>
          </div>
        )}

        {/* Paso 4: Primera venta */}
        {pasoActual === 4 && (
          <div className="flex flex-col items-center gap-3 w-full animate-in fade-in duration-300">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center skeu-input mb-1">
              <ShoppingCart className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-lg font-bold text-foreground">
              ¡Ya puedes vender!
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Ve a Punto de Venta, busca un producto y presiona Cobrar.
            </p>
            <button
              onClick={handleGoToVenta}
              className="skeu-btn-primary w-full h-11 rounded-xl font-bold text-sm flex items-center justify-center transition-all mt-2"
            >
              Hacer mi primera venta
            </button>
            <button
              onClick={handleClose}
              className="skeu-btn-ghost w-full h-11 rounded-xl font-bold text-sm flex items-center justify-center transition-all text-muted-foreground hover:text-foreground"
            >
              Explorar solo
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
