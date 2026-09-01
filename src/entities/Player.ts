import Phaser from 'phaser';
import {
  HALLWAY_Y_OFFSET,
  MAX_BULLETS,
  PLAYER_JUMP_VELOCITY,
  PLAYER_SPEED,
  RED_DOOR_SHELTER_MS,
} from '../config/gameConfig';
import { floorToY, getFloorDef, yToFloor } from '../data/buildingLayout';
import { getDoorX } from '../graphics/BuildingRenderer';
import { Bullet } from './Bullet';
import type { ElevatorCar } from './Elevator';

export type PlayerState =
  | 'idle'
  | 'walk'
  | 'jump'
  | 'crouch'
  | 'in_elevator'
  | 'on_elevator_roof'
  | 'in_door'
  | 'on_escalator'
  | 'dead';

export class Player extends Phaser.Physics.Arcade.Sprite {
  playerIndex: 0 | 1;
  state: PlayerState = 'idle';
  facing: 1 | -1 = 1;
  lives = 3;
  inElevator: ElevatorCar | null = null;
  onRoofElevator: ElevatorCar | null = null;
  shelterTimer = 0;
  shelterDoorSide: 'left' | 'right' | null = null;
  shootCooldown = 0;
  crouching = false;
  onEscalator = false;
  escalatorDirection: 1 | -1 = -1;
  silhouette = false;

  constructor(scene: Phaser.Scene, x: number, y: number, playerIndex: 0 | 1) {
    super(scene, x, y, 'otto');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.playerIndex = playerIndex;
    this.setDepth(40);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(7, 11);
    body.setCollideWorldBounds(false);
    body.setGravityY(0);
  }

  get currentFloor(): number {
    return yToFloor(this.y - HALLWAY_Y_OFFSET);
  }

  get isInDarkness(): boolean {
    const floor = getFloorDef(this.currentFloor);
    return floor?.permanentlyDark ?? false;
  }

  get canShoot(): boolean {
    return this.state !== 'in_door' && this.state !== 'dead' && this.shootCooldown <= 0;
  }

  get canCrouch(): boolean {
    return this.state !== 'in_elevator' && this.state !== 'in_door';
  }

  setSilhouette(active: boolean): void {
    this.silhouette = active;
    if (active) {
      this.setTint(0xffffff);
    } else {
      this.clearTint();
    }
  }

  enterElevator(car: ElevatorCar): void {
    this.inElevator = car;
    this.state = 'in_elevator';
    car.occupiedBy = 'player';
    car.riderRef = this;
    this.setVelocity(0, 0);
    this.x = car.x;
  }

  exitElevator(): void {
    if (this.inElevator) {
      this.inElevator.occupiedBy = 'none';
      this.inElevator.riderRef = null;
      this.inElevator.setPlayerControl(false);
      this.inElevator = null;
    }
    this.state = 'idle';
  }

  enterDoor(side: 'left' | 'right'): void {
    this.state = 'in_door';
    this.shelterTimer = RED_DOOR_SHELTER_MS;
    this.shelterDoorSide = side;
    this.setVelocity(0, 0);
    this.setVisible(false);
  }

  exitDoor(): void {
    const side = this.shelterDoorSide;
    this.state = 'idle';
    this.shelterTimer = 0;
    this.shelterDoorSide = null;
    this.setVisible(true);
    if (side) {
      this.x = getDoorX(side);
    }
  }

  die(): void {
    this.state = 'dead';
    this.setVelocity(0, 0);
    this.exitElevator();
    this.setVisible(false);
  }

  respawn(floor: number): void {
    this.state = 'idle';
    this.setVisible(true);
    this.clearTint();
    this.silhouette = false;
    this.y = floorToY(floor) + HALLWAY_Y_OFFSET;
    this.x = 128;
    this.lives -= 1;
  }

