import { LANES } from './constants.js';

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

/**
 * Erzeugt eine Strecke. z = Entfernung vom Start (Spureinheiten), lane = 0..3.
 * Hindernis-Reihen lassen immer mindestens eine Spur frei.
 * type: 'low' (überhüpfbar) oder 'block' (bremst nur kurz).
 */
export function generateTrack(seed, length) {
  const rnd = mulberry32(seed);
  const obstacles = [];
  const items = [];
  let z = 40;
  let lastFree = 1;
  while (z < length - 45) {
    if (rnd() < 0.55) {
      const free = rnd() < 0.5 ? lastFree : Math.floor(rnd() * LANES);
      lastFree = free;
      for (let lane = 0; lane < LANES; lane++) {
        if (lane === free) continue;
        if (rnd() < 0.6) obstacles.push({ z, lane, type: rnd() < 0.5 ? 'low' : 'block', hit: false });
      }
    } else {
      const lane = Math.floor(rnd() * LANES);
      const n = 3 + Math.floor(rnd() * 4);
      for (let i = 0; i < n; i++) items.push({ z: z + i * 1.8, lane, got: false });
    }
    z += 10 + rnd() * 6;
  }
  return { length, finishZ: length, obstacles, items };
}
