import { useEffect, useState, useCallback } from 'react';

/**
 * Hook + helpers para preferencia "Sonidos del sistema" persistida en localStorage.
 *
 * Clave: pos-mh-sound-enabled  (sin scope de usuario; es preferencia del navegador/dispositivo).
 * Default: activado (true).
 *
 * `isSoundEnabled()` se puede llamar fuera de React (audioFeedback.js).
 */
const KEY = 'pos-mh-sound-enabled';

export function isSoundEnabled() {
  try {
    const v = localStorage.getItem(KEY);
    if (v === null) return true; // default ON
    return v !== '0' && v !== 'false';
  } catch {
    return true;
  }
}

export function setSoundEnabled(enabled) {
  try {
    localStorage.setItem(KEY, enabled ? '1' : '0');
    // Notificar a otras pestañas/componentes
    window.dispatchEvent(new CustomEvent('pos-mh-sound-changed', { detail: { enabled } }));
  } catch { /* noop */ }
}

export function useSoundEnabled() {
  const [enabled, setEnabled] = useState(() => isSoundEnabled());

  useEffect(() => {
    const handler = (e) => setEnabled(!!e.detail?.enabled);
    window.addEventListener('pos-mh-sound-changed', handler);
    return () => window.removeEventListener('pos-mh-sound-changed', handler);
  }, []);

  const toggle = useCallback(() => {
    const next = !enabled;
    setSoundEnabled(next);
    setEnabled(next);
  }, [enabled]);

  return { enabled, setEnabled: (v) => { setSoundEnabled(v); setEnabled(v); }, toggle };
}