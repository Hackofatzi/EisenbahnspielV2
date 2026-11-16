import { describe, it, expect } from 'vitest';
import { generateTrack } from '../src/logic/track.js';
import { createGame, step, moveLane, jump, starsFor } from '../src/logic/game.js';
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

  it('mehr Wagen sind etwas langsamer', () => {
    expect(createGame({ wagons: 5 }).baseSpeed).toBeLessThan(createGame({ wagons: 0 }).baseSpeed);
  });
});
