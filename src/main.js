import './styles.css';
import { T } from './texts.js';
import { ICONS } from './ui/icons.js';
import { createStage, WAGON_TYPES } from './render/stage.js';
import { createRaceView } from './render/raceView.js';
import { createGame, step, moveLane, jump, starsFor, currentPlace } from './logic/game.js';
import { openDirs, soonDirs } from './logic/track.js';
import { attachSwipe } from './input/swipe.js';
import { unlockAudio, horn, sfx, isMuted, setMuted, loadMuted } from './audio/sound.js';
import { load, addStars } from './storage.js';

loadMuted();

const COLORS = [0xd8362f, 0x3b82c4, 0x2fa84f, 0xffc83d, 0x8e5cc4];
const hex = (n) => '#' + n.toString(16).padStart(6, '0');
const WAGON_ORDER = [null, 'coal', 'passenger'];

const app = document.getElementById('app');
app.innerHTML = `
  <canvas id="stage"></canvas>
  <section class="screen" id="start">
    <h1 class="title" id="title">${T.title}</h1>
    <div class="bottom hidden" id="startBottom">
      <button class="btn main red" id="play">${ICONS.play}${T.play}</button>
      <div class="row">
        <button class="btn" id="toGarage">${ICONS.garage}${T.garage}</button>
        <button class="btn round" id="sound" aria-label="${T.soundOn}"></button>
      </div>
    </div>
  </section>
  <section class="screen" id="garage">
    <div class="topbar">
      <button class="btn round light" id="back" aria-label="${T.back}">${ICONS.back}</button>
      <span class="stars">${ICONS.star}<span id="starCount">0</span></span>
      <button class="btn round" id="hornBtn" aria-label="${T.horn}">${ICONS.horn}</button>
    </div>
    <div class="bottom tight">
      <div class="panel" aria-label="${T.wagonSlot}">
        <div class="row" id="slots"></div>
      </div>
      <div class="panel" aria-label="${T.colorLabel}">
        <div class="row" id="swatches"></div>
      </div>
      <div class="seg" id="modeSeg">
        <button class="btn" data-mode="race">${T.modeRace}</button>
        <button class="btn" data-mode="solo">${T.modeSolo}</button>
      </div>
      <button class="btn main green" id="drive">${ICONS.play}${T.drive}</button>
    </div>
  </section>
  <section class="screen" id="race">
    <div class="topbar">
      <button class="btn round light" id="raceBack" aria-label="${T.back}">${ICONS.back}</button>
      <span class="stars" id="racePlaceBox"><span id="racePlace"></span></span>
      <span class="stars" id="raceStarsBox">${ICONS.star}<span id="raceStars">0</span></span>
      <span class="stars" id="raceTime">0.0 ${T.seconds}</span>
    </div>
    <div class="progress"><i id="progress"></i></div>
    <div class="race-spacer"></div>
    <div class="switch-hint" aria-hidden="true">
      <span id="hintL">${ICONS.back}</span><span id="hintR">${ICONS.next}</span>
    </div>
    <div class="horn-row"><button class="btn round horn" id="raceHorn" aria-label="${T.horn}">${ICONS.horn}</button></div>
  </section>
  <section class="screen" id="result">
    <div class="result-card">
      <h2 id="resTitle">${T.resultTitle}</h2>
      <div class="big-stars" id="bigStars"></div>
      <p class="result-line"><span>${T.time}</span><b id="resTime"></b></p>
      <p class="result-line" id="resItemsLine"><span>${T.stars}</span><b id="resItems"></b></p>
      <button class="btn main red" id="again">${ICONS.play}${T.again}</button>
      <button class="btn main" id="resGarage">${ICONS.garage}${T.garage}</button>
    </div>
  </section>`;

const $ = (id) => document.getElementById(id);
const show = (id) => document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('active', s.id === id));

let slots = ['coal', 'passenger', null, null, null];
let colorIdx = 0;
let mode = 'race'; // 'race' (3 KI-Züge) oder 'solo' (Sammelobjekte)
const RIVAL_COUNT = 3;
const wagonList = () => slots.filter(Boolean);

const stage = createStage($('stage'), {
  onArrive() {
    $('title').classList.add('show');
    $('startBottom').classList.remove('hidden');
    horn();
  },
});
const raceView = createRaceView();

function renderSound() {
  $('sound').innerHTML = isMuted() ? ICONS.soundOff : ICONS.sound;
  $('sound').setAttribute('aria-label', isMuted() ? T.soundOff : T.soundOn);
}
renderSound();

function renderSlots() {
  $('slots').innerHTML = '';
  slots.forEach((s, i) => {
    const b = document.createElement('button');
    b.className = 'slot' + (s ? ' filled' : '');
    b.setAttribute('aria-label', `${T.wagonSlot} ${i + 1}`);
    if (s) b.innerHTML = `<i style="background:${hex(WAGON_TYPES[s].color)}"></i>`;
    b.onclick = () => {
      slots[i] = WAGON_ORDER[(WAGON_ORDER.indexOf(s) + 1) % WAGON_ORDER.length];
      renderSlots();
      stage.setWagons(wagonList());
    };
    $('slots').appendChild(b);
  });
}

