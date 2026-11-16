import * as THREE from 'three';
import { buildSteamLoco } from '../models/locos/steamLoco.js';
import { buildCoalWagon } from '../models/wagons/coalWagon.js';
import { buildPassengerWagon } from '../models/wagons/passengerWagon.js';
import { COUPLER_LEN } from '../models/shared.js';

export const WAGON_TYPES = {
  coal: { build: buildCoalWagon, color: 0x3b82c4 },
  passenger: { build: buildPassengerWagon, color: 0x2fa84f },
};

const easeOut = (x) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);

/** Bühne für Start- und Garage-Screen (eine Szene, zwei Modi). */
export function createStage(canvas, { onArrive } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xcfe8f7);
  scene.fog = new THREE.Fog(0xcfe8f7, 22, 48);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8899aa, 1.5));
  const sun = new THREE.DirectionalLight(0xffffff, 1.6);
  sun.position.set(4, 8, 5);
  scene.add(sun);

  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 80);

  // Boden, Schotterbett, Schienen, Schwellen
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), new THREE.MeshLambertMaterial({ color: 0xa9d18e }));
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);
  const bed = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.05, 90), new THREE.MeshLambertMaterial({ color: 0xc9b99a }));
  bed.position.set(0, 0.02, -25);
  scene.add(bed);
  for (const sx of [-1, 1]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 90), new THREE.MeshLambertMaterial({ color: 0x9aa0ac }));
    rail.position.set(sx * 0.46, 0.09, -25);
    scene.add(rail);
  }
  const sleepers = new THREE.InstancedMesh(new THREE.BoxGeometry(1.3, 0.06, 0.18), new THREE.MeshLambertMaterial({ color: 0x8b5e3c }), 160);
  const m4 = new THREE.Matrix4();
  for (let i = 0; i < 160; i++) {
    m4.setPosition(0, 0.07, 20 - i * 0.55);
    sleepers.setMatrixAt(i, m4);
  }
  scene.add(sleepers);

  // Dampf (Pool aus wiederverwendeten Kugeln)
  const puffGeo = new THREE.SphereGeometry(0.18, 8, 6);
  const puffs = [];
  for (let i = 0; i < 10; i++) {
    const p = new THREE.Mesh(puffGeo, new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0 }));
    p.userData = { life: 1, age: 1 };
    scene.add(p);
    puffs.push(p);
  }
  let puffTimer = 0;
  const emitPuff = (pos) => {
    const p = puffs.find((q) => q.userData.age >= q.userData.life);
    if (!p) return;
    p.position.copy(pos);
    p.userData = { age: 0, life: 1.6 };
  };

  // Zustand
  let mode = 'start';
  let color = 0xd8362f;
  let wagons = ['coal', 'passenger'];
  let train = null;
  let loco = null;
  let t0 = 0;
  let arrived = false;
  let dist = 0;
  let hornShake = 0;
  const camGoal = { pos: new THREE.Vector3(), look: new THREE.Vector3() };
  const camNow = { pos: new THREE.Vector3(), look: new THREE.Vector3() };

  function rebuild() {
    if (train) scene.remove(train);
    train = new THREE.Group();
    loco = buildSteamLoco({ color, detail: 'high' });
    train.add(loco);
    if (mode === 'garage') {
      let z = 1.2 + COUPLER_LEN;
      for (const w of wagons) {
        const wg = WAGON_TYPES[w].build({ color: WAGON_TYPES[w].color, detail: 'high' });
        wg.position.z = z + 1.0;
        train.add(wg);
        z += 2.0 + COUPLER_LEN;
      }
    }
    train.rotation.y = Math.PI; // Front zeigt zur Kamera (+Z)
    scene.add(train);
  }

  function setMode(m) {
    mode = m;
    rebuild();
    t0 = performance.now() / 1000;
    arrived = m !== 'start';
    if (m === 'start') {
      camGoal.pos.set(3.4, 2.1, 7.5);
      camGoal.look.set(0, 0.9, 0);
    } else {
      camGoal.pos.set(4.2, 3.6, 11.5);
      camGoal.look.set(0, -1.1, -1.5);
      train.position.set(1.0, 0, 2.2);
    }
  }

  function setColor(c) { color = c; rebuild(); if (mode === 'garage') train.position.set(1.0, 0, 2.2); }
  function setWagons(w) { wagons = w; rebuild(); train.position.set(1.0, 0, 2.2); }
  function honk() { hornShake = 0.4; }

  function resize() {
    const w = canvas.clientWidth || innerWidth;
    const h = canvas.clientHeight || innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  addEventListener('resize', resize);
  resize();
  setMode('start');
  camNow.pos.copy(camGoal.pos);
  camNow.look.copy(camGoal.look);

  let last = performance.now() / 1000;
  renderer.setAnimationLoop(() => {
    const now = performance.now() / 1000;
    const dt = Math.min(0.05, now - last);
    last = now;
    const t = now - t0;

    if (mode === 'start') {
      const k = easeOut(t / 3.4);
      train.position.z = -30 + 30 * k;
      dist = (train.position.z + 30);
      if (!arrived && t > 3.4) { arrived = true; onArrive?.(); hornShake = 0.4; }
      // sanftes Wippen im Stand
      if (arrived) train.position.y = Math.sin(now * 5) * 0.012;
    } else {
      train.rotation.y = Math.PI + Math.sin(now * 0.6) * 0.28;
      dist += 0;
    }
    train.traverse((o) => { if (o.userData.animate) o.userData.animate(dist); });

    // Dampf
    puffTimer -= dt;
    if (puffTimer <= 0) {
      puffTimer = arrived ? 0.5 : 0.22;
      const p = new THREE.Vector3(0, 1.62, -0.95).applyEuler(train.rotation).add(train.position);
      emitPuff(p);
    }
    for (const p of puffs) {
      const u = p.userData;
      if (u.age >= u.life) { p.material.opacity = 0; continue; }
      u.age += dt;
      const f = u.age / u.life;
      p.position.y += dt * 0.9;
      p.position.x += dt * 0.15;
      p.scale.setScalar(0.6 + f * 1.8);
      p.material.opacity = 0.9 * (1 - f);
    }

    // Tuten: kurzes Hüpfen
    if (hornShake > 0) {
      hornShake -= dt;
      train.position.y = Math.abs(Math.sin(hornShake * 30)) * 0.05;
    }

    camNow.pos.lerp(camGoal.pos, 1 - Math.pow(0.001, dt));
    camNow.look.lerp(camGoal.look, 1 - Math.pow(0.001, dt));
    camera.position.copy(camNow.pos);
    camera.lookAt(camNow.look);
    renderer.render(scene, camera);
  });

  return { setMode, setColor, setWagons, honk, resize };
}
