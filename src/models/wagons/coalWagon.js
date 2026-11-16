import * as THREE from 'three';
import { part, wheel, coupler, segs, roundBox } from '../shared.js';

export const WAGON_LENGTH = 2.0;

/** Kohlewagen: offene Wanne mit Kohlekugeln. */
export function buildCoalWagon({ color = 0x3b82c4, accentColor = 0xffc83d, scale = 1, detail = 'low' } = {}) {
  const g = new THREE.Group();
  const dark = 0x2d3038;
  const L = WAGON_LENGTH;

  g.add(part(roundBox(0.8, 0.14, L, 0.05, detail), dark, 0, 0.45, 0));
  // Wanne: Boden + 4 Wände
  g.add(part(new THREE.BoxGeometry(0.84, 0.08, L - 0.1), color, 0, 0.58, 0));
  g.add(part(new THREE.BoxGeometry(0.08, 0.5, L - 0.1), color, -0.42, 0.82, 0));
  g.add(part(new THREE.BoxGeometry(0.08, 0.5, L - 0.1), color, 0.42, 0.82, 0));
  g.add(part(new THREE.BoxGeometry(0.84, 0.5, 0.08), color, 0, 0.82, -L / 2 + 0.09));
  g.add(part(new THREE.BoxGeometry(0.84, 0.5, 0.08), color, 0, 0.82, L / 2 - 0.09));
  // Zierband
  g.add(part(new THREE.BoxGeometry(0.88, 0.07, L - 0.04), accentColor, 0, 1.1, 0));

  // Kohlekugeln
  const sph = new THREE.SphereGeometry(0.2, segs(detail, 8, 10), segs(detail, 6, 7));
  const spots = [[-0.2, 0, -0.6], [0.2, 0.02, -0.55], [0, 0.06, -0.2], [-0.22, 0, 0.1], [0.22, 0.04, 0.15],
    [0, 0.08, 0.5], [-0.2, 0, 0.6], [0.2, 0, 0.62]];
  const use = detail === 'high' ? spots : spots.filter((_, i) => i % 2 === 0);
  for (const [x, dy, z] of use) g.add(part(sph, 0x22252b, x, 1.02 + dy, z));

  const wheels = [];
  for (const sx of [-1, 1]) for (const z of [-0.6, 0.6]) {
    const w = wheel(0.26, 0.1, dark, accentColor, detail);
    w.position.set(sx * 0.46, 0.26, z);
    g.add(w);
    wheels.push(w);
  }
  g.add(coupler(-L / 2, -1));
  g.add(coupler(L / 2, 1));
  g.scale.setScalar(scale);
  const animate = (dist) => { for (const w of wheels) w.rotation.x = -dist / 0.26; };
  g.userData = { length: L, kind: 'wagon', animate };
  return g;
}
