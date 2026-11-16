import { LANES } from './constants.js';

export const SWITCH_LEN = 14; // Länge einer Weichen-Zone (Spurwechsel erlaubt)
export const SWITCH_TO_ROW = 26; // Abstand Weichen-Anfang bis Hindernisreihe

export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Liegt die Strecke z in einer Weichen-Zone (hier ist Spurwechsel erlaubt)? */
export function inSwitch(track, z) {
  return track.switches.some((s) => z >= s.start && z <= s.end);
}

/** Beginnt innerhalb der nächsten `lead` Einheiten eine Weichen-Zone? */
export function switchSoon(track, z, lead) {
  return track.switches.some((s) => s.start > z && s.start - z <= lead);
}

/** Optische Kurvenstärke bei z: -1.6 (links) .. 1.6 (rechts), 0 = gerade. */
export function curveAt(track, z) {
  for (const c of track.curves) if (z >= c.start && z <= c.end) return c.curve;
  return 0;
}

/**
 * Erzeugt eine Strecke aus Ereignissen. z = Entfernung vom Start, lane = 0..3.
 * - Weiche + Hindernisreihe: Spurwechsel-Zone davor, mindestens eine Spur frei
 * - Sprungreihe: niedrige Hindernisse auf allen Spuren (überhüpfen)
 * - Sammelobjekte (nur Solo)
 * Kurven sind nur optisch; zwei Kurven in gleicher Richtung ergeben eine engere Kurve.
 * type: 'low' (überhüpfbar) oder 'block' (bremst nur kurz).
 */
export function generateTrack(seed, length, { items: withItems = true } = {}) {
  const rnd = mulberry32(seed);
  const obstacles = [];
  const items = [];
  const switches = [];
  const curves = [];

  let z = 40;
  while (z < length - 50) {
    const r = rnd();
    if (r < (withItems ? 0.45 : 0.6)) {
      const start = z;
      const rowZ = z + SWITCH_TO_ROW;
      switches.push({ start, end: start + SWITCH_LEN, dir: rnd() < 0.5 ? -1 : 1 });
      const free = Math.floor(rnd() * LANES);
      for (let lane = 0; lane < LANES; lane++) {
        if (lane === free || rnd() > 0.75) continue;
        obstacles.push({ z: rowZ, lane, type: rnd() < 0.5 ? 'low' : 'block' });
      }
      z = rowZ + 10 + rnd() * 6;
    } else if (r < (withItems ? 0.6 : 0.8)) {
      const rowZ = z + 10;
      for (let lane = 0; lane < LANES; lane++) obstacles.push({ z: rowZ, lane, type: 'low' });
      z = rowZ + 10 + rnd() * 6;
    } else {
      if (withItems) {
        const lane = Math.floor(rnd() * LANES);
        const n = 3 + Math.floor(rnd() * 4);
        for (let i = 0; i < n; i++) items.push({ z: z + i * 1.8, lane, got: false });
      }
      z += 10 + rnd() * 6;
    }
  }

  // Kurven (nur optisch): abwechselnd gerade und Kurve, manchmal zwei gleiche hintereinander
  let cz = 60 + rnd() * 30;
  while (cz < length - 60) {
    const sign = rnd() < 0.5 ? -1 : 1;
    const len = 35 + rnd() * 30;
    const pair = rnd() < 0.3;
    const strength = pair ? 1.6 : 0.8;
    curves.push({ start: cz, end: cz + len, curve: sign * strength });
    if (pair) curves.push({ start: cz + len, end: cz + 2 * len, curve: sign * strength });
    cz += (pair ? 2 : 1) * len + 40 + rnd() * 50;
  }

  return { length, finishZ: length, obstacles, items, switches, curves };
}
