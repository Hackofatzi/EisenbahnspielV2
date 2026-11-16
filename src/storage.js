/** Speicherstand nur in localStorage. */
const KEY = 'btr.save';
const defaults = { stars: 0, best: {} };

export function load() {
  try {
    return { ...defaults, ...JSON.parse(localStorage.getItem(KEY) || '{}') };
  } catch {
    return { ...defaults };
  }
}

export function save(data) {
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { /* Speicher nicht verfügbar */ }
}

export function addStars(n) {
  const d = load();
  d.stars += n;
  save(d);
  return d.stars;
}
