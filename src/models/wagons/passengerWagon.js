import * as THREE from 'three';
import { part, wheel, coupler, segs, roundBox } from '../shared.js';
import { WAGON_LENGTH } from './coalWagon.js';

/** Personenwagen: abgerundet, Fensterreihe, Rundumdach. */
export function buildPassengerWagon({ color = 0x2fa84f, accentColor = 0xffc83d, scale = 1, detail = 'low' } = {}) {
  const g = new THREE.Group();
  const dark = 0x2d3038;
  const L = WAGON_LENGTH;

  g.add(part(roundBox(0.8, 0.14, L, 0.05, detail), dark, 0, 0.45, 0));
  g.add(part(roundBox(0.86, 0.8, L - 0.1, 0.12, detail), color, 0, 0.98, 0));

  // Fensterreihe beidseitig
  const count = detail === 'high' ? 5 : 3;
  const step = (L - 0.5) / count;
  const win = new THREE.BoxGeometry(0.02, 0.24, step * 0.6);
  for (const sx of [-1, 1]) {
    for (let i = 0; i < count; i++) {
      const z = -L / 2 + 0.3 + step * (i + 0.5);
      g.add(part(win, 0x9ad7ff, sx * 0.435, 1.1, z));
    }
  }
  // Zierstreifen
  g.add(part(new THREE.BoxGeometry(0.88, 0.07, L - 0.08), accentColor, 0, 0.78, 0));
  // Rundumdach (Halbzylinder entlang Z)
  const roof = new THREE.CylinderGeometry(0.46, 0.46, L - 0.04, segs(detail, 12, 24), 1, false, 0, Math.PI);
  roof.rotateX(Math.PI / 2);
  roof.rotateZ(Math.PI / 2);
  g.add(part(roof, accentColor, 0, 1.34, 0));

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
