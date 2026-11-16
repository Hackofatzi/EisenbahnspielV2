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

/** Kurze Effekt-Klänge aus Oszillatoren (eigene Klänge, keine Fremdquellen). */
export function sfx(name) {
  if (!ctx || muted) return;
  const now = ctx.currentTime;
  const tone = (type, f0, f1, dur, vol, delay = 0) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, now + delay);
    o.frequency.exponentialRampToValueAtTime(f1, now + delay + dur);
    g.gain.setValueAtTime(vol, now + delay);
    g.gain.exponentialRampToValueAtTime(0.001, now + delay + dur);
    o.connect(g).connect(ctx.destination);
    o.start(now + delay);
    o.stop(now + delay + dur + 0.02);
  };
  switch (name) {
    case 'collect': tone('sine', 660, 1320, 0.14, 0.2); break;
    case 'lane': tone('triangle', 300, 220, 0.07, 0.12); break;
    case 'jump': tone('sine', 220, 520, 0.18, 0.15); break;
    case 'locked': tone('triangle', 200, 170, 0.06, 0.08); break;
    case 'cut': tone('sawtooth', 260, 130, 0.2, 0.12); break;
    case 'blocked': tone('square', 120, 90, 0.1, 0.1); break;
    case 'hit': tone('square', 140, 60, 0.25, 0.18); break;
    case 'finish':
      [523, 659, 784, 1046].forEach((f, i) => tone('triangle', f, f, 0.25, 0.2, i * 0.14));
      break;
    default: break;
  }
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
