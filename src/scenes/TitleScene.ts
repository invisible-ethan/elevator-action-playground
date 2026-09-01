import Phaser from 'phaser';
import { GAME_WIDTH, KEYS, PALETTE } from '../config/gameConfig';
import { drawTitleLogo } from '../graphics/SpriteFactory';

export class TitleScene extends Phaser.Scene {
  private blinkTimer = 0;
  private showPress = true;

  constructor() {
    super('Title');
  }

  create(): void {
    this.cameras.main.setBackgroundColor(PALETTE.black);

    drawTitleLogo(this);

    this.add
      .text(GAME_WIDTH / 2, 108, '(C) TAITO CORPORATION 1983', {
        fontFamily: '"Courier New", monospace',
        fontSize: '6px',
        color: '#aaaaaa',
        resolution: 2,
      })
      .setOrigin(0.5);

    this.add
      .text(GAME_WIDTH / 2, 130, '1 PLAYER', {
        fontFamily: '"Courier New", monospace',
        fontSize: '9px',
        color: '#ffffff',
        resolution: 2,
      })
      .setOrigin(0.5);

    this.add
      .text(GAME_WIDTH / 2, 148, '2 PLAYERS', {
        fontFamily: '"Courier New", monospace',
        fontSize: '9px',
        color: '#888888',
        resolution: 2,
      })
      .setOrigin(0.5);

    this.add
      .text(GAME_WIDTH / 2, 180, 'PRESS ENTER', {
        fontFamily: '"Courier New", monospace',
        fontSize: '8px',
        color: '#ffff00',
        resolution: 2,
      })
      .setOrigin(0.5)
      .setName('pressStart');

    this.add
      .text(GAME_WIDTH / 2, 210, 'FAN RECREATION', {
        fontFamily: '"Courier New", monospace',
        fontSize: '6px',
        color: '#555555',
        resolution: 2,
      })
      .setOrigin(0.5);

    const hs = localStorage.getItem('ea_highscore') ?? '0';
    this.add
      .text(GAME_WIDTH - 6, 6, `HI\n${hs.padStart(6, '0')}`, {
        fontFamily: '"Courier New", monospace',
        fontSize: '7px',
        color: '#ffffff',
        align: 'right',
        resolution: 2,
      })
      .setOrigin(1, 0);

    const keyEnter = this.input.keyboard!.addKey(KEYS.P1.start);
    const keyP2 = this.input.keyboard!.addKey(KEYS.P2.start);
    keyEnter.on('down', () => this.startGame(1));
    keyP2.on('down', () => this.startGame(2));
  }

  update(_time: number, delta: number): void {
    this.blinkTimer += delta;
    if (this.blinkTimer > 500) {
      this.blinkTimer = 0;
      this.showPress = !this.showPress;
      const t = this.children.getByName('pressStart') as Phaser.GameObjects.Text;
      t.setAlpha(this.showPress ? 1 : 0.25);
    }
  }

  private startGame(players: number): void {
    this.scene.start('Game', {
      players,
      level: 1,
      p1Lives: 3,
      p2Lives: 3,
      p1Score: 0,
      p2Score: 0,
    });
  }
}
