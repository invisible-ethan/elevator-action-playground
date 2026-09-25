import { describe, expect, it } from 'vitest';
import { Rng } from '../core/rng';
import type { Shaft } from '../sim/building';
import { CAR_AUTO_SPEED, CAR_PLAYER_SPEED, FLOOR_H, floorY } from '../sim/constants';
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

  it('travels at 70% of the original speed and still lands exactly on each floor', () => {
    expect(CAR_AUTO_SPEED).toBeCloseTo(0.7);
    expect(CAR_PLAYER_SPEED).toBeCloseTo(1.4);
    const car = createCar(shaft, new Rng(4));
    car.y = floorY(5);
    car.state = 'wait';
    let frames = 0;
    updateCar(car, { up: true, down: false });
    frames++;
    while (car.state === 'move') {
      updateCar(car, { up: false, down: false });
      frames++;
    }
    expect(frames).toBe(Math.ceil(FLOOR_H / CAR_PLAYER_SPEED));
    expect(car.y).toBe(floorY(6));

    car.driven = false;
    car.wait = 1;
    car.dir = -1;
    frames = 0;
    // The wait runs out on this frame and the car moves off.
    updateCar(car, null);
    frames++;
    while (car.state === 'move') {
      updateCar(car, null);
      frames++;
    }
    expect(frames).toBe(Math.ceil(FLOOR_H / CAR_AUTO_SPEED));
    expect(car.y).toBe(floorY(7));
  });
});
