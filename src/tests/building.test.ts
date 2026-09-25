import { describe, expect, it } from 'vitest';
import { generateBuilding, reachableFloors } from '../sim/building';
import { BASEMENT, ESC_HALF, ROOF, SHAFT_HALF, SLOTS, TOP_FLOOR, floorY, roomFloor } from '../sim/constants';

const SEEDS = Array.from({ length: 150 }, (_, i) => i * 7919 + 3);

describe('floor geometry', () => {
  it('maps floor lines back to their floor', () => {
    for (let f = BASEMENT; f <= ROOF; f++) {
      expect(roomFloor(floorY(f))).toBe(f);
      expect(roomFloor(floorY(f) - 1)).toBe(f);
      expect(roomFloor(floorY(f) - 47)).toBe(f);
      expect(roomFloor(floorY(f) - 48)).toBe(f + 1);
    }
  });
});

describe('generateBuilding', () => {
  it('is deterministic for a seed', () => {
    expect(generateBuilding(1, 42)).toEqual(generateBuilding(1, 42));
  });

  it('connects the roof to every floor down to the basement', () => {
    for (const level of [1, 2, 5, 9]) {
      for (const seed of SEEDS) {
        const b = generateBuilding(level, seed);
        const reach = reachableFloors(b);
        for (let f = BASEMENT; f <= ROOF; f++) expect(reach.has(f), `seed ${seed} floor ${f}`).toBe(true);
      }
    }
  });

  it('never puts two shafts or escalators in the same slot on a floor', () => {
    for (const seed of SEEDS) {
      const b = generateBuilding(3, seed);
      const used = new Map<string, number>();
      const claim = (floor: number, slot: number) => {
        const key = `${floor}:${slot}`;
        used.set(key, (used.get(key) ?? 0) + 1);
      };
      for (const s of b.shafts) for (let f = s.min; f <= s.max; f++) claim(f, s.slot);
      for (const e of b.escalators) {
        claim(e.top, e.slot);
        claim(e.top - 1, e.slot);
      }
      for (const [key, n] of used) expect(n, `seed ${seed} slot ${key}`).toBe(1);
    }
  });

  it('keeps shafts inside the building and the roof shaft in the centre', () => {
    for (const seed of SEEDS) {
      const b = generateBuilding(1, seed);
      const roof = b.shafts.find((s) => s.max === ROOF);
      expect(roof?.x).toBe(SLOTS[1]);
      for (const s of b.shafts) {
        expect(s.min).toBeGreaterThanOrEqual(BASEMENT);
        expect(s.max).toBeLessThanOrEqual(ROOF);
        expect(s.min).toBeLessThan(s.max);
        // The basement's right side is reserved for the getaway car.
        if (s.min === BASEMENT) expect(s.slot).not.toBe(2);
      }
    }
  });

  it('places doors on every office floor, clear of shafts and escalators', () => {
    for (const seed of SEEDS) {
      const b = generateBuilding(2, seed);
      for (let f = 1; f <= TOP_FLOOR; f++) {
        expect(b.doors.some((d) => d.floor === f)).toBe(true);
      }
      for (const d of b.doors) {
        for (const s of b.shafts) {
          if (d.floor >= s.min && d.floor <= s.max) expect(Math.abs(d.x - s.x)).toBeGreaterThan(SHAFT_HALF + 8);
        }
        for (const e of b.escalators) {
          if (d.floor === e.top - 1) expect(Math.abs(d.x - e.x)).toBeGreaterThan(ESC_HALF + 4);
        }
      }
      expect(b.doors.some((d) => d.floor === ROOF || d.floor === BASEMENT)).toBe(false);
    }
  });

  it('adds more red doors on later levels, including one on the top floor', () => {
    for (const seed of SEEDS) {
      const l1 = generateBuilding(1, seed).doors.filter((d) => d.red);
      const l4 = generateBuilding(4, seed).doors.filter((d) => d.red);
      expect(l1).toHaveLength(5);
      expect(l4).toHaveLength(8);
      expect(l1.some((d) => d.floor === TOP_FLOOR)).toBe(true);
    }
  });

  it('hangs lamps on office floors only', () => {
    const b = generateBuilding(1, 99);
    expect(b.lamps.length).toBeGreaterThanOrEqual(TOP_FLOOR);
    for (const l of b.lamps) {
      expect(l.floor).toBeGreaterThanOrEqual(1);
      expect(l.floor).toBeLessThanOrEqual(TOP_FLOOR);
    }
  });
});
