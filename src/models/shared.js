import * as THREE from 'three';

/** Einheiten: 1 = Spurbreite. Vorderseite des Zugs zeigt nach -Z. */
export const COUPLER_Y = 0.5;
export const COUPLER_LEN = 0.22;
export const RAIL_Y = 0; // Radunterkante

const matCache = new Map();
/** Flaches, sattes Material; gleiche Farben teilen sich ein Material. */
export function mat(color) {
  const key = String(color);
  if (!matCache.has(key)) {
    matCache.set(key, new THREE.MeshLambertMaterial({ color, flatShading: false }));
  }
  return matCache.get(key);
}

export function segs(detail, low, high) {
  return detail === 'high' ? high : low;
}

/** Mesh-Helfer: Geometrie + Farbe + Position. */
export function part(geo, color, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat(color));
  m.position.set(x, y, z);
  return m;
}

/** Abgerundeter Quader aus Kapsel-freier Näherung: Box mit gerundeten Kanten per Zylinder-Fasen ist teuer;
 *  wir nehmen eine Box, in "high" zusätzlich Rundung über ExtrudeGeometry. */
export function roundBox(w, h, d, r, detail) {
  if (detail !== 'high') return new THREE.BoxGeometry(w, h, d);
  const s = new THREE.Shape();
  const x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false, curveSegments: 4 });
  g.translate(0, 0, -d / 2);
  return g;
}

/** Rad mit Nabe, Achse entlang X. */
export function wheel(radius, width, color, hubColor, detail) {
  const g = new THREE.Group();
  const n = segs(detail, 14, 28);
  const tire = new THREE.CylinderGeometry(radius, radius, width, n);
  tire.rotateZ(Math.PI / 2);
  g.add(part(tire, color));
  const hub = new THREE.CylinderGeometry(radius * 0.45, radius * 0.45, width * 1.25, segs(detail, 8, 16));
  hub.rotateZ(Math.PI / 2);
  g.add(part(hub, hubColor));
  return g;
}

/** Einheitliche Kupplung (Stange mit Kugel) am Ende; z = Wagenende, dir = -1 vorne / +1 hinten. */
export function coupler(z, dir, color = 0x333333) {
  const g = new THREE.Group();
  const bar = new THREE.CylinderGeometry(0.06, 0.06, COUPLER_LEN, 8);
  bar.rotateX(Math.PI / 2);
  g.add(part(bar, color, 0, 0, dir * COUPLER_LEN / 2));
  g.add(part(new THREE.SphereGeometry(0.1, 8, 6), color, 0, 0, dir * COUPLER_LEN));
  g.position.set(0, COUPLER_Y, z);
  return g;
}

/** Zählt Dreiecke einer Gruppe. */
export function countTriangles(obj) {
  let t = 0;
  obj.traverse((o) => {
    if (o.isMesh) {
      const g = o.geometry;
      t += g.index ? g.index.count / 3 : g.attributes.position.count / 3;
    }
  });
  return Math.round(t);
}
