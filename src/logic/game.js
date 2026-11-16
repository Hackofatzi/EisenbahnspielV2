import {
  LANES, BASE_SPEED, TRACK_SECONDS, JUMP_DUR, JUMP_HEIGHT, HIT_SLOW_TIME, HIT_SLOW_FACTOR, WAGON_SLOWDOWN,
} from './constants.js';
import { generateTrack, mulberry32, inSwitch, switchSoon } from './track.js';

const CUT_SLOW_TIME = 0.7;
const CUT_SLOW_FACTOR = 0.6;
const QUEUE_TIME = 1.0; // Wisch kurz vor einer Weiche wird gemerkt
const QUEUE_LEAD = 3; // plus Tempo * 1 s

function makeTrain(baseSpeed, lane) {
  return {
    baseSpeed,
    dist: 0,
    speed: 0,
    lane,
    jumpT: -1, // <0: nicht in der Luft, sonst Sekunden seit Absprung
    slow: 0,
    cut: 0, // Restzeit, in der der Zug nach dem "Schneiden" langsamer ist
    time: 0,
    hits: 0,
    hitSet: new Set(), // getroffene Hindernisse (pro Zug)
    finished: false,
    finishTime: 0,
    stopped: false,
  };
}

/**
 * Reine Spiellogik im 4-Spur-Raster, ohne Darstellung.
 * Das Objekt selbst ist der Spielerzug; Rivalen (KI) stehen in g.rivals.
 * rivals: Anzahl KI-Züge (0 = Solo mit Sammelobjekten).
 */
export function createGame({ seed = 1, wagons = 0, rivals = 0 } = {}) {
  const baseSpeed = BASE_SPEED * (1 - WAGON_SLOWDOWN * wagons);
  const track = generateTrack(seed, baseSpeed * TRACK_SECONDS, { items: rivals === 0 });
  const rnd = mulberry32((seed ^ 0x9e3779b9) >>> 0);
  const g = {
    ...makeTrain(baseSpeed, 1),
    track,
    wagons,
    totalItems: track.items.length,
    collected: 0,
    events: [], // { type: 'lane'|'jump'|'hit'|'collect'|'finish' }
    finishOrder: [],
    queue: [], // gemerkte Wische vor einer Weiche
    place: 0,
    rnd,
    rivals: [],
  };
  const startLanes = [0, 2, 3];
  for (let i = 0; i < rivals; i++) {
    const w = 1 + Math.floor(rnd() * 3);
    const r = makeTrain(BASE_SPEED * (1 - WAGON_SLOWDOWN * w) * (0.97 + rnd() * 0.08), startLanes[i % 3]);
    r.wagons = w;
    r.ai = { cd: rnd() * 0.3, mistake: 0.06 + rnd() * 0.1 };
    g.rivals.push(r);
  }
  return g;
}

export function jumpHeight(t) {
  if (t.jumpT < 0) return 0;
  const u = t.jumpT / JUMP_DUR;
  return JUMP_HEIGHT * 4 * u * (1 - u);
}

// Zuglänge: Lok 2.4, jeder Wagen 2.22 (inkl. Kupplung); dist = Mitte der Lok
const CAR_LEN = 2.22;
const lengthOf = (t) => 2.4 + (t.wagons ?? 0) * CAR_LEN;
const frontOf = (t) => t.dist + 1.2;
const tailOf = (t) => t.dist + 1.2 - lengthOf(t);
const allTrains = (g) => [g, ...g.rivals];

/**
 * Ist die Spur für Zug t durch einen anderen (noch fahrenden) Zug belegt?
 * Frei ist sie, wenn die Lok von t bereits vor der Lok des anderen ist (seine Wagen blockieren
 * das Überholen nicht, er wird dann "geschnitten") oder wenn der andere ganz vor t fährt.
 */
