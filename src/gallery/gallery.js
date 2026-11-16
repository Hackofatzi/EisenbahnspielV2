import * as THREE from 'three';
import { buildSteamLoco } from '../models/locos/steamLoco.js';
import { buildCoalWagon } from '../models/wagons/coalWagon.js';
import { buildPassengerWagon } from '../models/wagons/passengerWagon.js';
import { countTriangles } from '../models/shared.js';

const MODELS = {
  Dampflok: { build: buildSteamLoco, limit: 4000 },
  Kohlewagen: { build: buildCoalWagon, limit: 2000 },
  Personenwagen: { build: buildPassengerWagon, limit: 2000 },
  Zug: { build: null },
};

const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xcfe8f7);
scene.add(new THREE.HemisphereLight(0xffffff, 0x8899aa, 1.5));
const sun = new THREE.DirectionalLight(0xffffff, 1.6);
sun.position.set(3, 6, 4);
scene.add(sun);
const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);

const ground = new THREE.Mesh(new THREE.CircleGeometry(4, 40), new THREE.MeshLambertMaterial({ color: 0xa9d18e }));
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

let current = null;
let name = 'Dampflok';
let detail = 'high';
let yaw = 0.6;
let pitch = 0.3;
let dist = 5;

function buildTrain(d) {
  const g = new THREE.Group();
  const loco = buildSteamLoco({ detail: d });
  const w1 = buildCoalWagon({ detail: d });
  const w2 = buildPassengerWagon({ detail: d });
  w1.position.z = 1.2 + 1.0 + 0.2;
  w2.position.z = w1.position.z + 2.2;
  g.add(loco, w1, w2);
  g.position.z = -0.6;
  return g;
}

function rebuild() {
  if (current) scene.remove(current);
  const m = MODELS[name];
  current = m.build ? m.build({ detail }) : buildTrain(detail);
  scene.add(current);
  const tri = countTriangles(current);
  const lim = m.limit ? ` (Richtwert ${m.limit})` : '';
  document.getElementById('info').textContent = `${name}, ${detail}: ${tri} Dreiecke${lim}`;
  const narrow = innerWidth < innerHeight ? 1.6 : 1;
  dist = (name === 'Zug' ? 9 : 5) * narrow;
  document.querySelectorAll('#ui button').forEach((b) => b.classList.toggle('on', b.dataset.k === name || b.dataset.k === detail));
}

const ui = document.getElementById('ui');
function btn(label, key, fn) {
  const b = document.createElement('button');
  b.textContent = label;
  b.dataset.k = key;
  b.onclick = () => { fn(); rebuild(); };
  ui.appendChild(b);
}
for (const k of Object.keys(MODELS)) btn(k, k, () => { name = k; });
btn('low', 'low', () => { detail = 'low'; });
btn('high', 'high', () => { detail = 'high'; });

// Drehen per Wisch/Maus, Zoom per Zweifinger oder Mausrad
const pts = new Map();
let pinch = 0;
canvas.addEventListener('pointerdown', (e) => { canvas.setPointerCapture(e.pointerId); pts.set(e.pointerId, e); });
canvas.addEventListener('pointerup', (e) => { pts.delete(e.pointerId); pinch = 0; });
canvas.addEventListener('pointermove', (e) => {
  const prev = pts.get(e.pointerId);
  if (!prev) return;
  if (pts.size === 1) {
    yaw -= (e.clientX - prev.clientX) * 0.01;
    pitch = Math.max(0.05, Math.min(1.3, pitch + (e.clientY - prev.clientY) * 0.01));
  }
  pts.set(e.pointerId, e);
  if (pts.size === 2) {
    const [a, b] = [...pts.values()];
    const d = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    if (pinch) dist = Math.max(2.5, Math.min(14, dist * (pinch / d)));
    pinch = d;
  }
});
canvas.addEventListener('wheel', (e) => { dist = Math.max(2.5, Math.min(14, dist + e.deltaY * 0.005)); });

function resize() {
  const w = innerWidth;
  const h = innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();
rebuild();

renderer.setAnimationLoop(() => {
  if (!pts.size) yaw += 0.004;
  camera.position.set(Math.sin(yaw) * Math.cos(pitch) * dist, Math.sin(pitch) * dist + 0.8, Math.cos(yaw) * Math.cos(pitch) * dist);
  camera.lookAt(0, 0.7, 0);
  renderer.render(scene, camera);
});
