import { describe, expect, it } from 'vitest';
import { Rng } from '../core/rng';
import {
  BASEMENT,
  ENEMY_SHAFT_STOP,
  GETAWAY_X,
  HIGH_SHOT,
  LOW_SHOT,
  PLAYER_SHAFT_STOP,
  ROOF,
  SCORE,
  floorY,
} from '../sim/constants';
import { carFloor } from '../sim/elevator';
import { NO_INPUT, World, type Input } from '../sim/world';

/** A world past the zip-line intro with random enemy spawning switched off. */
function playing(seed = 1): World {
  const w = new World({ seed });
  for (let i = 0; i < 400 && w.status !== 'play'; i++) w.step(NO_INPUT);
  expect(w.status).toBe('play');
  w.spawnT = 1e9;
  w.diff.dodge = 0;
  return w;
}

function place(w: World, floor: number, x: number): void {
  const p = w.player;
  p.mode = 'walk';
  p.floor = floor;
  p.x = x;
  p.y = floorY(floor);
  p.car = null;
  w.updateCamera(true);
}

function hold(w: World, input: Partial<Input>, frames: number): void {
  for (let i = 0; i < frames; i++) w.step({ ...NO_INPUT, ...input });
}

/** An office floor where no shaft or escalator gets in the way around x. */
function quietFloor(w: World, x: number): number {
  for (let f = 25; f > 2; f--) {
    const clear =
      w.b.shafts.every((s) => f < s.min || f > s.max || Math.abs(s.x - x) > 28) &&
      w.b.escalators.every(
        (e) => (e.top !== f && e.top - 1 !== f) || (Math.abs(e.topX - x) > 12 && Math.abs(e.bottomX - x) > 12),
      );
    if (clear) return f;
  }
  throw new Error('no quiet floor');
}

