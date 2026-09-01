import { LEVEL_RED_DOORS } from '../config/gameConfig';
import {
  FLOORS,
  getFloorDef,
  type DoorSide,
} from '../data/buildingLayout';

export interface LevelConfig {
  level: number;
  redDoorCount: number;
  redDoors: { floor: number; side: DoorSide }[];
  exitShaftId: number;
  doubleLiftShaftIds: number[];
}

const EXIT_SHAFT_CANDIDATES = [0, 3];
const DOUBLE_LIFT_CANDIDATES = [1];

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function pickRandom<T>(arr: T[], rand: () => number): T {
  return arr[Math.floor(rand() * arr.length)]!;
}

export function generateLevel(level: number, seed = level * 7919): LevelConfig {
  const rand = seededRandom(seed);
  const redDoorCount = LEVEL_RED_DOORS(level);

  const eligible: { floor: number; side: DoorSide }[] = [];
  for (const floorDef of FLOORS) {
    if (floorDef.noDoors || floorDef.number === 0) continue;
    for (const door of floorDef.doors) {
      if (door.type === 'blue') {
        eligible.push({ floor: floorDef.number, side: door.side });
      }
    }
  }

  const shuffled = [...eligible].sort(() => rand() - 0.5);
  const redDoors = shuffled.slice(0, redDoorCount);

  return {
    level,
    redDoorCount,
    redDoors,
    exitShaftId: pickRandom(EXIT_SHAFT_CANDIDATES, rand),
    doubleLiftShaftIds: rand() > 0.5 ? [...DOUBLE_LIFT_CANDIDATES] : [],
  };
}

export function applyLevelToFloors(config: LevelConfig): void {
  for (const floorDef of FLOORS) {
    for (const door of floorDef.doors) {
      door.type = 'blue';
      door.collected = false;
    }
  }

  for (const { floor, side } of config.redDoors) {
    const floorDef = getFloorDef(floor);
    const door = floorDef?.doors.find((d: { side: DoorSide }) => d.side === side);
    if (door) {
      door.type = 'red';
      door.collected = false;
    }
  }
}

export function allDocumentsCollected(): boolean {
  for (const floorDef of FLOORS) {
    for (const door of floorDef.doors) {
      if (door.type === 'red' && !door.collected) return false;
    }
  }
  return true;
}

export function highestUncollectedRedDoorFloor(): number | null {
  let highest: number | null = null;
  for (const floorDef of FLOORS) {
    for (const door of floorDef.doors) {
      if (door.type === 'red' && !door.collected) {
        if (highest === null || floorDef.number > highest) {
          highest = floorDef.number;
        }
      }
    }
  }
  return highest;
}
