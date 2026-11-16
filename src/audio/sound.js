/** Web Audio. Platzhalter-Tuten (M1: einfacher Oszillator). Eigene Klänge, keine Fremdquellen. */
let ctx = null;
let muted = false;
let lastHorn = 0;

/** Muss im ersten Tipp aufgerufen werden (iOS). */
export function unlockAudio() {
  try {
    ctx ??= new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
  } catch { /* kein Audio verfügbar */ }
}

export const isUnlocked = () => !!ctx && ctx.state === 'running';
export const isMuted = () => muted;
export function setMuted(m) {
  muted = m;
  try { localStorage.setItem('btr.muted', m ? '1' : '0'); } catch { /* ignorieren */ }
}
export function loadMuted() {
  try { muted = localStorage.getItem('btr.muted') === '1'; } catch { /* ignorieren */ }
  return muted;
}

/** Zweiklang-Tuten, neuer Druck startet neu, Sperre 0,3 s. */
export function horn(pitch = 1) {
  if (!ctx || muted) return;
  const now = ctx.currentTime;
  if (now - lastHorn < 0.3) return;
  lastHorn = now;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.25, now + 0.03);
  gain.gain.setValueAtTime(0.25, now + 0.45);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
  gain.connect(ctx.destination);
  for (const f of [233 * pitch, 294 * pitch]) {
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = f;
    o.connect(gain);
    o.start(now);
    o.stop(now + 0.85);
  }
}
