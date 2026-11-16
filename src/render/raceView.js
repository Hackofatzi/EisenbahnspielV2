import * as THREE from 'three';
import { buildSteamLoco } from '../models/locos/steamLoco.js';
import { COUPLER_LEN } from '../models/shared.js';
import { WAGON_TYPES } from './stage.js';
import { LANES } from '../logic/constants.js';
import { jumpHeight } from '../logic/game.js';
import { SWITCH_LEN, curveAt } from '../logic/track.js';
import { bend, lambert as lam, applyBend } from './bend.js';
import { LANE_W, laneXs, laneXAt } from './laneGeometry.js';

const VIEW_AHEAD = 75;
const VIEW_BEHIND = 6;
const SLEEPER_STEP = 0.8;
const RAIL_STEP = 2;
const BED_STEP = 4;
const MAX_SWITCHES = 8;
const SW_PIECES = Math.ceil(SWITCH_LEN / 2);

function starGeometry() {
  const s = new THREE.Shape();
  const R = 0.34;
  const r = 0.16;
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + Math.PI / 2;
    const rad = i % 2 === 0 ? R : r;
    const x = Math.cos(a) * rad;
    const y = Math.sin(a) * rad;
    if (i === 0) s.moveTo(x, y); else s.lineTo(x, y);
  }
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.12, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 1 });
  g.translate(0, 0, -0.06);
  return g;
}

/** Schreibt eine Instanz-Matrix (Drehung um Y, Skalierung in x/z) direkt ins Array. */
function put(mesh, idx, x, y, z, yaw, sx = 1, sz = 1) {
  const a = mesh.instanceMatrix.array;
  const o = idx * 16;
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  a[o] = c * sx; a[o + 1] = 0; a[o + 2] = -s * sx; a[o + 3] = 0;
  a[o + 4] = 0; a[o + 5] = 1; a[o + 6] = 0; a[o + 7] = 0;
  a[o + 8] = s * sz; a[o + 9] = 0; a[o + 10] = c * sz; a[o + 11] = 0;
  a[o + 12] = x; a[o + 13] = y; a[o + 14] = z; a[o + 15] = 1;
}