export function laneTaken(g, t, lane, margin = 0.4) {
  const myRear = t.dist - 1.2;
  return allTrains(g).some((x) => {
    if (x === t || x.finished || x.lane !== lane) return false;
    const iAmAhead = myRear >= frontOf(x) - 0.2;
    const theyAreAhead = frontOf(t) + margin <= tailOf(x);
    return !iAmAhead && !theyAreAhead;
  });
}

/**
 * Spurwechsel nur in Weichen-Zonen und nur, wenn auf der Nachbarspur Platz ist.
 * Gibt 'ok' | 'edge' | 'locked' | 'blocked' zurück.
 */
function changeLane(t, dir, g) {
  const next = Math.min(LANES - 1, Math.max(0, t.lane + dir));
  if (next === t.lane) return 'edge';
  if (!inSwitch(g.track, t.dist)) return 'locked';
  if (laneTaken(g, t, next)) return 'blocked';
  t.lane = next;
  // Wer jetzt von meinen Wagen "geschnitten" wird, wird kurz langsamer
  for (const x of allTrains(g)) {
    if (x === t || x.finished || x.lane !== next || x.dist >= t.dist || frontOf(x) <= tailOf(t)) continue;
    x.cut = CUT_SLOW_TIME;
    if (x === g) g.events.push({ type: 'cut' });
  }
  return 'ok';
}

function applyMove(g, dir) {
  const r = changeLane(g, dir, g);
  if (r === 'ok') g.events.push({ type: 'lane' });
  else if (r === 'blocked') g.events.push({ type: 'blocked' });
  return r;
}

/** Spieler will wechseln. Außerhalb einer Weiche wird der Wisch kurz vor einer Weiche gemerkt. */
export function moveLane(g, dir) {
  if (g.finished) return;
  if (inSwitch(g.track, g.dist)) {
    applyMove(g, dir);
  } else if (switchSoon(g.track, g.dist, QUEUE_LEAD + g.speed * 1.0)) {
    if (g.queue.length < 3) g.queue.push({ dir, t: QUEUE_TIME });
  } else {
    g.events.push({ type: 'locked' });
  }
}

export function jump(g) {
  if (g.finished || g.jumpT >= 0) return;
  g.jumpT = 0;
  g.events.push({ type: 'jump' });
}

function stepTrain(t, dt, g, isPlayer) {
  if (t.stopped) return;
  if (!t.finished) t.time += dt;

  if (t.jumpT >= 0) {
    t.jumpT += dt;
    if (t.jumpT >= JUMP_DUR) t.jumpT = -1;
  }
  if (t.slow > 0) t.slow = Math.max(0, t.slow - dt);
  if (t.cut > 0) t.cut = Math.max(0, t.cut - dt);

  const factor = t.slow > 0 ? HIT_SLOW_FACTOR : t.cut > 0 ? CUT_SLOW_FACTOR : 1;
  const target = t.finished ? 0 : t.baseSpeed * factor;
  const accel = t.finished ? 6 : 12;
  if (t.speed < target) t.speed = Math.min(target, t.speed + accel * dt);
  else t.speed = Math.max(target, t.speed - accel * 1.5 * dt);
  const prevDist = t.dist;
  t.dist += t.speed * dt;

  // Nicht in einen Zug auf derselben Spur hineinfahren: hinter ihm bleiben, sein Tempo übernehmen
  if (!t.finished) {
    for (const x of allTrains(g)) {
      if (x === t || x.finished || x.lane !== t.lane || x.dist <= t.dist) continue;
      const maxDist = tailOf(x) - 0.3 - 1.2;
      if (t.dist > maxDist) {
        t.dist = Math.max(prevDist, maxDist);
        t.speed = Math.min(t.speed, x.speed);
      }
    }
  }

  if (!t.finished) {
    const h = jumpHeight(t);
    for (const o of g.track.obstacles) {
      if (t.hitSet.has(o) || o.lane !== t.lane || Math.abs(o.z - t.dist) > 0.6) continue;
      if (o.type === 'low' && h > 0.45) continue; // übersprungen
      t.hitSet.add(o);
      t.hits++;
      t.slow = HIT_SLOW_TIME;
      if (isPlayer) g.events.push({ type: 'hit' });
    }
    if (isPlayer) {
      for (const it of g.track.items) {
        if (it.got || it.lane !== t.lane || Math.abs(it.z - t.dist) > 0.7) continue;
        it.got = true;
        g.collected++;
        g.events.push({ type: 'collect' });
      }
    }
    if (t.dist >= g.track.finishZ) {
      t.finished = true;
      t.finishTime = t.time;
      g.finishOrder.push(t);
      if (isPlayer) {
        g.place = g.finishOrder.length;
        g.events.push({ type: 'finish' });
      }
    }
  } else if (t.speed <= 0.05) {
    t.speed = 0;
    t.stopped = true;
  }
}

