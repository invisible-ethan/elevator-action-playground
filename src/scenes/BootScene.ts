import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    this.scene.start('Preload');
  }
}

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('Preload');
  }

  preload(): void {
    const gfx = this.make.graphics({ x: 0, y: 0 });

    gfx.fillStyle(0xffffff);
    gfx.fillRect(0, 0, 8, 12);
    gfx.generateTexture('player', 8, 12);
    gfx.clear();

    gfx.fillStyle(0x333344);
    gfx.fillRect(0, 0, 8, 12);
    gfx.generateTexture('enemy', 8, 12);
    gfx.clear();

    gfx.fillStyle(0xffff44);
    gfx.fillRect(0, 0, 4, 2);
    gfx.generateTexture('bullet', 4, 2);
    gfx.clear();

    gfx.fillStyle(0xffdd66);
    gfx.fillRect(0, 0, 6, 4);
    gfx.generateTexture('lamp', 6, 4);
    gfx.clear();

    gfx.fillStyle(0xcc4444);
    gfx.fillRect(0, 0, 16, 8);
    gfx.generateTexture('car', 16, 8);
    gfx.destroy();
  }

  create(): void {
    this.scene.start('Title');
  }
}
