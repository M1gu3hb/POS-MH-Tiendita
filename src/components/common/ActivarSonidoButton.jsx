'use client';
import { Volume2 } from 'lucide-react';
import { toast } from 'sonner';
import { setSoundEnabled } from '@/hooks/useSoundEnabled';
import { unlockAudioFeedback, playScanSuccess, isAudioUnlocked } from '@/utils/audioFeedback';
import { useAudioReady } from '@/hooks/useAudioReady';

/**
 * Botón contextual "Activar sonido".
 *
 * - Solo se renderiza si needsSoundActivation === true
 *   (preferencia OFF o AudioContext aún bloqueado).
 * - Al pulsar:
 *     1. Activa la preferencia (setSoundEnabled(true))
 *     2. Desbloquea el AudioContext (unlockAudioFeedback)
 *     3. Reproduce beep de prueba (playScanSuccess)
 *     4. Toast "Sonido activado" (o error si no se pudo).
 *
 * Variantes:
 *   - variant="overlay" → estilo flotante translúcido sobre fondo oscuro (scanner cámara).
 *   - variant="card"    → estilo skeu-panel (en Escáner remoto y POS).
 */
export default function ActivarSonidoButton({ variant = 'card', className = '' }) {
  const { needsSoundActivation } = useAudioReady();

  if (!needsSoundActivation) return null;

  const handleActivate = () => {
    try {
      // 1. preferencia ON (también sincroniza switch de Cuenta)
      setSoundEnabled(true);
      // 2. desbloquear AudioContext (requiere haber sido invocado desde gesto del usuario)
      const ok = unlockAudioFeedback();
      // 3. beep de prueba — un pequeño delay ayuda en iOS
      setTimeout(() => {
        playScanSuccess();
        // 4. confirmar si quedó realmente desbloqueado
        if (ok || isAudioUnlocked()) {
          toast.success('Sonido activado');
        } else {
          toast.error('No se pudo activar sonido. Toca la pantalla e intenta otra vez.');
        }
      }, 50);
    } catch {
      toast.error('No se pudo activar sonido. Toca la pantalla e intenta otra vez.');
    }
  };

  if (variant === 'overlay') {
    return (
      <button
        type="button"
        onClick={handleActivate}
        className={`pointer-events-auto flex items-center gap-2 px-4 py-2.5 rounded-full bg-emerald-500/95 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/40 border border-emerald-300/40 backdrop-blur-sm transition-colors ${className}`}
      >
        <Volume2 className="h-4 w-4" />
        <div className="text-left leading-tight">
          <p className="text-sm font-bold">Activar sonido</p>
          <p className="text-[10px] opacity-90">Beep al escanear</p>
        </div>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleActivate}
      className={`w-full skeu-card flex items-center gap-3 px-4 py-3 hover:bg-accent/30 transition-colors text-left ${className}`}
    >
      <div className="h-10 w-10 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
        <Volume2 className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-foreground">Activar sonido</p>
        <p className="text-xs text-muted-foreground">Para escuchar el beep al escanear</p>
      </div>
      <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex-shrink-0">
        Tocar
      </span>
    </button>
  );
}