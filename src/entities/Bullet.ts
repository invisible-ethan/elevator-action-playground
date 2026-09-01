import Phaser from 'phaser';
import { BULLET_SPEED } from '../config/gameConfig';

export class Bullet extends Phaser.Physics.Arcade.Sprite {
  direction: 1 | -1 = 1;
  ownerTag = 'player';

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'bullet');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDisplaySize(4, 2);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    body.setSize(4, 2);
    this.setDepth(50);
  }

  fire(direction: 1 | -1, ownerTag: string): void {
    this.direction = direction;
    this.ownerTag = ownerTag;
    this.setVelocityX(direction * BULLET_SPEED);
    this.setFlipX(direction < 0);
  }

  update(): void {
    if (this.x < -10 || this.x > 266) {
      this.destroy();
    }
  }
}
