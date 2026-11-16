import * as THREE from 'three';
import { buildSteamLoco } from '../models/locos/steamLoco.js';
import { COUPLER_LEN } from '../models/shared.js';
import { WAGON_TYPES } from './stage.js';
import { LANES } from '../logic/constants.js';
import { jumpHeight } from '../logic/game.js';
import { SWITCH_LEN, curveAt } from '../logic/track.js';
import { bend, lambert as lam, applyBend } from './bend.js';

export const LANE_W = 1.4;
const laneX = (lane) => (lane - (LANES - 1) / 2) * LANE_W;
const VIEW_AHEAD = 75;
const VIEW_BEHIND = 6;
const SLEEPER_STEP = 0.7;
const RAIL_STEP = 2;
const BED_STEP = 4;

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

  // Boden
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(260, 260), lam(0xa9d18e));
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  // Schotterbett, Schienen und Schwellen in kurzen Stücken, damit sie sich sauber biegen lassen
  const bedW = LANES * LANE_W + 0.6;
  const span = VIEW_AHEAD + VIEW_BEHIND;
  const m4 = new THREE.Matrix4();
  const instanced = (geo, color, count) => new THREE.InstancedMesh(geo, lam(color), count);

  const nBed = Math.ceil(span / BED_STEP) + 2;
  const bed = instanced(new THREE.BoxGeometry(bedW, 0.05, BED_STEP + 0.05), 0xc9b99a, nBed);
  for (let i = 0; i < nBed; i++) { m4.setPosition(0, 0.02, VIEW_BEHIND - i * BED_STEP); bed.setMatrixAt(i, m4); }
  scene.add(bed);

  const nRail = Math.ceil(span / RAIL_STEP) + 2;
  const rails = instanced(new THREE.BoxGeometry(0.08, 0.08, RAIL_STEP + 0.05), 0x9aa0ac, nRail * LANES * 2);
  let k = 0;
  for (let l = 0; l < LANES; l++) {
    for (const s of [-1, 1]) {
      for (let i = 0; i < nRail; i++) { m4.setPosition(laneX(l) + s * 0.46, 0.09, VIEW_BEHIND - i * RAIL_STEP); rails.setMatrixAt(k++, m4); }
    }
  }
  scene.add(rails);

  const nSleep = Math.ceil(span / SLEEPER_STEP) + 2;
  const sleepers = instanced(new THREE.BoxGeometry(1.3, 0.06, 0.18), 0x8b5e3c, nSleep * LANES);
  k = 0;
  for (let l = 0; l < LANES; l++) {
    for (let i = 0; i < nSleep; i++) { m4.setPosition(laneX(l), 0.07, VIEW_BEHIND - i * SLEEPER_STEP); sleepers.setMatrixAt(k++, m4); }
  }
  scene.add(sleepers);

  function scrollTrack(dist) {
    bed.position.z = dist % BED_STEP;
    rails.position.z = dist % RAIL_STEP;
    sleepers.position.z = dist % SLEEPER_STEP;
  }

  // Weichen-Zonen: Überleit-Schienen, helle Bodenmarkierung, Schilder
  const switchPool = [];
  const crossGeo = new THREE.BoxGeometry(0.08, 0.08, 2.1);
  const crossMat = lam(0x9aa0ac);
  const zoneMat = applyBend(new THREE.MeshBasicMaterial({ color: 0xfff3b0, transparent: true, opacity: 0.45 }));
  function makeSwitch() {
    const g = new THREE.Group();
    const zone = new THREE.Mesh(new THREE.BoxGeometry(bedW, 0.02, SWITCH_LEN), zoneMat);
    zone.position.set(0, 0.055, -SWITCH_LEN / 2);
    g.add(zone);
    const n = Math.ceil(SWITCH_LEN / 2);
    const cross = new THREE.InstancedMesh(crossGeo, crossMat, (LANES - 1) * 2 * 2 * n);
    let i = 0;
    const dummy = new THREE.Object3D();
    for (let l = 0; l < LANES - 1; l++) {
      for (const dir of [1, -1]) {
        const x0 = dir === 1 ? laneX(l) : laneX(l + 1);
        const ang = Math.atan2(-dir * LANE_W, SWITCH_LEN);
        for (const s of [-1, 1]) {
          for (let p = 0; p < n; p++) {
            const f = (p + 0.5) / n;
            dummy.position.set(x0 + dir * LANE_W * f + s * 0.46, 0.1, -SWITCH_LEN * f);
            dummy.rotation.set(0, ang, 0);
            dummy.updateMatrix();
            cross.setMatrixAt(i++, dummy.matrix);
          }
        }
      }
    }
    g.add(cross);
    // Schilder links und rechts: gelbe Tafel mit Doppelpfeil
    for (const sx of [-1, 1]) {
      const x = sx * (bedW / 2 + 0.35);
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.8, 8), lam(0x2d3038));
      post.position.set(x, 0.9, 0);
      g.add(post);
      const board = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.7, 0.1), lam(0xffc83d));
      board.position.set(x, 1.9, 0);
      g.add(board);
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.1, 0.12), lam(0x2d3038));
      bar.position.set(x, 1.9, 0.01);
      g.add(bar);
      for (const e of [-1, 1]) {
        const tip = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.24, 3), lam(0x2d3038));
        tip.rotation.z = -e * Math.PI / 2;
        tip.position.set(x + e * 0.33, 1.9, 0.01);
        g.add(tip);
      }
    }
    g.visible = false;
    scene.add(g);
    return g;
  }
  for (let i = 0; i < 3; i++) switchPool.push(makeSwitch());

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
    return { group, loco, wagonObjs, wagonOffsets, trail: [], curX: laneX(state.lane), yaw: 0, wobble: 0, state };
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

  function syncVisual(v, dt, isPlayer) {
    const t = v.state;
    const goal = laneX(t.lane);
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
    void isPlayer;
  }

  let hitSeen = 0;
  function sync(dt, events) {
    if (!game) return;
    const g = game;
    visuals.forEach((v, i) => {
      // Treffer-Wackeln für Rivalen: an der Trefferzahl erkennen
      if (i > 0 && v.state.hits > (v.lastHits ?? 0)) v.wobble = 0.5;
      v.lastHits = v.state.hits;
      syncVisual(v, dt, i === 0);
    });
    const pv = visuals[0];
    const curX = pv.curX;
    void hitSeen;

    scrollTrack(g.dist);

    // Kurven (nur optisch): Welt biegt sich sanft in die kommende Kurve
    const targetBend = curveAt(g.track, g.dist + 22);
    bend.value += (targetBend - bend.value) * Math.min(1, dt * 1.5);

    // Weichen-Zonen im Sichtfenster
    let si = 0;
    for (const s of g.track.switches) {
      if (s.end < g.dist - VIEW_BEHIND || s.start > g.dist + VIEW_AHEAD) continue;
      if (si >= switchPool.length) break;
      const sg = switchPool[si++];
      sg.visible = true;
      sg.position.z = zOf(s.start);
    }
    for (; si < switchPool.length; si++) switchPool[si].visible = false;

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
        m.position.x = laneX(o.lane);
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

    // Kamera: hinter dem Spielerzug, sanft seitlich mitgeführt, Tempo = leichter Zoom
    const cx = curX * 0.55;
    const n = pv.wagonObjs.length;
    camera.position.set(cx, 4.4 + n * 0.45, 7.5 + n * 2.2 + Math.min(1, g.speed / 12) * 0.6);
    camera.lookAt(curX * 0.8, 0.3, -6);
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