/** Rennansicht: Zug bleibt bei z=0, die Welt läuft nach +Z an der Kamera vorbei. */
export function createRaceView() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xcfe8f7);
  scene.fog = new THREE.Fog(0xcfe8f7, 40, 80);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8899aa, 1.5));
  const sun = new THREE.DirectionalLight(0xffffff, 1.6);
  sun.position.set(4, 8, 5);
  scene.add(sun);
  const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 100);

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(260, 260), lam(0xa9d18e));
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  // Jede Spur hat ihren eigenen Verlauf: Schotter, Schienen und Schwellen als kurze Stücke
  const bedW = LANES * LANE_W + 0.6; // Breite für den Zielbogen
  const span = VIEW_AHEAD + VIEW_BEHIND;
  const inst = (geo, color, count) => {
    const m = new THREE.InstancedMesh(geo, lam(color), count);
    m.frustumCulled = false;
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(m);
    return m;
  };
  const nBed = Math.ceil(span / BED_STEP) + 2;
  const nRail = Math.ceil(span / RAIL_STEP) + 2;
  const nSleep = Math.ceil(span / SLEEPER_STEP) + 2;
  const bed = inst(new THREE.BoxGeometry(1.8, 0.05, BED_STEP + 0.15), 0xc9b99a, nBed * LANES);
  const rails = inst(new THREE.BoxGeometry(0.08, 0.08, RAIL_STEP + 0.08), 0x9aa0ac, nRail * LANES * 2);
  const sleepers = inst(new THREE.BoxGeometry(1.3, 0.06, 0.18), 0x8b5e3c, nSleep * LANES);

  const xa = new Array(LANES);
  const xb = new Array(LANES);
  const xc = new Array(LANES);
  /** Stücke der Länge `step` entlang der Strecke: für jedes Stück die Mitte aller Spuren und die Drehung. */
  function eachPiece(track, dist, step, count, fn) {
    const base = Math.floor(dist / step) * step - VIEW_BEHIND;
    for (let i = 0; i < count; i++) {
      const s = base + i * step; // Streckenstelle der Stückmitte
      const z = -(s - dist);
      laneXs(track, s - step / 2, xa);
      laneXs(track, s + step / 2, xb);
      laneXs(track, s, xc);
      fn(i, s, z);
    }
  }

  // Weichen: Überleit-Schienen, helle Markierung, Schilder (je Spurpaar an eigener Stelle)
  const cross = inst(new THREE.BoxGeometry(0.08, 0.08, 2.1), 0x9aa0ac, MAX_SWITCHES * 4 * SW_PIECES);
  const zoneMat = applyBend(new THREE.MeshBasicMaterial({ color: 0xfff3b0, transparent: true, opacity: 0.5 }));
  const zone = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.02, 2.1), zoneMat, MAX_SWITCHES * SW_PIECES);
  zone.frustumCulled = false;
  zone.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  scene.add(zone);
  const signs = [];
  function makeSign() {
    const g = new THREE.Group();
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.8, 8), lam(0x2d3038));
    post.position.y = 0.9;
    g.add(post);
    const board = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.7, 0.1), lam(0xffc83d));
    board.position.y = 1.9;
    g.add(board);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.1, 0.12), lam(0x2d3038));
    bar.position.set(0, 1.9, 0.01);
    g.add(bar);
    for (const e of [-1, 1]) {
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.24, 3), lam(0x2d3038));
      tip.rotation.z = -e * Math.PI / 2;
      tip.position.set(e * 0.33, 1.9, 0.01);
      g.add(tip);
    }
    g.visible = false;
    scene.add(g);
    return g;
  }
  for (let i = 0; i < MAX_SWITCHES * 2; i++) signs.push(makeSign());

  function updateTrack(g) {
    const tr = g.track;
    const dist = g.dist;
    eachPiece(tr, dist, BED_STEP, nBed, (i, s, z) => {
      for (let l = 0; l < LANES; l++) {
        put(bed, l * nBed + i, xc[l], 0.02, z, Math.atan2(-(xb[l] - xa[l]), BED_STEP));
      }
    });
    eachPiece(tr, dist, RAIL_STEP, nRail, (i, s, z) => {
      for (let l = 0; l < LANES; l++) {
        const yaw = Math.atan2(-(xb[l] - xa[l]), RAIL_STEP);
        const ox = Math.cos(yaw) * 0.46;
        const oz = -Math.sin(yaw) * 0.46;
        put(rails, (l * 2) * nRail + i, xc[l] - ox, 0.09, z - oz, yaw);
        put(rails, (l * 2 + 1) * nRail + i, xc[l] + ox, 0.09, z + oz, yaw);
      }
    });
    eachPiece(tr, dist, SLEEPER_STEP, nSleep, (i, s, z) => {
      for (let l = 0; l < LANES; l++) {
        put(sleepers, l * nSleep + i, xc[l], 0.07, z, Math.atan2(-(xb[l] - xa[l]), SLEEPER_STEP));
      }
    });
    bed.instanceMatrix.needsUpdate = true;
    rails.instanceMatrix.needsUpdate = true;
    sleepers.instanceMatrix.needsUpdate = true;

    // Weichen im Sichtfenster
    let k = 0;
    let zc = 0;
    let si = 0;
    const lo = dist - VIEW_BEHIND - SWITCH_LEN;
    const hi = dist + VIEW_AHEAD;
    for (const sw of tr.switches) {
      if (sw.start < lo || sw.start > hi) continue;
      if (si >= MAX_SWITCHES) break;
      const L = SWITCH_LEN;
      for (let p = 0; p < SW_PIECES; p++) {
        const f = (p + 0.5) / SW_PIECES;
        const s = sw.start + f * L;
        const z = -(s - dist);
        laneXs(tr, s, xc);
        const xp = xc[sw.pair];
        const xq = xc[sw.pair + 1];
        // Überleiter in beide Richtungen, je zwei Schienen
        for (const dir of [1, -1]) {
          const x = dir === 1 ? xp + (xq - xp) * f : xq + (xp - xq) * f;
          const slope = dir === 1 ? (xq - xp) / L : (xp - xq) / L;
          const yaw = Math.atan2(-slope, 1);
          const ox = Math.cos(yaw) * 0.46;
          const oz = -Math.sin(yaw) * 0.46;
          put(cross, k++, x - ox, 0.1, z - oz, yaw);
          put(cross, k++, x + ox, 0.1, z + oz, yaw);
        }
        put(zone, zc++, (xp + xq) / 2, 0.055, z, 0, Math.abs(xq - xp) + 1.9, 1);
      }
      laneXs(tr, sw.start, xc);
      const zS = -(sw.start - dist);
      const left = signs[si * 2];
      const right = signs[si * 2 + 1];
      left.visible = right.visible = true;
      left.position.set(xc[sw.pair] - 1.15, 0, zS);
      right.position.set(xc[sw.pair + 1] + 1.15, 0, zS);
      si++;
    }
    for (let i = si * 2; i < signs.length; i++) signs[i].visible = false;
    cross.count = k;
    zone.count = zc;
    cross.instanceMatrix.needsUpdate = true;
    zone.instanceMatrix.needsUpdate = true;
  }

  // Hindernisse und Sterne (Pool)
  const lowGeo = new THREE.BoxGeometry(1.0, 0.35, 0.3);
  const lowStripe = new THREE.BoxGeometry(0.2, 0.37, 0.32);
  const blockGeo = new THREE.BoxGeometry(0.9, 0.9, 0.9);
  const starGeo = starGeometry();
  const starMat = lam(0xffc83d);
  const poolLow = [];
  const poolBlock = [];
  const poolStar = [];

  function makeLow() {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(lowGeo, lam(0xffffff)));
    for (const x of [-0.35, 0, 0.35]) {
      const s = new THREE.Mesh(lowStripe, lam(0xd8362f));
      s.position.x = x;
      g.add(s);
    }
    g.position.y = 0.3;
    return g;
  }
  function makeBlock() {
    const g = new THREE.Group();
    const b = new THREE.Mesh(blockGeo, lam(0x8b5e3c));
    b.position.y = 0.45;
    g.add(b);
    const band = new THREE.Mesh(new THREE.BoxGeometry(0.94, 0.14, 0.94), lam(0xffc83d));
    band.position.y = 0.45;
    g.add(band);
    return g;
  }
  const take = (pool, make) => {
    const m = pool.find((q) => !q.visible && q.userData.free) ?? null;
    if (m) return m;
    const n = make();
    n.userData.free = true;
    scene.add(n);
    pool.push(n);
    return n;
  };

  // Zielbogen
  const gate = new THREE.Group();
  for (const s of [-1, 1]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 3.6, 10), lam(0xd8362f));
    post.position.set(s * (bedW / 2 + 0.2), 1.8, 0);
    gate.add(post);
  }
  const check = new THREE.Group();
  const cols = 14;
  const cw = (bedW + 0.8) / cols;
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < 2; j++) {
      const c = new THREE.Mesh(new THREE.BoxGeometry(cw, 0.3, 0.12), lam((i + j) % 2 ? 0x2d3038 : 0xffffff));
      c.position.set(-bedW / 2 - 0.4 + cw * (i + 0.5), 3.5 - j * 0.3, 0);
      check.add(c);
    }
  }
  gate.add(check);
  scene.add(gate);

  // Konfetti
  const confetti = [];
  const confGeo = new THREE.BoxGeometry(0.14, 0.14, 0.02);
  const confCols = [0xd8362f, 0xffc83d, 0x3b82c4, 0x2fa84f, 0xffffff];
  for (let i = 0; i < 40; i++) {
    const c = new THREE.Mesh(confGeo, lam(confCols[i % confCols.length]));
    c.visible = false;
    c.userData = { vx: 0, vy: 0, vz: 0, t: 0 };
    scene.add(c);
    confetti.push(c);
  }

  // Züge (Spieler + Rivalen)
  let game = null;
  let visuals = []; // [0] = Spieler
  const active = new Map(); // Objekt -> Mesh

  function buildVisual(color, wagonTypes, state) {
    const group = new THREE.Group();
    const loco = buildSteamLoco({ color, detail: 'low' });
    group.add(loco);
    const wagonObjs = [];
    const wagonOffsets = [];
    let off = 1.2 + COUPLER_LEN + 1.0;
    for (const w of wagonTypes) {
      const wg = WAGON_TYPES[w].build({ color: WAGON_TYPES[w].color, detail: 'low' });
      wg.position.z = off;
      group.add(wg);
      wagonObjs.push(wg);
      wagonOffsets.push(off);
      off += 2.0 + COUPLER_LEN;
    }
    scene.add(group);
    return { group, loco, wagonObjs, wagonOffsets, trail: [], curX: laneXAt(game.track, state.lane, 0), yaw: 0, wobble: 0, state };
  }

  /** wagonTypes: Wagen des Spielers; rivals: [{ color, wagonTypes }] in Reihenfolge von g.rivals. */
  function start(g, { color, wagonTypes, rivals = [] }) {
    game = g;
    for (const v of visuals) scene.remove(v.group);
    for (const m of active.values()) { m.visible = false; m.userData.free = true; }
    active.clear();
    visuals = [buildVisual(color, wagonTypes, g)];
    if (rivals.length) {
      // Pfeil über der eigenen Lok, damit man sie zwischen den Rivalen findet
      const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.5, 10).rotateX(Math.PI), lam(0xffc83d));
      arrow.position.set(0, 2.4, 0);
      visuals[0].loco.add(arrow);
    }
    rivals.forEach((r, i) => visuals.push(buildVisual(r.color, r.wagonTypes, g.rivals[i])));
    for (const c of confetti) c.visible = false;
    gate.position.z = -9999;
    bend.value = 0;
  }

  function burstConfetti() {
    for (const c of confetti) {
      c.visible = true;
      c.position.set((Math.random() - 0.5) * bedW, 3.5, gate.position.z + 1);
      c.userData = { vx: (Math.random() - 0.5) * 3, vy: 2 + Math.random() * 4, vz: 3 + Math.random() * 4, t: 0 };
    }
  }

  function sampleTrail(v, d) {
    // x der Lok an der Strecke d (für nachlaufende Wagen)
    for (let i = v.trail.length - 1; i >= 0; i--) if (v.trail[i].d <= d) return v.trail[i].x;
    return v.trail.length ? v.trail[0].x : v.curX;
  }

  const zOf = (z) => -(z - game.dist);

  function syncVisual(v, dt) {
    const t = v.state;
    const goal = laneXAt(game.track, t.lane, t.dist);
    const prevX = v.curX;
    v.curX += (goal - v.curX) * (1 - Math.pow(0.0004, dt));
    const vx = (v.curX - prevX) / Math.max(dt, 1e-4);
    v.yaw += (-vx * 0.05 - v.yaw) * Math.min(1, dt * 10);
    v.trail.push({ d: t.dist, x: v.curX });
    if (v.trail.length > 400) v.trail.shift();

    const h = jumpHeight(t);
    v.group.position.z = -(t.dist - game.dist);
    v.group.visible = v.group.position.z < 6 && v.group.position.z > -VIEW_AHEAD;
    if (!v.group.visible) return;
    v.loco.position.set(v.curX, h, 0);
    v.loco.rotation.y = v.yaw;
    v.wobble = Math.max(0, v.wobble - dt);
    v.loco.rotation.z = Math.sin(v.wobble * 40) * v.wobble * 0.25;
    v.wagonObjs.forEach((w, i) => {
      w.position.x = sampleTrail(v, t.dist - v.wagonOffsets[i]);
      w.position.y = i === 0 ? h * 0.6 : h * 0.3;
    });
    v.group.traverse((o) => { if (o.userData.animate) o.userData.animate(t.dist); });
  }

  function sync(dt, events) {
    if (!game) return;
    const g = game;
    visuals.forEach((v, i) => {
      // Treffer-Wackeln für Rivalen: an der Trefferzahl erkennen
      if (i > 0 && v.state.hits > (v.lastHits ?? 0)) v.wobble = 0.5;
      v.lastHits = v.state.hits;
      syncVisual(v, dt);
    });
    const pv = visuals[0];
    const curX = pv.curX;

    updateTrack(g);

    // Kurven (nur optisch): Welt biegt sich sanft in die kommende Kurve
    const targetBend = curveAt(g.track, g.dist + 22);
    bend.value += (targetBend - bend.value) * Math.min(1, dt * 1.5);

    // sichtbare Objekte aus dem Fenster holen
    const lo = g.dist - VIEW_BEHIND;
    const hi = g.dist + VIEW_AHEAD;
    for (const [obj, mesh] of active) {
      if (obj.z < lo || obj.z > hi || (obj.got === true)) {
        mesh.visible = false;
        mesh.userData.free = true;
        active.delete(obj);
      }
    }
    const t = performance.now() / 1000;
    const place = (list, getPool, getMake, key) => {
      for (const o of list) {
        if (o.z < lo) continue;
        if (o.z > hi) break;
        if (o.got === true) continue;
        let m = active.get(o);
        if (!m) {
          m = take(getPool(o), getMake(o));
          m.visible = true;
          m.userData.free = false;
          active.set(o, m);
          m.position.y = key === 'star' ? 0.85 : (o.type === 'low' ? 0.3 : 0);
        }
        m.position.x = laneXAt(g.track, o.lane, o.z);
        m.position.z = zOf(o.z);
        if (key === 'star') {
          m.position.y = 0.85;
          m.rotation.y = t * 2.5 + o.z;
        } else if (g.hitSet.has(o)) {
          m.position.y += (0.6 - m.position.y) * 0.3; // vom Spieler getroffen: hüpft weg
        }
      }
    };
    place(g.track.obstacles, (o) => (o.type === 'low' ? poolLow : poolBlock), (o) => (o.type === 'low' ? makeLow : makeBlock), 'obs');
    place(g.track.items, () => poolStar, () => () => new THREE.Mesh(starGeo, starMat), 'star');

    // Zielbogen
    gate.position.z = zOf(g.track.finishZ);
    gate.visible = gate.position.z > -VIEW_AHEAD;

    for (const e of events) {
      if (e.type === 'hit') pv.wobble = 0.5;
      if (e.type === 'cut' || e.type === 'blocked') pv.wobble = 0.3;
      if (e.type === 'locked') pv.wobble = 0.15;
      if (e.type === 'finish') burstConfetti();
    }
    for (const c of confetti) {
      if (!c.visible) continue;
      const u = c.userData;
      u.t += dt;
      u.vy -= 9 * dt;
      c.position.x += u.vx * dt;
      c.position.y += u.vy * dt;
      c.position.z += u.vz * dt;
      c.rotation.x += dt * 6;
      c.rotation.y += dt * 4;
      if (c.position.y < 0.05 || u.t > 3) c.visible = false;
    }

    // Kamera: folgt dem Spielerzug seitlich (andere Züge dürfen aus dem Bild laufen)
    const n = pv.wagonObjs.length;
    camera.position.set(curX * 0.9, 4.4 + n * 0.45, 7.5 + n * 2.2 + Math.min(1, g.speed / 12) * 0.6);
    camera.lookAt(curX * 0.9, 0.3, -6);
  }

  function resize(w, h) {
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  /** Beim Verlassen des Rennens: Kurvenbiegung zurücksetzen (Garage/Start sind gerade). */
  function stop() {
    bend.value = 0;
  }

  return { scene, camera, start, sync, resize, stop };
}
