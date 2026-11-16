import { LANES } from '../logic/constants.js';
import { gapExtra, PAIRS } from '../logic/track.js';

export const LANE_W = 1.4;

/**
 * Seitliche Mitte aller 4 Spuren an der Streckenstelle s (nur Darstellung).
 * Die Spuren liegen normalerweise eine Spurbreite auseinander und weichen paarweise auf
 * (siehe track.gaps); in Weichen-Zonen sind sie eng. Die Logik bleibt ein 4-Spur-Raster.
 * out: Array mit 4 Zahlen, wird gefüllt und zurückgegeben.
 */
export function laneXs(track, s, out = new Array(LANES)) {
  let sum = 0;
  let cum = 0;
  out[0] = 0;
  for (let p = 0; p < PAIRS; p++) {
    cum += 1 + gapExtra(track, p, s);
    out[p + 1] = cum;
  }
  for (let l = 0; l < LANES; l++) sum += out[l];
  const mean = sum / LANES;
  for (let l = 0; l < LANES; l++) out[l] = (out[l] - mean) * LANE_W;
  return out;
}

const tmp = new Array(LANES);
export function laneXAt(track, lane, s) {
  return laneXs(track, s, tmp)[lane];
}
