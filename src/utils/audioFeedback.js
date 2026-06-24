/**
 * Audio feedback helper — beeps locales sin archivos externos.
 *
 * Usa Web Audio API. Si el navegador no permite audio hasta que haya
 * interacción del usuario, los primeros beeps fallarán silenciosamente
 * y comenzarán a funcionar tras el primer click/tap.
 *
 * Sonidos:
 *  - playScanSuccess(): beep corto agudo (800 Hz, 90 ms) — producto agregado / enviado.
 *  - playScanError(): doble beep grave (220→180 Hz) — error/no encontrado.
 *  - playSaleSuccess(): triple beep ascendente — venta cobrada.
 *
 * Reglas:
 *  - cooldown 120 ms entre éxitos para evitar spam si hay duplicados.
 *  - respeta preferencia del usuario vía isSoundEnabled().
 *  - try/catch en todo — nunca rompe la app.
 */
import { isSoundEnabled } from '@/hooks/useSoundEnabled';

let ctx = null;
let lastSuccessTs = 0;
let unlocked = false;

function getCtx() {
  if (ctx) return ctx;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    return ctx;
  } catch {
    return null;
  }
}

/**
 * Llamar tras la primera interacción del usuario para "desbloquear" el AudioContext
 * en navegadores estrictos (iOS Safari, Chrome móvil).
 */
export function unlockAudioFeedback() {
  if (unlocked) {
    // Si ya marcamos como desbloqueado, confirmamos contra el estado actual del ctx
    const c = ctx;
    if (c && c.state === 'running') return true;
  }
  try {
    const c = getCtx();
    if (!c) return false;
    if (c.state === 'suspended') {
      try { c.resume(); } catch { /* noop */ }
    }
    // Genera un oscillator silencioso para "warmup"
    const o = c.createOscillator();
    const g = c.createGain();
    g.gain.value = 0.0001;
    o.connect(g); g.connect(c.destination);
    o.start();
    o.stop(c.currentTime + 0.02);
    unlocked = true;
    // Notificar listeners
    try { window.dispatchEvent(new CustomEvent('pos-mh-audio-unlocked')); } catch { /* noop */ }
    return c.state === 'running';
  } catch {
    return false;
  }
}

/** True si el AudioContext ya está corriendo (puede emitir sonido ya mismo). */
export function isAudioUnlocked() {
  try {
    const c = ctx;
    if (!c) return false;
    return c.state === 'running' && unlocked;
  } catch {
    return false;
  }
}

/** Estado completo para diagnóstico. */
export function getAudioStatus() {
  return {
    hasContext: !!ctx,
    state: ctx?.state || 'none',
    unlocked,
  };
}

function beep({ freq = 800, durationMs = 90, type = 'sine', volume = 0.08 }) {
  if (!isSoundEnabled()) return;
  const c = getCtx();
  if (!c) return;
  try {
    if (c.state === 'suspended') { try { c.resume(); } catch { /* noop */ } }
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, c.currentTime);
    g.gain.setValueAtTime(0.0001, c.currentTime);
    g.gain.exponentialRampToValueAtTime(volume, c.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + durationMs / 1000);
    o.connect(g); g.connect(c.destination);
    o.start();
    o.stop(c.currentTime + durationMs / 1000 + 0.02);
  } catch { /* noop */ }
}

/** Beep corto positivo para escaneo exitoso. Tiene cooldown anti-spam. */
export function playScanSuccess() {
  const now = Date.now();
  if (now - lastSuccessTs < 120) return;
  lastSuccessTs = now;
  beep({ freq: 880, durationMs: 90, type: 'sine', volume: 0.09 });
}

/** Doble beep grave para error / producto no encontrado. */
export function playScanError() {
  if (!isSoundEnabled()) return;
  beep({ freq: 220, durationMs: 100, type: 'square', volume: 0.07 });
  setTimeout(() => beep({ freq: 180, durationMs: 110, type: 'square', volume: 0.07 }), 110);
}

/** Triple beep ascendente para venta cobrada exitosa. */
export function playSaleSuccess() {
  if (!isSoundEnabled()) return;
  beep({ freq: 660, durationMs: 80, type: 'sine', volume: 0.08 });
  setTimeout(() => beep({ freq: 880, durationMs: 80, type: 'sine', volume: 0.08 }), 90);
  setTimeout(() => beep({ freq: 1175, durationMs: 130, type: 'sine', volume: 0.09 }), 190);
}