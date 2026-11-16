import './styles.css';
import { T } from './texts.js';
import { ICONS } from './ui/icons.js';
import { createStage, WAGON_TYPES } from './render/stage.js';
import { unlockAudio, horn, isMuted, setMuted, loadMuted } from './audio/sound.js';

loadMuted();

const COLORS = [0xd8362f, 0x3b82c4, 0x2fa84f, 0xffc83d, 0x8e5cc4];
const hex = (n) => '#' + n.toString(16).padStart(6, '0');
const MAX_WAGONS = 5;
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
    <div class="bottom">
      <div class="panel">
        <h2>${T.wagonSlot}</h2>
        <div class="row" id="slots"></div>
      </div>
      <div class="panel">
        <h2>${T.colorLabel}</h2>
        <div class="row" id="swatches"></div>
      </div>
      <button class="btn main green" id="drive">${ICONS.play}${T.drive}</button>
    </div>
  </section>`;

const $ = (id) => document.getElementById(id);
const show = (id) => document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('active', s.id === id));

let slots = ['coal', 'passenger', null, null, null];
let colorIdx = 0;

const stage = createStage($('stage'), {
  onArrive() {
    $('title').classList.add('show');
    $('startBottom').classList.remove('hidden');
    horn();
  },
});

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
      const next = WAGON_ORDER[(WAGON_ORDER.indexOf(s) + 1) % WAGON_ORDER.length];
      slots[i] = next;
      renderSlots();
      stage.setWagons(slots.filter(Boolean));
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

function toGarage() {
  unlockAudio();
  show('garage');
  stage.setMode('garage');
  stage.setWagons(slots.filter(Boolean));
  renderSlots();
  renderSwatches();
}

$('play').onclick = toGarage; // M1: führt später direkt ins Rennen
$('toGarage').onclick = toGarage;
$('sound').onclick = () => { unlockAudio(); setMuted(!isMuted()); renderSound(); horn(); };
$('back').onclick = () => { show('start'); stage.setMode('start'); $('title').classList.remove('show'); $('startBottom').classList.add('hidden'); };
$('hornBtn').onclick = () => { unlockAudio(); horn(); stage.honk(); };
$('drive').onclick = () => { unlockAudio(); horn(); stage.honk(); };
$('stage').addEventListener('pointerdown', () => { unlockAudio(); horn(); stage.honk(); });

void MAX_WAGONS;
show('start');
