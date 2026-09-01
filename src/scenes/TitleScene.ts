import Phaser from 'phaser';
import { COLORS, GAME_WIDTH, KEYS } from '../config/gameConfig';

export class TitleScene extends Phaser.Scene {
  private blinkTimer = 0;
  private showPress = true;

  constructor() {
    super('Title');
  }

  create(): void {
    this.cameras.main.setBackgroundColor(COLORS.background);

    this.add
      .text(GAME_WIDTH / 2, 50, 'ELEVATOR', {
        fontFamily: 'monospace',
        fontSize: '20px',
        color: '#ff4444',
      })
      .setOrigin(0.5);

    this.add
      .text(GAME_WIDTH / 2, 72, 'ACTION', {
        fontFamily: 'monospace',
        fontSize: '20px',
        color: '#44aaff',
      })
      .setOrigin(0.5);

    this.add
      .text(GAME_WIDTH / 2, 100, 'AGENT 17 - OTTO', {
        fontFamily: 'monospace',
        fontSize: '8px',
        color: '#aaaaaa',
      })
      .setOrigin(0.5);

    this.add
      .text(GAME_WIDTH / 2, 130, '1 PLAYER', {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#ffffff',
      })
      .setOrigin(0.5)
      .setName('p1option');

    this.add
      .text(GAME_WIDTH / 2, 148, '2 PLAYERS', {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#888888',
      })
      .setOrigin(0.5)
      .setName('p2option');

    this.add
      .text(GAME_WIDTH / 2, 190, 'PRESS ENTER', {
        fontFamily: 'monospace',
        fontSize: '8px',
        color: '#ffff00',
      })
      .setOrigin(0.5)
      .setName('pressStart');

    this.add
      .text(GAME_WIDTH / 2, 210, 'TAITO 1983 - FAN RECREATION', {
        fontFamily: 'monospace',
        fontSize: '6px',
        color: '#555555',
      })
      .setOrigin(0.5);

    const keyEnter = this.input.keyboard!.addKey(KEYS.P1.start);
    const keyP2 = this.input.keyboard!.addKey(KEYS.P2.start);

    keyEnter.on('down', () => this.startGame(1));
    keyP2.on('down', () => this.startGame(2));

    const hs = localStorage.getItem('ea_highscore') ?? '0';
    this.add
      .text(GAME_WIDTH - 4, 4, `HI ${hs}`, {
        fontFamily: 'monospace',
        fontSize: '8px',
        color: '#ffff00',
      })
      .setOrigin(1, 0);
  }

  update(_time: number, delta: number): void {
    this.blinkTimer += delta;
    if (this.blinkTimer > 500) {
      this.blinkTimer = 0;
      this.showPress = !this.showPress;
      const t = this.children.getByName('pressStart') as Phaser.GameObjects.Text;
      t.setAlpha(this.showPress ? 1 : 0.2);
    }
  }

  private startGame(players: number): void {
    this.scene.start('Game', { players, level: 1, p1Lives: 3, p2Lives: 3, p1Score: 0, p2Score: 0 });
  }
}
