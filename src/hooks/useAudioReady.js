import { useEffect, useState } from 'react';
import { isAudioUnlocked } from '@/utils/audioFeedback';
import { useSoundEnabled } from '@/hooks/useSoundEnabled';

/**
 * Hook que combina:
 *  - preferencia del usuario (Cuenta > Sonidos del sistema)
 *  - estado real del AudioContext (desbloqueado o no)
 *
 * Devuelve:
 *   - soundEnabled: bool — preferencia
 *   - audioReady:   bool — AudioContext.state === 'running' y ya hubo unlock
 *   - needsSoundActivation: bool — true si conviene mostrar el botón "Activar sonido"
 *
 * El estado audioReady se recalcula en:
 *   - mount
 *   - evento global 'pos-mh-audio-unlocked' (lanzado por unlockAudioFeedback)
 *   - cambios de preferencia
 *   - polling ligero cada 1.5s mientras esté montado (por si el navegador suspende solo)
 */
export function useAudioReady() {
  const { enabled: soundEnabled } = useSoundEnabled();
  const [audioReady, setAudioReady] = useState(() => isAudioUnlocked());

  useEffect(() => {
    const check = () => setAudioReady(isAudioUnlocked());
    check();

    const onUnlocked = () => check();
    window.addEventListener('pos-mh-audio-unlocked', onUnlocked);
    window.addEventListener('pos-mh-sound-changed', check);

    const id = setInterval(check, 1500);

    return () => {
      window.removeEventListener('pos-mh-audio-unlocked', onUnlocked);
      window.removeEventListener('pos-mh-sound-changed', check);
      clearInterval(id);
    };
  }, []);

  const needsSoundActivation = !soundEnabled || !audioReady;

  return { soundEnabled, audioReady, needsSoundActivation };
}