import { Rng } from '../core/rng';
import type { Shaft } from './building';
import { CAR_AUTO_SPEED, CAR_PLAYER_SPEED, CAR_WAIT, floorY, roomFloor } from './constants';

export interface Car {
  id: number;
  shaft: Shaft;
  x: number;
  /** World y of the car floor (a character inside stands here). */
  y: number;
  state: 'wait' | 'move';
  /** -1 moves up the building (y decreasing), +1 moves down. */
  dir: -1 | 1;
  wait: number;
  /** True while the player is inside and driving it. */
  driven: boolean;
}

export interface CarControl {
  up: boolean;
  down: boolean;
}

export function createCar(shaft: Shaft, rng: Rng): Car {
  const f = rng.int(shaft.min, shaft.max);
  return {
    id: shaft.id,
    shaft,
    x: shaft.x,
    y: floorY(f),
    state: 'wait',
    dir: rng.chance(0.5) ? -1 : 1,
    wait: rng.int(0, CAR_WAIT),
    driven: false,
  };
}

/** Floor the car is level with, or null when between floors. */
export function carFloor(car: Car): number | null {
  const f = roomFloor(car.y);
  return floorY(f) === car.y ? f : null;
}

/** Floor whose floor line is level with the car's roof, or null. */
export function carRoofFloor(car: Car): number | null {
  const f = carFloor(car);
  return f === null ? null : f + 1;
}

export function isStoppedAt(car: Car, floor: number): boolean {
  return car.state === 'wait' && carFloor(car) === floor;
}

/**
 * Advances one frame. Unattended cars shuttle up and down, pausing at every floor.
 * A driven car moves while up/down is held and always comes to rest level with a floor.
 * Returns true on the frame the car stops at a floor.
 */
export function updateCar(car: Car, ctl: CarControl | null): boolean {
  const { min, max } = car.shaft;

  if (car.state === 'wait') {
    const f = carFloor(car)!;
    if (ctl) {
      if (ctl.up && f < max) {
        car.dir = -1;
        car.state = 'move';
      } else if (ctl.down && f > min) {
        car.dir = 1;
        car.state = 'move';
      }
    } else if (--car.wait <= 0) {
      if (f >= max) car.dir = 1;
      else if (f <= min) car.dir = -1;
      car.state = 'move';
    }
    if (car.state === 'wait') return false;
  }

  car.y += car.dir * (ctl ? CAR_PLAYER_SPEED : CAR_AUTO_SPEED);
  // Clamp against odd speeds so the car can never leave its shaft.
  car.y = Math.min(floorY(min), Math.max(floorY(max), car.y));
  const f = carFloor(car);
  if (f === null) return false;

  let stop: boolean;
  if (ctl) {
    stop = car.dir === -1 ? !(ctl.up && f < max) : !(ctl.down && f > min);
  } else {
    stop = true;
  }
  if (f >= max) car.dir = 1;
  else if (f <= min) car.dir = -1;
  if (stop) {
    car.state = 'wait';
    car.wait = CAR_WAIT;
  }
  return stop;
}
