import Phaser from 'phaser';
import {
  COLORS,
  ENEMY_SHOOT_INTERVAL,
  ENEMY_SPEED,
  FLOOR_HEIGHT,
  HALLWAY_Y_OFFSET,
} from '../config/gameConfig';
import { floorToY } from '../data/buildingLayout';
import { Bullet } from './Bullet';
import type { ElevatorCar } from './Elevator';

export type EnemyState = 'patrol' | 'shoot' | 'crouch' | 'prone' | 'ride' | 'dead';

export class Enemy extends Phaser.Physics.Arcade.Sprite {
  state: EnemyState = 'patrol';
  facing: 1 | -1 = -1;
  floor: number;
  shootTimer = 0;
  stateTimer = 0;
  inElevator: ElevatorCar | null = null;
  aggression = 1;

  constructor(scene: Phaser.Scene, x: number, floor: number) {
    const y = floorToY(floor) + HALLWAY_Y_OFFSET;
    super(scene, x, y, 'enemy');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.floor = floor;
    this.setTint(COLORS.enemySuit);
    this.setDisplaySize(8, 12);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(7, 11);
    body.setAllowGravity(false);
    this.facing = Math.random() > 0.5 ? 1 : -1;
    this.shootTimer = ENEMY_SHOOT_INTERVAL * Math.random();
  }

  get isVulnerable(): boolean {
    return this.state !== 'dead' && this.state !== 'prone';
  }

  get isProne(): boolean {
    return this.state === 'prone';
  }

  die(): void {
    this.state = 'dead';
    this.setVelocity(0, 0);
    this.setActive(false);
    this.setVisible(false);
  }

  tryShoot(bullets: Phaser.GameObjects.Group, targetX: number): void {
    if (this.state === 'dead' || this.state === 'prone') return;
    const dir = targetX > this.x ? 1 : -1;
    this.facing = dir as 1 | -1;
    this.setFlipX(dir < 0);

    const bullet = new Bullet(this.scene, this.x, this.y - 2);
    bullets.add(bullet);
    bullet.fire(dir as 1 | -1, 'enemy');
    bullet.setTint(0xff6644);
  }

  updateEnemy(
    delta: number,
    playerX: number,
    playerY: number,
    isDark: boolean,
    elevators: ElevatorCar[],
    bullets: Phaser.GameObjects.Group,
  ): void {
    if (this.state === 'dead') return;

    this.shootTimer -= delta * this.aggression;
    this.stateTimer -= delta;

    const dist = Math.abs(playerX - this.x);
    const sameFloor = Math.abs(playerY - this.y) < FLOOR_HEIGHT;

    if (this.stateTimer <= 0 && sameFloor && dist < 100) {
      if (Math.random() < 0.15 * this.aggression) {
        this.state = 'crouch';
        this.stateTimer = 800;
        this.setDisplaySize(8, 7);
      } else if (Math.random() < 0.08 * this.aggression) {
        this.state = 'prone';
        this.stateTimer = 1200;
        this.setDisplaySize(10, 4);
      } else {
        this.state = 'patrol';
        this.setDisplaySize(8, 12);
      }
    }

    if (this.state === 'patrol') {
      this.setVelocityX(this.facing * ENEMY_SPEED);
      if (this.x < 16 || this.x > 240) {
        this.facing = (this.facing * -1) as 1 | -1;
      }
    } else {
      this.setVelocityX(0);
    }

    if (sameFloor && this.shootTimer <= 0 && dist < 120) {
      this.tryShoot(bullets, playerX);
      const baseInterval = isDark ? ENEMY_SHOOT_INTERVAL * 1.3 : ENEMY_SHOOT_INTERVAL;
      this.shootTimer = baseInterval / this.aggression;
    }

    // Board elevators occasionally
    if (!this.inElevator && Math.random() < 0.001 * this.aggression) {
      for (const car of elevators) {
        if (car.currentFloor === this.floor && car.containsX(this.x) && car.occupiedBy === 'none') {
          this.inElevator = car;
          car.occupiedBy = 'enemy';
          car.riderRef = this;
          this.state = 'ride';
          break;
        }
      }
    }

    if (this.inElevator) {
      this.x = this.inElevator.x;
      this.y = this.inElevator.y - 1;
      this.floor = this.inElevator.currentFloor;
    }
  }
}
