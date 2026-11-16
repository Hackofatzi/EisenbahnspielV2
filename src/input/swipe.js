/** Wischen (links/rechts/hoch) auf einem Element; Pfeiltasten zum Testen am Rechner. */
export function attachSwipe(el, { onLeft, onRight, onUp }) {
  const TH = 28;
  let start = null;

  const onDown = (e) => { start = { x: e.clientX, y: e.clientY, id: e.pointerId, done: false }; };
  const onMove = (e) => {
    if (!start || start.done || e.pointerId !== start.id) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < TH) return;
    start.done = true;
    if (Math.abs(dx) > Math.abs(dy)) (dx < 0 ? onLeft : onRight)();
    else if (dy < 0) onUp();
  };
  const onUpEv = () => { start = null; };
  const onKey = (e) => {
    if (e.key === 'ArrowLeft') onLeft();
    else if (e.key === 'ArrowRight') onRight();
    else if (e.key === 'ArrowUp' || e.key === ' ') onUp();
  };

  el.addEventListener('pointerdown', onDown);
  el.addEventListener('pointermove', onMove);
  el.addEventListener('pointerup', onUpEv);
  el.addEventListener('pointercancel', onUpEv);
  addEventListener('keydown', onKey);
  return () => {
    el.removeEventListener('pointerdown', onDown);
    el.removeEventListener('pointermove', onMove);
    el.removeEventListener('pointerup', onUpEv);
    el.removeEventListener('pointercancel', onUpEv);
    removeEventListener('keydown', onKey);
  };
}
