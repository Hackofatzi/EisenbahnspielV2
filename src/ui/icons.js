/** Eigene Icons, 48x48, dicke runde Linien. Quelle: selbst gezeichnet. */
const wrap = (inner) =>
  `<svg viewBox="0 0 48 48" width="40" height="40" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;

export const ICONS = {
  // Weiche: Doppelpfeil links/rechts
  swap: wrap('<path d="M6 24 H42"/><path d="M16 14 L6 24 L16 34"/><path d="M32 14 L42 24 L32 34"/>'),
  back: wrap('<path d="M28 10 L14 24 L28 38"/>'),
  // Abgerundetes Dreieck
  play: wrap('<path d="M15 9 L38 24 L15 39 Z" fill="currentColor"/>'),
  // Lokschuppen mit Rundbogen-Tor
  garage: wrap('<path d="M6 40 V20 L24 8 L42 20 V40"/><path d="M16 40 V28 H32 V40" fill="currentColor"/>'),
  // Stern mit runden Spitzen
  star: wrap('<path d="M24 6 L29.5 18 L42 19.5 L33 28.5 L35.5 41 L24 35 L12.5 41 L15 28.5 L6 19.5 L18.5 18 Z" fill="currentColor"/>'),
  // Tuten: Dampfpfeife mit Schallbögen
  horn: wrap('<path d="M8 28 V20 H16 L28 11 V37 L16 28 Z" fill="currentColor"/><path d="M34 18 Q38 24 34 30"/><path d="M39 13 Q47 24 39 35"/>'),
  // Sound an: Lautsprecher mit Bogen; aus: mit Strich
  sound: wrap('<path d="M7 19 H15 L25 11 V37 L15 29 H7 Z" fill="currentColor"/><path d="M33 17 Q38 24 33 31"/>'),
  soundOff: wrap('<path d="M7 19 H15 L25 11 V37 L15 29 H7 Z" fill="currentColor"/><path d="M34 18 L44 30 M44 18 L34 30"/>'),
};
