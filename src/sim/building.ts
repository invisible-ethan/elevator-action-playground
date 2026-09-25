import { Rng } from '../core/rng';
import {
  BASEMENT,
  DOOR_XS,
  ESC_HALF,
  LAMP_XS,
  ROOF,
  SLOTS,
  TOP_FLOOR,
} from './constants';

export interface Shaft {
  id: number;
  slot: number;
  x: number;
  /** Lowest and highest floor the car can stop at. */
  min: number;
  max: number;
}

/** An escalator running from floor `top` down to floor `top - 1`. */
export interface Escalator {
  id: number;
  top: number;
  slot: number;
  x: number;
  /** Where you step on at the upper floor and off at the lower floor. */
  topX: number;
  bottomX: number;
}

export interface Door {
  id: number;
  floor: number;
  x: number;
  red: boolean;
  taken: boolean;
  /** Frames the door stays open (someone is going in or out). */
  open: number;
}

export interface Lamp {
  id: number;
  floor: number;
  x: number;
  state: 'hang' | 'fall' | 'broken';
  drop: number;
  vy: number;
}

export interface Building {
  shafts: Shaft[];
  escalators: Escalator[];
  doors: Door[];
  lamps: Lamp[];
}

/**
 * Builds a 30-storey building. Shafts and escalators are chained from the roof down to the
 * basement so every floor is reachable, then extra shafts, doors, red doors and lamps are added.
 */
export function generateBuilding(level: number, seed: number): Building {
  const rng = new Rng(seed);
  // occupied[floor][slot]
  const occupied: boolean[][] = Array.from({ length: ROOF + 1 }, () => SLOTS.map(() => false));
  const shafts: Shaft[] = [];
  const escalators: Escalator[] = [];

  const isFree = (slot: number, lo: number, hi: number) => {
    for (let f = lo; f <= hi; f++) if (occupied[f][slot]) return false;
    return true;
  };
  const mark = (slot: number, lo: number, hi: number) => {
    for (let f = lo; f <= hi; f++) occupied[f][slot] = true;
  };
  const addShaft = (slot: number, min: number, max: number) => {
    shafts.push({ id: shafts.length, slot, x: SLOTS[slot], min, max });
    mark(slot, min, max);
  };
  // The basement's right side is reserved for the getaway car.
  const slotAllowed = (slot: number, min: number) => !(min === BASEMENT && slot === 2);

  let lastSlot = 1;
  const tryShaft = (min: number, max: number): boolean => {
    const slots = [0, 1, 2].filter((s) => slotAllowed(s, min) && isFree(s, min, max));
    if (slots.length === 0) return false;
    const preferred = slots.filter((s) => s !== lastSlot);
    const slot = rng.pick(preferred.length ? preferred : slots);
    addShaft(slot, min, max);
    lastSlot = slot;
    return true;
  };

  // The roof elevator always sits in the middle, like the arcade.
  let low = ROOF - rng.int(7, 10);
  addShaft(1, low, ROOF);

  for (let guard = 0; low > BASEMENT && guard < 100; guard++) {
    if (low <= 12 && low >= 3 && rng.chance(0.5)) {
      const count = rng.int(1, 3);
      let made = 0;
      for (let i = 0; i < count && low >= 3; i++) {
        const slots = [0, 1, 2].filter((s) => isFree(s, low - 1, low));
        if (slots.length === 0) break;
        const slot = rng.pick(slots);
        const dir = rng.chance(0.5) ? 1 : -1;
        const x = SLOTS[slot];
        escalators.push({
          id: escalators.length,
          top: low,
          slot,
          x,
          topX: x - dir * ESC_HALF,
          bottomX: x + dir * ESC_HALF,
        });
        mark(slot, low - 1, low);
        lastSlot = slot;
        low--;
        made++;
      }
      if (made > 0) continue;
    }

    let min = Math.max(BASEMENT, low - rng.int(4, 9));
    if (min <= 2) min = BASEMENT;
    const max = Math.min(TOP_FLOOR, low + rng.int(0, 2));
    if (tryShaft(min, max) || tryShaft(min, low) || tryShaft(Math.max(min, low - 3), low)) {
      low = shafts[shafts.length - 1].min;
    } else {
      // Should not happen with three slots, but never loop forever.
      break;
    }
  }

  // A few extra shafts give alternative routes.
  const extras = 2 + rng.int(0, 2);
  for (let i = 0, tries = 0; i < extras && tries < 40; tries++) {
    const len = rng.int(3, 8);
    const min = rng.int(1, TOP_FLOOR - len);
    if (tryShaft(min, min + len)) i++;
  }

  // Doors
  const doors: Door[] = [];
  for (let f = 1; f <= TOP_FLOOR; f++) {
    const onFloor: number[] = [];
    DOOR_XS.forEach((_, i) => {
      if (rng.chance(0.7)) onFloor.push(i);
    });
    if (onFloor.length === 0) onFloor.push(rng.int(0, DOOR_XS.length - 1));
    for (const i of onFloor) {
      doors.push({ id: doors.length, floor: f, x: DOOR_XS[i], red: false, taken: false, open: 0 });
    }
  }

  // Red doors, spread evenly through the building (top floor always has one).
  const redCount = Math.min(4 + level, 10);
  const span = (TOP_FLOOR - 2) / redCount;
  for (let i = 0; i < redCount; i++) {
    const hi = Math.round(TOP_FLOOR - i * span);
    const lo = Math.max(2, Math.round(TOP_FLOOR - (i + 1) * span) + 1);
    const floor = i === 0 ? TOP_FLOOR : rng.int(lo, hi);
    const candidates = doors.filter((d) => d.floor === floor && !d.red);
    if (candidates.length) rng.pick(candidates).red = true;
  }

  // Ceiling lamps, clear of escalators coming down through the ceiling.
  const lamps: Lamp[] = [];
  for (let f = 1; f <= TOP_FLOOR; f++) {
    const blocked = escalators.filter((e) => e.top === f + 1 || e.top === f);
    const spots = LAMP_XS.filter((x) => blocked.every((e) => Math.abs(x - e.x) > ESC_HALF + 6));
    const count = Math.min(spots.length, rng.int(1, 2));
    const chosen = [...spots].sort(() => rng.next() - 0.5).slice(0, count);
    for (const x of chosen) {
      lamps.push({ id: lamps.length, floor: f, x, state: 'hang', drop: 0, vy: 0 });
    }
  }

  return { shafts, escalators, doors, lamps };
}

/** Floors reachable from the roof using shafts and escalators (floors are fully walkable). */
export function reachableFloors(b: Building): Set<number> {
  const seen = new Set<number>([ROOF]);
  const queue = [ROOF];
  while (queue.length) {
    const f = queue.pop()!;
    const next: number[] = [];
    for (const s of b.shafts) {
      if (f >= s.min && f <= s.max) for (let g = s.min; g <= s.max; g++) next.push(g);
    }
    for (const e of b.escalators) {
      if (e.top === f) next.push(f - 1);
      if (e.top - 1 === f) next.push(e.top);
    }
    for (const g of next) {
      if (!seen.has(g)) {
        seen.add(g);
        queue.push(g);
      }
    }
  }
  return seen;
}
