import { LANES } from './constants.js';

export const SWITCH_LEN = 12; // Länge einer Weichen-Zone (ein Spurpaar, eine Spur Wechsel)
export const PAIRS = LANES - 1; // Spurpaare 0-1, 1-2, 2-3

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

/** Liegt z in einer Weiche des Spurpaars pair (zwischen Spur pair und pair+1)? */
export function inSwitch(track, z, pair) {
  return track.switches.some((s) => s.pair === pair && z >= s.start && z <= s.end);
}

/** Beginnt innerhalb der nächsten `lead` Einheiten eine Weiche des Spurpaars pair? */
export function switchSoon(track, z, lead, pair) {
  return track.switches.some((s) => s.pair === pair && s.start > z && s.start - z <= lead);
}

/** Welche Richtungen sind für einen Zug auf Spur `lane` bei z gerade durch eine Weiche offen? */
export function openDirs(track, z, lane) {
  return {
    left: lane > 0 && inSwitch(track, z, lane - 1),
    right: lane < LANES - 1 && inSwitch(track, z, lane),
  };
}

/** Wie openDirs, aber für Weichen, die gleich beginnen. */
export function soonDirs(track, z, lane, lead) {
  return {
    left: lane > 0 && switchSoon(track, z, lead, lane - 1),
    right: lane < LANES - 1 && switchSoon(track, z, lead, lane),
  };
}

/** Optische Kurvenstärke bei z: -1.6 (links) .. 1.6 (rechts), 0 = gerade. */
export function curveAt(track, z) {
  for (const c of track.curves) if (z >= c.start && z <= c.end) return c.curve;
  return 0;
}

const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Zusätzlicher Abstand des Spurpaars pair bei z (in Spurbreiten, 0 = eng). Nur optisch. */
export function gapExtra(track, pair, z) {
  let e = 0;
  for (const g of track.gaps) {
    if (g.pair !== pair || z <= g.start || z >= g.end) continue;
    const t = (z - g.start) / (g.end - g.start);
    e += g.ext * smooth(0, 0.3, t) * (1 - smooth(0.7, 1, t));
  }
  return e;
}

/**
 * Erzeugt eine Strecke aus Ereignissen. z = Entfernung vom Start, lane = 0..3.
 * - Weichen + Hindernisreihe: vor der Reihe liegen nacheinander drei Weichen (je ein Spurpaar,
 *   nie überlappend), sodass man von jeder Spur nur Schritt für Schritt zur freien Spur kommt.
 *   Pro Weiche ist genau ein Spurwechsel zur Nachbarspur möglich, nie über zwei Spuren.
 * - Sprungreihe: niedrige Hindernisse auf allen Spuren (überhüpfen)
 * - Sammelobjekte (nur Solo)
 * Spurabstände und Kurven sind nur optisch. Zwei Kurven in gleicher Richtung ergeben eine engere.
 * type: 'low' (überhüpfbar) oder 'block' (bremst nur kurz).
 */
export function generateTrack(seed, length, { items: withItems = true } = {}) {
  const rnd = mulberry32(seed);
  const obstacles = [];
  const items = [];
  const switches = [];
  const curves = [];
  const gaps = [];
  const rows = []; // Hindernisreihen mit garantierter freier Spur: { z, free }

  let z = 40;
  while (z < length - 90) {
    const r = rnd();
    if (r < (withItems ? 0.45 : 0.6)) {
      const free = Math.floor(rnd() * LANES);
      // Reihenfolge der Spurpaare: außen zuerst, zur freien Spur hin; beide Seiten gemischt
      const left = []; // Paare links der freien Spur, von außen (0) nach innen
      for (let p = 0; p < free; p++) left.push(p);
      const right = []; // Paare rechts der freien Spur, von außen (PAIRS-1) nach innen
      for (let p = PAIRS - 1; p >= free; p--) right.push(p);
      const order = [];
      while (left.length || right.length) {
        const takeLeft = left.length && (!right.length || rnd() < 0.5);
        order.push(takeLeft ? left.shift() : right.shift());
      }
      let cursor = z;
      for (const pair of order) {
        switches.push({ start: cursor, end: cursor + SWITCH_LEN, pair });
        cursor += SWITCH_LEN + 4 + rnd() * 4;
      }
      const rowZ = cursor + 8;
      rows.push({ z: rowZ, free });
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

  // Spurabstände: pro Paar Aufweitungen (optisch), nie in oder direkt an einer Weiche des Paars
  for (let pair = 0; pair < PAIRS; pair++) {
    const mine = switches.filter((s) => s.pair === pair).sort((a, b) => a.start - b.start);
    // freie Abschnitte zwischen den Weichen dieses Paars (mit 10 Einheiten Abstand)
    const free = [];
    let from = 60;
    for (const s of mine) {
      if (s.start - 10 > from) free.push([from, s.start - 10]);
      from = Math.max(from, s.end + 10);
    }
    if (length - 100 > from) free.push([from, length - 100]);
    for (const [a, b] of free) {
      if (b - a < 18 || rnd() < 0.2) continue;
      const len = Math.min(b - a, 24 + rnd() * 40);
      const start = a + rnd() * (b - a - len);
      gaps.push({ pair, start, end: start + len, ext: [0.8, 1.6, 2.4][Math.floor(rnd() * 3)] });
    }
  }

  // Kurven (nur optisch): manchmal zwei gleiche hintereinander
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

  return { length, finishZ: length, obstacles, items, switches, curves, gaps, rows };
}
