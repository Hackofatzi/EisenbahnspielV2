import * as THREE from 'three';

/**
 * Optische Kurven: alle Materialien verschieben ihre Eckpunkte in Blickrichtung seitlich,
 * je weiter weg, desto stärker (quadratisch). Die Spiellogik bleibt ein gerades 4-Spur-Raster.
 * bend.value: -1.6 (Linkskurve) .. 1.6 (Rechtskurve), 0 = gerade.
 */
export const bend = { value: 0 };

export function applyBend(material) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uBend = bend;
    shader.vertexShader = `uniform float uBend;\n${shader.vertexShader}`.replace(
      '#include <project_vertex>',
      `#include <project_vertex>
      float bendD = max(0.0, -mvPosition.z - 5.0);
      mvPosition.x += uBend * bendD * bendD * 0.0025;
      gl_Position = projectionMatrix * mvPosition;`,
    );
  };
  material.customProgramCacheKey = () => 'bend1';
  return material;
}

export const lambert = (color) => applyBend(new THREE.MeshLambertMaterial({ color }));