/**
 * KI: springt über niedrige Hindernisse und wechselt nur in Weichen-Zonen die Spur
 * (dort schaut sie weiter voraus). Mit kleinen Fehlern und Reaktionszeit.
 */
export function stepAI(r, g, dt) {
  if (r.finished) return;
  r.ai.cd -= dt;
  if (r.ai.cd > 0) return;
  r.ai.cd = 0.12 + g.rnd() * 0.1;
  const open = (o) => !r.hitSet.has(o);

  // Springen: niedriges Hindernis auf der eigenen Spur kurz voraus
  const near = g.track.obstacles.find(
    (o) => o.lane === r.lane && o.type === 'low' && o.z > r.dist + 0.3 && o.z < r.dist + r.speed * 0.42 && open(o),
  );
  if (near && r.jumpT < 0 && g.rnd() >= r.ai.mistake) r.jumpT = 0;

  if (!inSwitch(g.track, r.dist)) return;
  const look = 45;
  const cost = (lane) => {
    let c = 0;
    for (const o of g.track.obstacles) {
      if (o.lane !== lane || o.z <= r.dist || o.z > r.dist + look || !open(o)) continue;
      c += o.type === 'block' ? 100 : 5;
    }
    return c + Math.abs(lane - r.lane) * 0.5;
  };
  if (cost(r.lane) < 5 || g.rnd() < r.ai.mistake) return;
  let best = r.lane;
  for (let l = 0; l < LANES; l++) if (cost(l) < cost(best)) best = l;
  if (best === r.lane) return;
  const d = Math.sign(best - r.lane);
  if (!laneTaken(g, r, r.lane + d, 1.5)) changeLane(r, d, g);
}


export function step(g, dt) {
  if (g.stopped) return;
  if (g.queue.length) {
    for (const q of g.queue) q.t -= dt;
    g.queue = g.queue.filter((q) => q.t > 0);
    if (g.queue.length && inSwitch(g.track, g.dist)) applyMove(g, g.queue.shift().dir);
  }
  stepTrain(g, dt, g, true);
  for (const r of g.rivals) {
    stepAI(r, g, dt);
    stepTrain(r, dt, g, false);
  }
}

/** Aktueller Rang des Spielers (1 = vorn). */
export function currentPlace(g) {
  if (g.finished) return g.place;
  let p = 1;
  for (const r of g.rivals) if (r.finished || r.dist > g.dist) p++;
  return p;
}

/**
 * Sterne (vorläufig, offen in SPEC):
 * Rennen: Platz 1 = 3, Platz 2 = 2, Platz 3 und 4 = 1.
 * Solo: 1 Stern fürs Ziel, +1 ab 50 %, +1 ab 80 % der Sammelobjekte.
 */
export function starsFor(g) {
  if (!g.finished) return 0;
  if (g.rivals.length) return [3, 2, 1, 1][Math.min(3, g.place - 1)];
  const r = g.totalItems ? g.collected / g.totalItems : 1;
  return 1 + (r >= 0.5 ? 1 : 0) + (r >= 0.8 ? 1 : 0);
}
