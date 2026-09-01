import Phaser from 'phaser';
import {
  COLORS,
  ELEVATOR_SPEED,
  FLOOR_HEIGHT,
  HALLWAY_Y_OFFSET,
} from '../config/gameConfig';
import { floorToY, type ShaftDef } from '../data/buildingLayout';

export type ElevatorState = 'idle' | 'moving' | 'player_control';

export class ElevatorCar extends Phaser.GameObjects.Rectangle {
  shaft: ShaftDef;
  carIndex: number;
  currentFloor: number;
  targetFloor: number | null = null;
  direction: 1 | -1 = -1;
  speed = ELEVATOR_SPEED;
  occupiedBy: 'none' | 'player' | 'enemy' = 'none';
  riderRef: Phaser.GameObjects.GameObject | null = null;
  playerControlled = false;
  controlDirection: 1 | -1 = 0 as unknown as 1;

  constructor(
    scene: Phaser.Scene,
    shaft: ShaftDef,
    carIndex: number,
    startFloor: number,
  ) {
    const y = floorToY(startFloor) + HALLWAY_Y_OFFSET;
    super(scene, shaft.x, y, 22, 10, COLORS.elevator);
    scene.add.existing(this);
    this.shaft = shaft;
    this.carIndex = carIndex;
    this.currentFloor = startFloor;
    this.targetFloor = null;
    this.setStrokeStyle(1, 0xccccdd);
  }

  get serviceFloors(): number[] {
    if (!this.shaft.doubleLift || this.carIndex === 0) {
      return this.shaft.serviceFloors;
    }
  // Top car in double-lift skips lowest 2 floors
    return this.shaft.serviceFloors.filter((f) => f >= 3);
  }

  getWorldYForFloor(floor: number): number {
    const offset = this.shaft.doubleLift && this.carIndex === 1 ? -FLOOR_HEIGHT * 2 : 0;
    return floorToY(floor) + HALLWAY_Y_OFFSET + offset;
  }

  setPlayerControl(active: boolean, dir: 1 | -1 = 1): void {
    this.playerControlled = active;
    if (active) {
      this.controlDirection = dir;
      this.targetFloor = null;
    }
  }

  updateCar(delta: number, speedMultiplier = 1): void {
    const dt = delta / 1000;
    const floors = this.serviceFloors;
    if (floors.length === 0) return;

    if (this.playerControlled && this.occupiedBy === 'player') {
      const nextFloor =
        this.controlDirection < 0
          ? Math.min(...floors.filter((f) => f < this.currentFloor), this.currentFloor) ||
            this.currentFloor
          : Math.max(...floors.filter((f) => f > this.currentFloor), this.currentFloor) ||
            this.currentFloor;

      if (nextFloor !== this.currentFloor) {
        const targetY = this.getWorldYForFloor(nextFloor);
        const dy = targetY - this.y;
        const move = this.speed * speedMultiplier * dt * this.controlDirection;
        if (Math.abs(dy) <= Math.abs(move)) {
          this.y = targetY;
          this.currentFloor = nextFloor;
        } else {
          this.y += move;
        }
      }
      return;
    }

    if (this.targetFloor === null) {
      const idx = floors.indexOf(this.currentFloor);
      if (idx === -1) {
        this.currentFloor = floors[0]!;
        this.y = this.getWorldYForFloor(this.currentFloor);
        return;
      }
      const nextIdx = idx + this.direction;
      if (nextIdx < 0 || nextIdx >= floors.length) {
        this.direction = (this.direction * -1) as 1 | -1;
        this.targetFloor = floors[idx + this.direction] ?? this.currentFloor;
      } else {
        this.targetFloor = floors[nextIdx]!;
      }
    }

    if (this.targetFloor !== null) {
      const targetY = this.getWorldYForFloor(this.targetFloor);
      const dy = targetY - this.y;
      const move = Math.sign(dy) * this.speed * speedMultiplier * dt;
      if (Math.abs(dy) <= Math.abs(move)) {
        this.y = targetY;
        this.currentFloor = this.targetFloor;
        this.targetFloor = null;
      } else {
        this.y += move;
      }
    }
  }

  containsX(x: number): boolean {
    return x >= this.x - 11 && x <= this.x + 11;
  }

  isCrushing(entityY: number, entityHeight: number): boolean {
    const carBottom = this.y + 5;
    const carTop = this.y - 5;
    const entityBottom = entityY + entityHeight / 2;
    const entityTop = entityY - entityHeight / 2;
    return entityBottom > carTop && entityTop < carBottom;
  }
}
