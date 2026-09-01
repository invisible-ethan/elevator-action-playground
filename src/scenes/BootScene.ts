import Phaser from 'phaser';
import { generateGameTextures } from '../graphics/SpriteFactory';

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
    generateGameTextures(this);
  }

  create(): void {
    this.scene.start('Title');
  }
}