describe('world', () => {
  it('slides the agent down the zip line onto the roof', () => {
    const w = playing();
    expect(w.player.floor).toBe(ROOF);
    expect(w.player.mode).toBe('walk');
    expect(w.player.y).toBe(floorY(ROOF));
  });

  it('boards a waiting elevator, rides it down a floor and steps out', () => {
    const w = playing(5);
    const s = w.b.shafts.find((sh) => sh.max - sh.min >= 2 && sh.max < ROOF)!;
    const f = s.min + 1;
    const car = w.cars[s.id];
    car.y = floorY(f);
    car.state = 'wait';
    car.wait = 10000;
    place(w, f, s.x - 22);
    hold(w, { right: true }, 12);
    expect(w.player.mode).toBe('car');

    hold(w, { down: true }, 2);
    hold(w, {}, 60);
    expect(carFloor(car)).toBe(f - 1);
    expect(w.player.floor).toBe(f - 1);

    hold(w, { right: true }, 3);
    expect(w.player.mode).toBe('walk');
    expect(w.player.floor).toBe(f - 1);
    expect(Math.abs(w.player.x - s.x)).toBeGreaterThanOrEqual(PLAYER_SHAFT_STOP);
  });

  it('stops at an open shaft when the car is elsewhere', () => {
    const w = playing(6);
    const s = w.b.shafts.find((sh) => sh.max - sh.min >= 3 && sh.max < ROOF)!;
    const f = s.min + 1;
    const car = w.cars[s.id];
    car.y = floorY(s.max);
    car.state = 'wait';
    car.wait = 10000;
    place(w, f, s.x - 30);
    hold(w, { right: true }, 40);
    expect(w.player.mode).toBe('walk');
    expect(w.player.x).toBe(s.x - PLAYER_SHAFT_STOP);
  });

  it('shoots an enemy for 100 points', () => {
    const w = playing(7);
    const f = quietFloor(w, 100);
    place(w, f, 80);
    w.player.facing = 1;
    const e = w.addEnemy(f, 110);
    e.cooldown = 999;
    hold(w, { fire: true }, 1);
    hold(w, {}, 12);
    expect(e.state).toBe('dead');
    expect(e.deathKind).toBe('shot');
    expect(w.score).toBe(SCORE.shot);
  });

  it('ducking dodges a high shot but not a low one', () => {
    const w = playing(8);
    const f = quietFloor(w, 100);
    place(w, f, 100);
    w.bullets.push({ id: -1, x: 140, y: floorY(f) - HIGH_SHOT, vx: -3, owner: 'enemy' });
    hold(w, { down: true }, 30);
    expect(w.status).toBe('play');

    w.bullets.push({ id: -2, x: 140, y: floorY(f) - LOW_SHOT, vx: -3, owner: 'enemy' });
    hold(w, { down: true }, 30);
    expect(w.status).toBe('dying');
  });

  it('jumps over a low shot', () => {
    const w = playing(9);
    const f = quietFloor(w, 100);
    place(w, f, 100);
    w.bullets.push({ id: -1, x: 124, y: floorY(f) - LOW_SHOT, vx: -3, owner: 'enemy' });
    hold(w, { jump: true }, 1);
    hold(w, {}, 40);
    expect(w.status).toBe('play');
  });

  it('jump-kicks an enemy', () => {
    const w = playing(10);
    const f = quietFloor(w, 100);
    place(w, f, 90);
    const e = w.addEnemy(f, 106);
    e.cooldown = 999;
    e.keepDist = 999;
    hold(w, { jump: true, right: true }, 1);
    hold(w, { right: true }, 30);
    expect(e.deathKind).toBe('kick');
    expect(w.score).toBe(SCORE.kick);
  });

  it('shoots out a lamp, blacking out the building and flattening the enemy below', () => {
    const w = playing(11);
    const lamp = w.b.lamps.find((l) => l.floor < 28 && l.x > 100)!;
    const f = lamp.floor;
    place(w, f, lamp.x - 30);
    w.player.facing = 1;
    const e = w.addEnemy(f, lamp.x);
    e.cooldown = 999;
    e.keepDist = 999;
    hold(w, { jump: true }, 1);
    for (let i = 0; i < 20 && w.player.jumpY < 17; i++) w.step(NO_INPUT);
    hold(w, { fire: true }, 1);
    hold(w, {}, 10);
    expect(lamp.state).not.toBe('hang');
    expect(w.blackout).toBeGreaterThan(0);
    hold(w, {}, 40);
    expect(e.deathKind).toBe('lamp');
  });

  it('crushes an enemy waiting at the shaft with a descending car', () => {
    const w = playing(12);
    const s = w.b.shafts.find((sh) => sh.max - sh.min >= 2 && sh.max < ROOF)!;
    const f = s.min;
    const car = w.cars[s.id];
    car.y = floorY(f + 1);
    car.state = 'wait';
    car.wait = 1;
    car.dir = 1;
    const side = s.x > 100 ? -1 : 1;
    place(w, f, s.x + side * 40);
    w.player.invuln = 1000;
    const e = w.addEnemy(f, s.x - side * ENEMY_SHAFT_STOP);
    e.cooldown = 999;
    hold(w, {}, 60);
    expect(e.deathKind).toBe('crush');
    expect(w.score).toBe(SCORE.crush);
  });

  it('collects a secret document from a red door', () => {
    const w = playing(13);
    const door = w.b.doors.find((d) => d.red)!;
    const before = w.docsLeft;
    place(w, door.floor, door.x + 2);
    hold(w, { up: true }, 2);
    expect(w.player.mode).toBe('door');
    hold(w, {}, 100);
    expect(door.taken).toBe(true);
    expect(w.docsLeft).toBe(before - 1);
    expect(w.score).toBe(SCORE.document);
    expect(w.player.mode).toBe('walk');
  });

  it('sends the agent back up when documents were missed', () => {
    const w = playing(14);
    const highest = Math.max(...w.b.doors.filter((d) => d.red).map((d) => d.floor));
    place(w, BASEMENT, 30);
    w.step(NO_INPUT);
    expect(w.status).toBe('warp');
    hold(w, {}, 130);
    expect(w.status).toBe('play');
    expect(w.player.floor).toBe(highest);
  });

  it('escapes in the getaway car once every document is in hand, then starts the next level', () => {
    const w = playing(15);
    for (const d of w.b.doors) if (d.red) d.taken = true;
    w.addScore(1234);
    place(w, BASEMENT, GETAWAY_X - 30);
    hold(w, { right: true }, 30);
    expect(w.status).toBe('escape');
    hold(w, {}, 400);
    expect(w.level).toBe(2);
    expect(w.status === 'intro' || w.status === 'play').toBe(true);
    expect(w.score).toBe(1234 + 1000);
  });

  it('awards an extra life at 10,000 points', () => {
    const w = playing(16);
    const lives = w.lives;
    w.addScore(10000);
    expect(w.lives).toBe(lives + 1);
    expect(w.events).toContain('extraLife');
  });

  it('ends the game when the last life is lost', () => {
    const w = playing(17);
    w.lives = 1;
    w.killPlayer('shot');
    hold(w, {}, 200);
    expect(w.status).toBe('gameover');
  });

  it('survives long runs of random input without breaking invariants', () => {
    const actions: Partial<Input>[] = [
      { left: true },
      { right: true },
      { right: true, fire: true },
      { left: true, jump: true },
      { up: true },
      { down: true },
      { down: true, fire: true },
      { right: true, up: true },
      {},
    ];
    for (const seed of [1, 2, 3, 4]) {
      const rng = new Rng(seed);
      let w = new World({ seed });
      let current: Partial<Input> = {};
      for (let frame = 0; frame < 15000; frame++) {
        if (frame % rng.int(6, 30) === 0) current = rng.pick(actions);
        const input = { ...NO_INPUT, ...current };
        if (current.fire) input.fire = rng.chance(0.2);
        if (current.jump) input.jump = rng.chance(0.1);
        w.step(input);

        const p = w.player;
        expect(Number.isFinite(p.x) && Number.isFinite(p.y)).toBe(true);
        expect(p.floor).toBeGreaterThanOrEqual(BASEMENT);
        expect(p.floor).toBeLessThanOrEqual(ROOF);
        if (p.mode === 'walk') {
          for (const s of w.b.shafts) {
            if (p.floor < s.min || p.floor > s.max) continue;
            expect(Math.abs(p.x - s.x)).toBeGreaterThanOrEqual(PLAYER_SHAFT_STOP - 1e-6);
          }
        }
        for (const e of w.enemies) {
          if (e.state !== 'active') continue;
          for (const s of w.b.shafts) {
            if (e.floor < s.min || e.floor > s.max) continue;
            expect(Math.abs(e.x - s.x)).toBeGreaterThanOrEqual(ENEMY_SHAFT_STOP - 1e-6);
          }
        }
        for (const car of w.cars) {
          expect(car.y).toBeLessThanOrEqual(floorY(car.shaft.min));
          expect(car.y).toBeGreaterThanOrEqual(floorY(car.shaft.max));
        }
        if (w.status === 'gameover') w = new World({ seed: seed + frame });
      }
    }
  }, 60000);
});
