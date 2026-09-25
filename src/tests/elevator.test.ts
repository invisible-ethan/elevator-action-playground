import { describe, expect, it } from 'vitest';
import { Rng } from '../core/rng';
import type { Shaft } from '../sim/building';
import { floorY } from '../sim/constants';
import { carFloor, createCar, updateCar } from '../sim/elevator';

const shaft: Shaft = { id: 0, slot: 1, x: 128, min: 3, max: 8 };

describe('elevator car', () => {
  it('shuttles unattended through its whole range and never leaves it', () => {
    const car = createCar(shaft, new Rng(1));
    const visited = new Set<number>();
    for (let i = 0; i < 5000; i++) {
      updateCar(car, null);
      expect(car.y).toBeLessThanOrEqual(floorY(shaft.min));
      expect(car.y).toBeGreaterThanOrEqual(floorY(shaft.max));
      const f = carFloor(car);
      if (f !== null) visited.add(f);
    }
    expect([...visited].sort((a, b) => a - b)).toEqual([3, 4, 5, 6, 7, 8]);
  });

  it('pauses at every floor when unattended', () => {
    const car = createCar(shaft, new Rng(2));
    let stops = 0;
    for (let i = 0; i < 3000; i++) if (updateCar(car, null)) stops++;
    expect(stops).toBeGreaterThan(10);
  });

  it('moves one floor per tap under player control and waits otherwise', () => {
    const car = createCar(shaft, new Rng(3));
    car.y = floorY(5);
    car.state = 'wait';
    // Idle: a driven car does not wander off.
    for (let i = 0; i < 200; i++) updateCar(car, { up: false, down: false });
    expect(carFloor(car)).toBe(5);
    // Tap up: the car keeps going until it is level with the next floor.
    updateCar(car, { up: true, down: false });
    for (let i = 0; i < 100; i++) updateCar(car, { up: false, down: false });
    expect(carFloor(car)).toBe(6);
    // Hold down: passes floors without stopping until the bottom of the shaft.
    for (let i = 0; i < 200; i++) updateCar(car, { up: false, down: true });
    expect(carFloor(car)).toBe(shaft.min);
    expect(car.state).toBe('wait');
  });
});
