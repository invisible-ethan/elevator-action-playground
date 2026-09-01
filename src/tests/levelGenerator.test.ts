import { describe, it, expect } from 'vitest';
import { LEVEL_RED_DOORS } from '../config/gameConfig';
import {
  generateLevel,
  applyLevelToFloors,
  allDocumentsCollected,
  highestUncollectedRedDoorFloor,
} from '../systems/LevelGenerator';
import { FLOORS } from '../data/buildingLayout';

describe('LevelGenerator', () => {
  it('generates correct red door count for level 1', () => {
    const config = generateLevel(1);
    expect(config.redDoorCount).toBe(LEVEL_RED_DOORS(1));
    expect(config.redDoors.length).toBe(5);
  });

  it('caps red doors at 10 for level 7+', () => {
    expect(LEVEL_RED_DOORS(7)).toBe(10);
    expect(LEVEL_RED_DOORS(15)).toBe(10);
    const config = generateLevel(10);
    expect(config.redDoors.length).toBe(10);
  });

  it('is deterministic with same seed', () => {
    const a = generateLevel(3, 42);
    const b = generateLevel(3, 42);
    expect(a.redDoors).toEqual(b.redDoors);
    expect(a.exitShaftId).toBe(b.exitShaftId);
  });

  it('tracks document collection', () => {
    const config = generateLevel(1, 123);
    applyLevelToFloors(config);
    expect(allDocumentsCollected()).toBe(false);

    for (const floor of FLOORS) {
      for (const door of floor.doors) {
        if (door.type === 'red') door.collected = true;
      }
    }
    expect(allDocumentsCollected()).toBe(true);
    expect(highestUncollectedRedDoorFloor()).toBeNull();
  });
});

describe('buildingLayout', () => {
  it('has 30 floors plus basement', () => {
    expect(FLOORS.length).toBe(31);
    expect(FLOORS.find((f: { number: number }) => f.number === 0)).toBeDefined();
    expect(FLOORS.find((f: { number: number }) => f.number === 30)).toBeDefined();
  });

  it('marks floors 15-11 as permanently dark', () => {
    for (let n = 11; n <= 15; n++) {
      const floor = FLOORS.find((f: { number: number }) => f.number === n);
      expect(floor?.permanentlyDark).toBe(true);
    }
  });

  it('floor 7 has no doors', () => {
    const floor = FLOORS.find((f: { number: number }) => f.number === 7);
    expect(floor?.noDoors).toBe(true);
    expect(floor?.doors.length).toBe(0);
  });
});
