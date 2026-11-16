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

  // Räder: 2 große hinten (Treibräder), 2 kleine vorne (pro Seite)
  const BIG_R = 0.38, SMALL_R = 0.24, PIN_R = 0.2;
  const BIG_Y = 0.38, BIG_Z = [0.55, 0.0];
  const rodColor = 0xb8bcc6;
  const wheels = []; // { obj, r }
  const sides = [];
  for (const sx of [-1, 1]) {
    const bigs = BIG_Z.map((z) => {
      const w = wheel(BIG_R, 0.1, dark, accentColor, detail);
      w.position.set(sx * 0.46, BIG_Y, z);
      // Kurbelzapfen (außen an der Nabe)
      w.add(part(new THREE.CylinderGeometry(0.05, 0.05, 0.08, 8).rotateZ(Math.PI / 2), rodColor, sx * 0.09, PIN_R, 0));
      g.add(w);
      wheels.push({ obj: w, r: BIG_R });
      return w;
    });
    for (const z of [-0.6, -1.0]) {
      const w = wheel(SMALL_R, 0.1, dark, accentColor, detail);
      w.position.set(sx * 0.46, SMALL_R, z);
      g.add(w);
      wheels.push({ obj: w, r: SMALL_R });
    }
    // Kuppelstange (verbindet die Treibräder), Treibstange, Kreuzkopf, Kolbenstange
    const px = sx * 0.58;
    const coupling = part(new THREE.BoxGeometry(0.04, 0.07, 0.55 + 0.12), rodColor, px, 0, 0);
    const conrod = part(new THREE.BoxGeometry(0.04, 0.07, 1), rodColor, px + sx * 0.03, 0, 0);
    const cross = part(new THREE.BoxGeometry(0.06, 0.1, 0.12), accentColor, px, 0.46, -0.7);
    const pistonRod = part(new THREE.CylinderGeometry(0.025, 0.025, 1, 6).rotateX(Math.PI / 2), rodColor, px, 0.46, -1);
    const cyl = part(new THREE.CylinderGeometry(0.08, 0.08, 0.26, segs(detail, 8, 14)).rotateX(Math.PI / 2), dark, px, 0.46, -1.2);
    g.add(coupling, conrod, cross, pistonRod, cyl);
    sides.push({ coupling, conrod, cross, pistonRod, bigs });
  }

  g.add(coupler(L / 2, 1));
  g.scale.setScalar(scale);

  const CROSS_Y = 0.46, CONROD_LEN = 0.78;
  /** Dreht die Räder und bewegt die Stangen. dist = zurückgelegte Strecke (Spureinheiten). */
  function animate(dist) {
    for (const { obj, r } of wheels) obj.rotation.x = -dist / r;
    const a = -dist / BIG_R; // Treibradwinkel
    const py = BIG_Y + PIN_R * Math.cos(a);
    const dz = PIN_R * Math.sin(a);
    for (const s of sides) {
      // Kuppelstange: beide Zapfen haben gleiche Phase, Stange bleibt waagerecht
      s.coupling.position.set(s.coupling.position.x, py, (BIG_Z[0] + BIG_Z[1]) / 2 + dz);
      const pz = BIG_Z[1] + dz;
      const ex = Math.sqrt(CONROD_LEN * CONROD_LEN - (py - CROSS_Y) * (py - CROSS_Y));
      const cz = pz - ex; // Kreuzkopf vor dem Zapfen
      s.cross.position.z = cz;
      s.conrod.scale.z = CONROD_LEN;
      s.conrod.position.set(s.conrod.position.x, (py + CROSS_Y) / 2, (pz + cz) / 2);
      s.conrod.rotation.x = Math.atan2(-(py - CROSS_Y), pz - cz);
      const pLen = Math.max(0.05, cz - (-1.2 + 0.0));
      s.pistonRod.scale.z = pLen;
      s.pistonRod.position.z = -1.2 + pLen / 2;
    }
  }
  animate(0);

  g.userData = { length: L, kind: 'loco', animate };
  return g;
}
