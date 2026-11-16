import {
  LANES, BASE_SPEED, TRACK_SECONDS, JUMP_DUR, JUMP_HEIGHT, HIT_SLOW_TIME, HIT_SLOW_FACTOR, WAGON_SLOWDOWN,
} from './constants.js';
import { generateTrack } from './track.js';

/** Reine Spiellogik im 4-Spur-Raster, ohne Darstellung. */
export function createGame({ seed = 1, wagons = 0 } = {}) {
  const baseSpeed = BASE_SPEED * (1 - WAGON_SLOWDOWN * wagons);
  const track = generateTrack(seed, baseSpeed * TRACK_SECONDS);
  return {
    track,
    wagons,
    baseSpeed,
    dist: 0,
    speed: 0,
    lane: 1,
    jumpT: -1, // <0: nicht in der Luft, sonst Sekunden seit Absprung
    slow: 0,
    time: 0,
    collected: 0,
    totalItems: track.items.length,
    hits: 0,
    finished: false,
    finishTime: 0,
    stopped: false,
    events: [], // { type: 'lane'|'jump'|'hit'|'collect'|'finish' }
  };
}

export function jumpHeight(g) {
  if (g.jumpT < 0) return 0;
  const u = g.jumpT / JUMP_DUR;
  return JUMP_HEIGHT * 4 * u * (1 - u);
}

export function moveLane(g, dir) {
  if (g.finished) return;
  const next = Math.min(LANES - 1, Math.max(0, g.lane + dir));
  if (next !== g.lane) {
    g.lane = next;
    g.events.push({ type: 'lane' });
  }
}

export function jump(g) {
  if (g.finished || g.jumpT >= 0) return;
  g.jumpT = 0;
  g.events.push({ type: 'jump' });
}

export function step(g, dt) {
  if (g.stopped) return;
  if (!g.finished) g.time += dt;

  if (g.jumpT >= 0) {
    g.jumpT += dt;
    if (g.jumpT >= JUMP_DUR) g.jumpT = -1;
  }
  if (g.slow > 0) g.slow = Math.max(0, g.slow - dt);

  const target = g.finished ? 0 : g.baseSpeed * (g.slow > 0 ? HIT_SLOW_FACTOR : 1);
  const accel = g.finished ? 6 : 12;
  if (g.speed < target) g.speed = Math.min(target, g.speed + accel * dt);
  else g.speed = Math.max(target, g.speed - accel * 1.5 * dt);
  g.dist += g.speed * dt;

  if (!g.finished) {
    const h = jumpHeight(g);
    for (const o of g.track.obstacles) {
      if (o.hit || o.lane !== g.lane || Math.abs(o.z - g.dist) > 0.6) continue;
      if (o.type === 'low' && h > 0.45) continue; // übersprungen
      o.hit = true;
      g.hits++;
      g.slow = HIT_SLOW_TIME;
      g.events.push({ type: 'hit' });
    }
    for (const it of g.track.items) {
      if (it.got || it.lane !== g.lane || Math.abs(it.z - g.dist) > 0.7) continue;
      it.got = true;
      g.collected++;
      g.events.push({ type: 'collect' });
    }
    if (g.dist >= g.track.finishZ) {
      g.finished = true;
      g.finishTime = g.time;
      g.events.push({ type: 'finish' });
    }
  } else if (g.speed <= 0.05) {
    g.speed = 0;
    g.stopped = true;
  }
}

/** Vorläufige Regel (offen in SPEC): 1 Stern fürs Ziel, +1 ab 50 %, +1 ab 80 % der Sterne. */
export function starsFor(g) {
  if (!g.finished) return 0;
  const r = g.totalItems ? g.collected / g.totalItems : 1;
  return 1 + (r >= 0.5 ? 1 : 0) + (r >= 0.8 ? 1 : 0);
}
