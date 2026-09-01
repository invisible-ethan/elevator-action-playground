import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/gameConfig';
import { HUD_BOTTOM_HEIGHT, HUD_TOP_HEIGHT, PALETTE } from './palette';

export interface HudState {
  score: number;
  highScore: number;
  lives: number;
  level: number;
  floor: number;
  docsRemaining: number;
  playerLabel: string;
  credit: number;
  alarm: boolean;
}

export class HudRenderer {
  private topBar!: Phaser.GameObjects.Graphics;
  private bottomBar!: Phaser.GameObjects.Graphics;
  private scoreText!: Phaser.GameObjects.Text;
  private hiText!: Phaser.GameObjects.Text;
  private creditText!: Phaser.GameObjects.Text;
  private lifeIcons: Phaser.GameObjects.Image[] = [];
  private alarmText!: Phaser.GameObjects.Text;
  private infoText!: Phaser.GameObjects.Text;

  constructor(private scene: Phaser.Scene) {}

  create(): void {
    this.topBar = this.scene.add.graphics().setScrollFactor(0).setDepth(200);
    this.bottomBar = this.scene.add.graphics().setScrollFactor(0).setDepth(200);

    const style = {
      fontFamily: '"Courier New", monospace',
      fontSize: '8px',
      color: '#ffffff',
      resolution: 2,
    };

    this.scoreText = this.scene.add
      .text(4, 2, '', { ...style, color: '#ff8080' })
      .setScrollFactor(0)
      .setDepth(201);

    this.hiText = this.scene.add
      .text(GAME_WIDTH / 2, 2, '', style)
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(201);

    this.creditText = this.scene.add
      .text(GAME_WIDTH - 4, GAME_HEIGHT - 12, '', style)
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(201);

    this.infoText = this.scene.add
      .text(4, GAME_HEIGHT - 12, '', style)
      .setScrollFactor(0)
      .setDepth(201);

    this.alarmText = this.scene.add
      .text(GAME_WIDTH / 2, 10, '', {
        ...style,
        color: '#ffff00',
        fontSize: '7px',
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(201);

    this.drawBars();
  }

  private drawBars(): void {
    this.topBar.clear();
    this.topBar.fillStyle(PALETTE.pink, 1);
    this.topBar.fillRect(0, 0, GAME_WIDTH, HUD_TOP_HEIGHT);
    this.topBar.fillStyle(PALETTE.pinkDark, 1);
    this.topBar.fillRect(0, HUD_TOP_HEIGHT - 2, GAME_WIDTH, 2);

    this.bottomBar.clear();
    this.bottomBar.fillStyle(PALETTE.pink, 1);
    this.bottomBar.fillRect(0, GAME_HEIGHT - HUD_BOTTOM_HEIGHT, GAME_WIDTH, HUD_BOTTOM_HEIGHT);
    this.bottomBar.fillStyle(PALETTE.pinkDark, 1);
    this.bottomBar.fillRect(0, GAME_HEIGHT - HUD_BOTTOM_HEIGHT, GAME_WIDTH, 2);
  }

  update(state: HudState): void {
    this.scoreText.setText(
      `${state.playerLabel}\n${String(state.score).padStart(6, '0')}`,
    );
    this.hiText.setText(
      `HI-SCORE\n${String(state.highScore).padStart(6, '0')}`,
    );
    this.creditText.setText(`CREDIT-${state.credit}`);
    this.infoText.setText(`L${state.level}  F${state.floor}  DOCS ${state.docsRemaining}`);
    this.alarmText.setText(state.alarm ? '! ALARM !' : '');

    this.lifeIcons.forEach((icon) => icon.destroy());
    this.lifeIcons = [];
    for (let i = 0; i < state.lives; i++) {
      const icon = this.scene.add
        .image(6 + i * 10, GAME_HEIGHT - 9, 'life_icon')
        .setScrollFactor(0)
        .setDepth(201);
      this.lifeIcons.push(icon);
    }
  }
}

export function getPlayfieldViewport(): { top: number; bottom: number; height: number } {
  return {
    top: HUD_TOP_HEIGHT,
    bottom: GAME_HEIGHT - HUD_BOTTOM_HEIGHT,
    height: GAME_HEIGHT - HUD_TOP_HEIGHT - HUD_BOTTOM_HEIGHT,
  };
}