function renderSwatches() {
  $('swatches').innerHTML = '';
  COLORS.forEach((c, i) => {
    const b = document.createElement('button');
    b.className = 'swatch' + (i === colorIdx ? ' on' : '');
    b.style.background = hex(c);
    b.setAttribute('aria-label', `${T.colorLabel} ${i + 1}`);
    b.onclick = () => { colorIdx = i; renderSwatches(); stage.setColor(c); };
    $('swatches').appendChild(b);
  });
}

function renderMode() {
  document.querySelectorAll('#modeSeg .btn').forEach((b) => b.classList.toggle('sel', b.dataset.mode === mode));
}
document.querySelectorAll('#modeSeg .btn').forEach((b) => {
  b.onclick = () => { mode = b.dataset.mode; renderMode(); };
});

function toGarage() {
  raceView.stop();
  renderMode();
  unlockAudio();
  stage.setExternal(null);
  racing = false;
  show('garage');
  stage.setMode('garage');
  stage.setColor(COLORS[colorIdx]);
  stage.setWagons(wagonList());
  $('starCount').textContent = load().stars;
  renderSlots();
  renderSwatches();
}

// ---------- Rennen ----------
let game = null;
let racing = false;
let resultTimer = 0;

const raceCtl = {
  scene: raceView.scene,
  camera: raceView.camera,
  resize: (w, h) => raceView.resize(w, h),
  update(dt) {
    if (!game) return;
    step(game, dt);
    const events = game.events.splice(0);
    for (const e of events) sfx(e.type);
    raceView.sync(dt, events);
    $('raceStars').textContent = game.collected;
    if (game.rivals.length) $('racePlace').textContent = `${T.place} ${currentPlace(game)}/${game.rivals.length + 1}`;
    $('raceTime').textContent = `${game.time.toFixed(1)} ${T.seconds}`;
    const now = openDirs(game.track, game.dist, game.lane);
    const soon = soonDirs(game.track, game.dist, game.lane, 25);
    $('hintL').className = now.left ? 'now' : soon.left ? 'soon' : '';
    $('hintR').className = now.right ? 'now' : soon.right ? 'soon' : '';
    $('progress').style.width = `${Math.min(100, (game.dist / game.track.finishZ) * 100)}%`;
    if (game.stopped && !resultTimer) resultTimer = setTimeout(showResult, 900);
  },
};

function startRace() {
  unlockAudio();
  clearTimeout(resultTimer);
  resultTimer = 0;
  const rivals = mode === 'race' ? RIVAL_COUNT : 0;
  game = createGame({ seed: (Math.random() * 1e9) | 0, wagons: wagonList().length, rivals });
  const others = COLORS.filter((_, i) => i !== colorIdx);
  const types = Object.keys(WAGON_TYPES);
  raceView.start(game, {
    color: COLORS[colorIdx],
    wagonTypes: wagonList(),
    rivals: game.rivals.map((r, i) => ({
      color: others[i % others.length],
      wagonTypes: Array.from({ length: r.wagons }, (_, k) => types[(i + k) % types.length]),
    })),
  });
  racing = true;
  $('raceStars').textContent = '0';
  $('racePlaceBox').style.display = rivals ? '' : 'none';
  $('raceStarsBox').style.display = rivals ? 'none' : '';
  show('race');
  stage.setExternal(raceCtl);
}

function showResult() {
  resultTimer = 0;
  racing = false;
  const n = starsFor(game);
  addStars(n);
  $('bigStars').innerHTML = [1, 2, 3].map((i) => `<span class="${i <= n ? 'on' : ''}">${ICONS.star}</span>`).join('');
  $('resTime').textContent = `${game.finishTime.toFixed(1)} ${T.seconds}`;
  const isRace = game.rivals.length > 0;
  $('resTitle').textContent = isRace ? `${game.place}${T.placeSuffix}` : T.resultTitle;
  $('resItemsLine').style.display = isRace ? 'none' : '';
  $('resItems').textContent = `${game.collected} / ${game.totalItems}`;
  show('result');
}

attachSwipe($('stage'), {
  onLeft: () => racing && moveLane(game, -1),
  onRight: () => racing && moveLane(game, 1),
  onUp: () => racing && jump(game),
});

// ---------- Verdrahtung ----------
$('play').onclick = startRace;
$('toGarage').onclick = toGarage;
$('sound').onclick = () => { unlockAudio(); setMuted(!isMuted()); renderSound(); horn(); };
$('back').onclick = () => {
  show('start');
  stage.setMode('start');
  $('title').classList.remove('show');
  $('startBottom').classList.add('hidden');
};
$('hornBtn').onclick = () => { unlockAudio(); horn(); stage.honk(); };
$('drive').onclick = startRace;
$('raceHorn').onclick = () => { horn(); };
$('raceBack').onclick = toGarage;
$('again').onclick = startRace;
$('resGarage').onclick = toGarage;
$('stage').addEventListener('pointerdown', () => {
  unlockAudio();
  if (!racing && $('start').classList.contains('active')) { horn(); stage.honk(); }
});

if (import.meta.env.DEV) {
  // Nur für Browser-Tests im Dev-Modus
  window.__btr = { get game() { return game; }, nearFinish() { game.dist = game.track.finishZ - 8; } };
}

show('start');
