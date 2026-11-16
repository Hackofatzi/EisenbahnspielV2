import * as THREE from 'three';
import { part, wheel, coupler, segs, roundBox } from '../shared.js';

export const STEAM_LOCO_LENGTH = 2.4;

/**
 * Dampflok: liegender Kessel mit Ringen und Dom, Schornstein mit Trichter,
 * Führerhaus mit überstehendem Dach, Schienenräumer, 2 große + 2 kleine Räder.
 * @param {{color?:number, accentColor?:number, scale?:number, detail?:'low'|'high'}} p
 */
export function buildSteamLoco({ color = 0xd8362f, accentColor = 0xffc83d, scale = 1, detail = 'low' } = {}) {
  const g = new THREE.Group();
  const dark = 0x2d3038;
  const L = STEAM_LOCO_LENGTH;
  const n = segs(detail, 14, 28);

  // Fahrgestell
  g.add(part(roundBox(0.8, 0.18, L, 0.06, detail), dark, 0, 0.45, 0));

  // Kessel (liegender Zylinder, entlang Z)
  const boiler = new THREE.CylinderGeometry(0.34, 0.34, 1.5, n);
  boiler.rotateX(Math.PI / 2);
  g.add(part(boiler, color, 0, 0.88, -0.35));
  // Rauchkammer vorne (dunkel) mit Frontscheibe
  const smoke = new THREE.CylinderGeometry(0.35, 0.35, 0.22, n);
  smoke.rotateX(Math.PI / 2);
  g.add(part(smoke, dark, 0, 0.88, -1.1));
  // Scheinwerfer
  g.add(part(new THREE.SphereGeometry(0.1, segs(detail, 8, 14), segs(detail, 6, 10)), 0xfff3b0, 0, 0.95, -1.24));

  // Ringe am Kessel
  const rings = detail === 'high' ? [-0.8, -0.35, 0.1] : [-0.55];
  for (const z of rings) {
    const r = new THREE.CylinderGeometry(0.36, 0.36, 0.06, n);
    r.rotateX(Math.PI / 2);
    g.add(part(r, accentColor, 0, 0.88, z));
  }

  // Dom
  g.add(part(new THREE.SphereGeometry(0.15, segs(detail, 8, 16), segs(detail, 6, 10)), accentColor, 0, 1.25, -0.3));

  // Schornstein mit Trichter
  const stack = new THREE.CylinderGeometry(0.09, 0.09, 0.3, segs(detail, 8, 16));
  g.add(part(stack, dark, 0, 1.3, -0.95));
  const funnel = new THREE.CylinderGeometry(0.2, 0.09, 0.18, segs(detail, 10, 18));
  g.add(part(funnel, dark, 0, 1.54, -0.95));

  // Führerhaus + überstehendes Dach
  g.add(part(roundBox(0.8, 0.78, 0.7, 0.08, detail), color, 0, 0.99, 0.75));
  g.add(part(new THREE.BoxGeometry(0.94, 0.08, 0.95), accentColor, 0, 1.42, 0.75));
  if (detail === 'high') {
    g.add(part(new THREE.BoxGeometry(0.82, 0.26, 0.4), 0x9ad7ff, 0, 1.1, 0.75)); // Fensterband
  } else {
    g.add(part(new THREE.BoxGeometry(0.82, 0.24, 0.36), 0x9ad7ff, 0, 1.1, 0.75));
  }

  // Schienenräumer (Keil)
  const wedge = new THREE.BufferGeometry();
  const v = new Float32Array([
    -0.4, 0, 0,   0.4, 0, 0,   0, 0, -0.35,
    -0.4, 0.3, 0, 0.4, 0.3, 0, 0, 0, -0.35,
  ]);
  const idx = [0, 2, 1, 3, 4, 5, 0, 3, 5, 0, 5, 2, 1, 2, 5, 1, 5, 4, 0, 1, 4, 0, 4, 3];
  wedge.setAttribute('position', new THREE.BufferAttribute(v, 3));
  wedge.setIndex(idx);
  wedge.computeVertexNormals();
  g.add(part(wedge, accentColor, 0, 0.32, -L / 2 - 0.0));

  // Räder: 2 große hinten, 2 kleine vorne (pro Seite)
  for (const sx of [-1, 1]) {
    const big1 = wheel(0.38, 0.1, dark, accentColor, detail);
    big1.position.set(sx * 0.46, 0.38, 0.55);
    g.add(big1);
    const big2 = wheel(0.38, 0.1, dark, accentColor, detail);
    big2.position.set(sx * 0.46, 0.38, 0.0);
    g.add(big2);
    const sm1 = wheel(0.24, 0.1, dark, accentColor, detail);
    sm1.position.set(sx * 0.46, 0.24, -0.6);
    g.add(sm1);
    const sm2 = wheel(0.24, 0.1, dark, accentColor, detail);
    sm2.position.set(sx * 0.46, 0.24, -1.0);
    g.add(sm2);
  }

  g.add(coupler(L / 2, 1));
  g.scale.setScalar(scale);
  g.userData = { length: L, kind: 'loco' };
  return g;
}