  handleMovement(
    cursors: { left: boolean; right: boolean; up: boolean; down: boolean },
    elevators: ElevatorCar[],
  ): void {
    if (this.state === 'dead' || this.state === 'in_door') return;

    if (this.state === 'in_elevator' && this.inElevator) {
      if (cursors.up) this.inElevator.setPlayerControl(true, -1);
      else if (cursors.down) this.inElevator.setPlayerControl(true, 1);
      else this.inElevator.setPlayerControl(false);
      this.x = this.inElevator.x;
      this.y = this.inElevator.y - 1;
      return;
    }

    if (this.onRoofElevator) {
      this.x = this.onRoofElevator.x;
      this.y = this.onRoofElevator.y - 8;
      if (cursors.left) this.x -= PLAYER_SPEED * 0.016;
      if (cursors.right) this.x += PLAYER_SPEED * 0.016;
      return;
    }

    if (this.onEscalator) {
      this.y += this.escalatorDirection * 30 * 0.016;
      return;
    }

    let vx = 0;
    if (cursors.left) {
      vx = -PLAYER_SPEED;
      this.facing = -1;
    } else if (cursors.right) {
      vx = PLAYER_SPEED;
      this.facing = 1;
    }

    this.crouching = cursors.down && this.canCrouch && this.body!.blocked.down;
    if (this.crouching) {
      this.state = 'crouch';
      this.setTexture('otto_crouch');
      (this.body as Phaser.Physics.Arcade.Body).setSize(7, 6);
    } else {
      if (this.state === 'crouch') this.state = 'idle';
      this.setTexture('otto');
      (this.body as Phaser.Physics.Arcade.Body).setSize(7, 11);
    }

    this.setVelocityX(vx);
    this.setFlipX(this.facing < 0);

    if (cursors.up || cursors.down) {
      for (const car of elevators) {
        if (car.containsX(this.x) && Math.abs(car.y - this.y) < 10 && car.occupiedBy === 'none') {
          this.enterElevator(car);
          car.setPlayerControl(true, cursors.up ? -1 : 1);
          break;
        }
      }
    }

    if (this.inElevator && !cursors.up && !cursors.down) {
      const floorY = floorToY(this.inElevator.currentFloor) + HALLWAY_Y_OFFSET;
      if (Math.abs(this.inElevator.y - floorY) < 2) {
        this.y = floorY;
        this.exitElevator();
      }
    }
  }

  jump(): void {
    if (this.state === 'in_elevator' || this.state === 'in_door' || this.state === 'dead' || this.crouching) {
      return;
    }
    if (this.body!.blocked.down || this.state === 'idle' || this.state === 'walk') {
      this.setVelocityY(PLAYER_JUMP_VELOCITY);
      this.state = 'jump';
      (this.body as Phaser.Physics.Arcade.Body).setGravityY(500);
    }
  }

  shoot(bullets: Phaser.GameObjects.Group): Bullet | null {
    if (!this.canShoot) return null;
    const active = bullets.getChildren().filter(
      (b) => (b as Bullet).ownerTag === `player${this.playerIndex}`,
    );
    if (active.length >= MAX_BULLETS) return null;

    const bullet = new Bullet(this.scene, this.x + this.facing * 4, this.y - 2);
    bullets.add(bullet);
    bullet.fire(this.facing, `player${this.playerIndex}`);
    this.shootCooldown = 200;
    return bullet;
  }

  updatePlayer(delta: number): void {
    if (this.shootCooldown > 0) this.shootCooldown -= delta;

    if (this.state === 'in_door') {
      this.shelterTimer -= delta;
      if (this.shelterTimer <= 0) this.exitDoor();
      return;
    }

    const floor = this.currentFloor;
    const floorY = floorToY(floor) + HALLWAY_Y_OFFSET;
    if (this.state !== 'in_elevator' && this.state !== 'on_elevator_roof' && !this.onEscalator) {
      if (this.body!.velocity.y === 0 && this.state === 'jump') this.state = 'idle';
      if (Math.abs(this.y - floorY) < 24) {
        this.y = floorY;
        this.setVelocityY(0);
        (this.body as Phaser.Physics.Arcade.Body).setGravityY(0);
      }
    }
  }
}
