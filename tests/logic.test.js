import { describe, it, expect } from 'vitest';
import { generateTrack } from '../src/logic/track.js';
import { createGame, step, stepAI, moveLane, jump, starsFor } from '../src/logic/game.js';
import { LANES } from '../src/logic/constants.js';

describe('Strecke', () => {
  it('ist mit gleichem Seed gleich', () => {
    expect(generateTrack(7, 700)).toEqual(generateTrack(7, 700));
  });
  it('lässt in jeder Reihe mindestens eine Spur frei', () => {
    for (let seed = 1; seed < 60; seed++) {
      const t = generateTrack(seed, 700);
      const rows = new Map();
      for (const o of t.obstacles) rows.set(o.z, (rows.get(o.z) ?? new Set()).add(o.lane));
      for (const lanes of rows.values()) expect(lanes.size).toBeLessThan(LANES);
    }
  });
  it('hat Sammelobjekte und Hindernisse', () => {
    const t = generateTrack(3, 700);
    expect(t.items.length).toBeGreaterThan(10);
    expect(t.obstacles.length).toBeGreaterThan(5);
  });
});

describe('Spiel', () => {
  const run = (g, seconds) => { for (let i = 0; i < seconds * 60; i++) step(g, 1 / 60); };

  it('begrenzt Spurwechsel auf 0..3', () => {
    const g = createGame();
    for (let i = 0; i < 10; i++) moveLane(g, -1);
    expect(g.lane).toBe(0);
    for (let i = 0; i < 10; i++) moveLane(g, 1);
    expect(g.lane).toBe(LANES - 1);
  });

  it('bremst bei Treffer nur kurz und endet nie im Fehlschlag', () => {
    const g = createGame();
    g.track.obstacles = [{ z: 20, lane: 1, type: 'block', hit: false }];
    run(g, 5);
    expect(g.hits).toBe(1);
    expect(g.slow).toBe(0);
    expect(g.speed).toBeGreaterThan(g.baseSpeed * 0.9);
  });

  it('springt über niedrige Hindernisse, nicht über blockierende', () => {
    const g = createGame();
    g.track.obstacles = [
      { z: 15, lane: 1, type: 'low', hit: false },
      { z: 60, lane: 1, type: 'block', hit: false },
    ];
    // Sprung kurz vor dem niedrigen Hindernis auslösen
    while (g.dist < 13.2) step(g, 1 / 60);
    jump(g);
    while (g.dist < 40) step(g, 1 / 60);
    expect(g.hits).toBe(0);
    while (g.dist < 40) step(g, 1 / 60);
    // blockierendes Hindernis trotz Sprung getroffen
    while (g.dist < 58.5) step(g, 1 / 60);
    jump(g);
    while (g.dist < 62) step(g, 1 / 60);
    expect(g.hits).toBe(1);
  });

  it('sammelt Objekte nur auf der eigenen Spur', () => {
    const g = createGame();
    g.track.obstacles = [];
    g.track.items = [{ z: 20, lane: 1, got: false }, { z: 30, lane: 2, got: false }];
    g.totalItems = 2;
    run(g, 5);
    expect(g.collected).toBe(1);
  });

  it('kommt ins Ziel und bleibt stehen', () => {
    const g = createGame({ seed: 5, wagons: 3 });
    g.track.obstacles = [];
    run(g, 120);
    expect(g.finished).toBe(true);
    expect(g.stopped).toBe(true);
    expect(g.finishTime).toBeGreaterThan(60);
    expect(starsFor(g)).toBeGreaterThanOrEqual(1);
  });

  it('Rennen: 3 Rivalen, keine Sammelobjekte, Platz 1 bis 4', () => {
    const places = new Set();
    for (let seed = 1; seed <= 12; seed++) {
      const g = createGame({ seed, wagons: 2, rivals: 3 });
      expect(g.rivals).toHaveLength(3);
      expect(g.totalItems).toBe(0);
      g.ai = { cd: 0, mistake: 0.1 }; // Spieler wird vom Autopiloten gesteuert
      for (let i = 0; i < 200 * 60 && !g.stopped; i++) { stepAI(g, g, 1 / 60); step(g, 1 / 60); }
      expect(g.finished).toBe(true);
      expect(g.place).toBeGreaterThanOrEqual(1);
      expect(g.place).toBeLessThanOrEqual(4);
      expect(g.rivals.some((r) => r.dist > 100)).toBe(true);
      places.add(g.place);
    }
    expect(places.size).toBeGreaterThan(1); // nicht immer derselbe Platz
  });

  it('Rivalen weichen Hindernissen meistens aus', () => {
    let hits = 0;
    let obstacles = 0;
    for (let seed = 1; seed <= 10; seed++) {
      const g = createGame({ seed, wagons: 2, rivals: 3 });
      for (let i = 0; i < 200 * 60 && !g.stopped; i++) step(g, 1 / 60);
      for (const r of g.rivals) hits += r.hits;
      obstacles += g.track.obstacles.length;
    }
    // Treffer pro Rivale und Hindernis (3 Rivalen sehen jedes Hindernis)
    expect(hits / (obstacles * 3)).toBeLessThan(0.15);
  });

  it('Spurwechsel ist blockiert, wenn dort ein Zug steht', () => {
    const g = createGame({ seed: 1, wagons: 2, rivals: 3 });
    g.lane = 1; // Rivalen starten auf 0, 2, 3 auf gleicher Höhe
    moveLane(g, 1);
    expect(g.lane).toBe(1);
    expect(g.events.some((e) => e.type === 'blocked')).toBe(true);
    // Rivale weit vorn: Wechsel möglich
    g.rivals.find((r) => r.lane === 2).dist = 40;
    g.events.length = 0;
    moveLane(g, 1);
    expect(g.lane).toBe(2);
  });

  it('Züge fahren nie ineinander, auch wenn der hintere schneller ist', () => {
    const g = createGame({ seed: 2, wagons: 1, rivals: 1 });
    g.track.obstacles = [];
    const r = g.rivals[0];
    r.lane = 1; // gleiche Spur wie der Spieler
    r.dist = 8;
    r.baseSpeed = 5; // langsam
    for (let i = 0; i < 20 * 60; i++) {
      step(g, 1 / 60);
      const rear = g.dist + 1.2;
      const frontTail = r.dist + 1.2 - (2.4 + r.wagons * 2.22);
      if (!r.finished) expect(rear).toBeLessThanOrEqual(frontTail + 0.001);
    }
    expect(g.speed).toBeLessThanOrEqual(r.baseSpeed + 0.5);
  });

  it('Fertige Züge blockieren nicht', () => {
    const g = createGame({ seed: 3, wagons: 1, rivals: 1 });
    g.track.obstacles = [];
    const r = g.rivals[0];
    r.lane = 1;
    r.dist = g.track.finishZ - 1;
    for (let i = 0; i < 120 * 60 && !g.finished; i++) step(g, 1 / 60);
    expect(g.finished).toBe(true);
    expect(r.finished).toBe(true);
  });

  it('Sterne nach Platz im Rennen', () => {
    const g = createGame({ rivals: 3 });
    g.finished = true;
    g.place = 1;
    expect(starsFor(g)).toBe(3);
    g.place = 2;
    expect(starsFor(g)).toBe(2);
    g.place = 4;
    expect(starsFor(g)).toBe(1);
  });

  it('mehr Wagen sind etwas langsamer', () => {
    expect(createGame({ wagons: 5 }).baseSpeed).toBeLessThan(createGame({ wagons: 0 }).baseSpeed);
  });
});
