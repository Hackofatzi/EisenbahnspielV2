import * as THREE from 'three';
import { buildSteamLoco } from '../models/locos/steamLoco.js';
import { COUPLER_LEN } from '../models/shared.js';
import { WAGON_TYPES } from './stage.js';
import { LANES } from '../logic/constants.js';
import { jumpHeight } from '../logic/game.js';

export const LANE_W = 1.4;
const laneX = (lane) => (lane - (LANES - 1) / 2) * LANE_W;
const VIEW_AHEAD = 75;
const VIEW_BEHIND = 6;
const SLEEPER_STEP = 0.7;

const lam = (c) => new THREE.MeshLambertMaterial({ color: c });

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

  // Boden, Schotter, Schienen
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), lam(0xa9d18e));
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);
  const bedW = LANES * LANE_W + 0.6;
  const bed = new THREE.Mesh(new THREE.BoxGeometry(bedW, 0.05, 200), lam(0xc9b99a));
  bed.position.set(0, 0.02, -60);
  scene.add(bed);
  const railGeo = new THREE.BoxGeometry(0.08, 0.08, 200);
  const railMat = lam(0x9aa0ac);
  for (let l = 0; l < LANES; l++) {
    for (const s of [-1, 1]) {
      const r = new THREE.Mesh(railGeo, railMat);
      r.position.set(laneX(l) + s * 0.46, 0.09, -60);
      scene.add(r);
    }
  }
  const nSleep = Math.ceil((VIEW_AHEAD + VIEW_BEHIND) / SLEEPER_STEP) + 2;
  const sleepers = new THREE.InstancedMesh(new THREE.BoxGeometry(1.3, 0.06, 0.18), lam(0x8b5e3c), nSleep * LANES);
  const m4 = new THREE.Matrix4();
  let k = 0;
  for (let l = 0; l < LANES; l++) {
    for (let i = 0; i < nSleep; i++) {
      m4.setPosition(laneX(l), 0.07, VIEW_BEHIND - i * SLEEPER_STEP);
      sleepers.setMatrixAt(k++, m4);
    }
  }
  scene.add(sleepers);

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

  // Zug
  let train = null;
  let loco = null;
  let wagonObjs = [];
  let wagonOffsets = [];
  let game = null;
  const trail = []; // { d, x }
  let curX = 0;
  let wobble = 0;
  let yaw = 0;
  const active = new Map(); // Objekt -> Mesh

  function start(g, { color, wagonTypes }) {
    game = g;
    if (train) scene.remove(train);
    for (const m of active.values()) { m.visible = false; m.userData.free = true; }
    active.clear();
    trail.length = 0;
    train = new THREE.Group();
    loco = buildSteamLoco({ color, detail: 'low' });
    train.add(loco);
    wagonObjs = [];
    wagonOffsets = [];
    let off = 1.2 + COUPLER_LEN + 1.0;
    for (const w of wagonTypes) {
      const wg = WAGON_TYPES[w].build({ color: WAGON_TYPES[w].color, detail: 'low' });
      wg.position.z = off;
      train.add(wg);
      wagonObjs.push(wg);
      wagonOffsets.push(off);
      off += 2.0 + COUPLER_LEN;
    }
    scene.add(train);
    curX = laneX(g.lane);
    for (const c of confetti) c.visible = false;
    wobble = 0;
    yaw = 0;
    gate.position.z = -9999;
  }

  function burstConfetti() {
    for (const c of confetti) {
      c.visible = true;
      c.position.set((Math.random() - 0.5) * bedW, 3.5, gate.position.z + 1);
      c.userData = { vx: (Math.random() - 0.5) * 3, vy: 2 + Math.random() * 4, vz: 3 + Math.random() * 4, t: 0 };
    }
  }

  function sampleTrail(d) {
    // x der Lok an der Strecke d (für nachlaufende Wagen)
    for (let i = trail.length - 1; i >= 0; i--) if (trail[i].d <= d) return trail[i].x;
    return trail.length ? trail[0].x : curX;
  }

  const zOf = (z) => -(z - game.dist);

  function sync(dt, events) {
    if (!game) return;
    const g = game;
    // Lok in Spur gleiten lassen
    const goal = laneX(g.lane);
    const prevX = curX;
    curX += (goal - curX) * (1 - Math.pow(0.0004, dt));
    const vx = (curX - prevX) / Math.max(dt, 1e-4);
    yaw += (-vx * 0.05 - yaw) * Math.min(1, dt * 10);
    trail.push({ d: g.dist, x: curX });
    if (trail.length > 400) trail.shift();

    const h = jumpHeight(g);
    train.position.set(0, 0, 0);
    loco.position.set(curX, h, 0);
    loco.rotation.y = yaw;
    wobble = Math.max(0, wobble - dt);
    loco.rotation.z = Math.sin(wobble * 40) * wobble * 0.25;
    wagonObjs.forEach((w, i) => {
      w.position.x = sampleTrail(g.dist - wagonOffsets[i]);
      w.position.y = i === 0 ? h * 0.6 : h * 0.3;
    });
    train.traverse((o) => { if (o.userData.animate) o.userData.animate(g.dist); });

    sleepers.position.z = g.dist % SLEEPER_STEP;

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
        } else if (o.hit) {
          m.position.y += (0.6 - m.position.y) * 0.3; // getroffen: hüpft weg
        }
      }
    };
    place(g.track.obstacles, (o) => (o.type === 'low' ? poolLow : poolBlock), (o) => (o.type === 'low' ? makeLow : makeBlock), 'obs');
    place(g.track.items, () => poolStar, () => () => new THREE.Mesh(starGeo, starMat), 'star');

    // Zielbogen
    gate.position.z = zOf(g.track.finishZ);
    gate.visible = gate.position.z > -VIEW_AHEAD;

    for (const e of events) {
      if (e.type === 'hit') wobble = 0.5;
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

    // Kamera: hinter dem Zug, sanft seitlich mitgeführt, Tempo = leichter Zoom
    const cx = curX * 0.55;
    const n = wagonObjs.length;
    camera.position.set(cx, 4.4 + n * 0.45, 7.5 + n * 2.2 + Math.min(1, g.speed / 12) * 0.6);
    camera.lookAt(curX * 0.8, 0.3, -6);
  }

  function resize(w, h) {
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  return { scene, camera, start, sync, resize };
}
