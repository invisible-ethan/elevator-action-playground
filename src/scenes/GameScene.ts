import Phaser from 'phaser';
import {
  COLORS,
  FLOOR_HEIGHT,
  GAME_HEIGHT,
  GAME_WIDTH,
  HALLWAY_Y_OFFSET,
  KEYS,
  STARTING_LIVES,
  TOTAL_FLOORS,
} from '../config/gameConfig';
import {
  BASEMENT_FLOOR,
  FLOORS,
  floorToY,
  getFloorDef,
  SHAFTS,
} from '../data/buildingLayout';
import { ElevatorCar } from '../entities/Elevator';
import { Enemy } from '../entities/Enemy';
import { Player } from '../entities/Player';
import { Bullet } from '../entities/Bullet';
import { AlarmSystem } from '../systems/AlarmSystem';
import {
  allDocumentsCollected,
  applyLevelToFloors,
  generateLevel,
  highestUncollectedRedDoorFloor,
  type LevelConfig,
} from '../systems/LevelGenerator';
import { ScoreManager } from '../systems/ScoreManager';
import { AudioManager } from '../systems/AudioManager';

interface GameData {
  players: number;
  level: number;
  p1Lives: number;
  p2Lives: number;
  p1Score: number;
  p2Score: number;
}

export class GameScene extends Phaser.Scene {
  private levelConfig!: LevelConfig;
  private elevators: ElevatorCar[] = [];
  private player!: Player;
  private player2: Player | null = null;
  private activePlayerIndex: 0 | 1 = 0;
  private enemies: Enemy[] = [];
  private bullets!: Phaser.GameObjects.Group;
  private lamps: Phaser.GameObjects.Rectangle[] = [];
  private scoreManager = new ScoreManager();
  private scoreManager2 = new ScoreManager();
  private alarm = new AlarmSystem();
  private audio = new AudioManager();
  private buildingGraphics!: Phaser.GameObjects.Graphics;
  private darknessOverlay!: Phaser.GameObjects.Rectangle;
  private globalDark = false;
  private globalDarkTimer = 0;
  private level = 1;
  private numPlayers = 1;
  private p1Lives = STARTING_LIVES;
  private p2Lives = STARTING_LIVES;
  private spawnTimer = 0;
  private gameOver = false;
  private levelComplete = false;
  private uiText!: Phaser.GameObjects.Text;
  private alarmText!: Phaser.GameObjects.Text;
  private worldHeight = 0;

  constructor() {
    super('Game');
  }

  init(data: GameData): void {
    this.level = data.level ?? 1;
    this.numPlayers = data.players ?? 1;
    this.p1Lives = data.p1Lives ?? STARTING_LIVES;
    this.p2Lives = data.p2Lives ?? STARTING_LIVES;
    this.scoreManager.score = data.p1Score ?? 0;
    this.scoreManager2.score = data.p2Score ?? 0;
    this.gameOver = false;
    this.levelComplete = false;
    this.activePlayerIndex = 0;
    this.enemies = [];
    this.elevators = [];
    this.lamps = [];
    this.globalDark = false;
    this.globalDarkTimer = 0;
  }

  create(): void {
    this.worldHeight = (TOTAL_FLOORS + 1) * FLOOR_HEIGHT + 30;
    this.physics.world.setBounds(0, 0, GAME_WIDTH, this.worldHeight);

    this.levelConfig = generateLevel(this.level);
    applyLevelToFloors(this.levelConfig);

    this.buildingGraphics = this.add.graphics();
    this.drawBuilding();

    this.createElevators();
    this.createLamps();

    this.bullets = this.add.group({ name: 'bullets' });

    const startY = floorToY(30) + HALLWAY_Y_OFFSET;
    this.player = new Player(this, 128, startY, 0);
    this.player.lives = this.p1Lives;

    if (this.numPlayers === 2) {
      this.player2 = new Player(this, 128, startY, 1);
      this.player2.lives = this.p2Lives;
      this.player2.setVisible(false);
    }

    this.darknessOverlay = this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0)
      .setScrollFactor(0)
      .setDepth(100);

    this.add
      .image(200, floorToY(BASEMENT_FLOOR) + HALLWAY_Y_OFFSET, 'car')
      .setOrigin(0.5, 1);

    this.setupInput();
    this.setupCamera();

    this.uiText = this.add
      .text(4, 4, '', {
        fontFamily: 'monospace',
        fontSize: '8px',
        color: '#ffffff',
      })
      .setScrollFactor(0)
      .setDepth(101);

    this.alarmText = this.add
      .text(GAME_WIDTH / 2, 14, '', {
        fontFamily: 'monospace',
        fontSize: '8px',
        color: '#ff4444',
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(101);

    this.alarm.onAlarm = () => {
      this.alarmText.setText('! ALARM !');
      this.audio.alarm();
    };

    this.scoreManager.onExtraLife = () => {
      this.p1Lives += 1;
      this.player.lives = this.p1Lives;
    };
    this.scoreManager2.onExtraLife = () => {
      this.p2Lives += 1;
      if (this.player2) this.player2.lives = this.p2Lives;
    };
  }

  private setupCamera(): void {
    const cam = this.cameras.main;
    cam.setBounds(0, 0, GAME_WIDTH, this.worldHeight);
    cam.startFollow(this.player, true, 0.1, 0.1, 0, 60);
  }

  private setupInput(): void {
    const kb = this.input.keyboard!;
    kb.addCapture([
      KEYS.P1.left, KEYS.P1.right, KEYS.P1.up, KEYS.P1.down,
      KEYS.P1.fire, KEYS.P1.jump,
    ]);
  }

  private getActivePlayer(): Player {
    return this.activePlayerIndex === 0 ? this.player : this.player2!;
  }

  private getActiveScore(): ScoreManager {
    return this.activePlayerIndex === 0 ? this.scoreManager : this.scoreManager2;
  }

  private drawBuilding(): void {
    const g = this.buildingGraphics;
    g.clear();

    for (const floor of FLOORS) {
      const y = floorToY(floor.number);
      const dark = floor.permanentlyDark || this.globalDark;
      const hallColor = dark ? COLORS.hallwayDark : COLORS.hallway;

      g.fillStyle(COLORS.background, 1);
      g.fillRect(0, y, GAME_WIDTH, FLOOR_HEIGHT);

      g.fillStyle(hallColor, 1);
      g.fillRect(0, y + HALLWAY_Y_OFFSET, GAME_WIDTH, 6);

      // Floor number label area
      g.fillStyle(0x333355, 1);
      g.fillRect(2, y + 1, 12, 8);
      // Draw floor number as simple bars (pixel font substitute)

      for (const door of floor.doors) {
        const dx = door.side === 'left' ? 14 : 234;
        const color =
          door.type === 'red'
            ? door.collected
              ? 0x662222
              : COLORS.doorRed
            : COLORS.doorBlue;
        g.fillStyle(color, 1);
        g.fillRect(dx, y + 2, 10, 10);
        // Door mat
        g.fillStyle(0x886644, 1);
        g.fillRect(dx, y + HALLWAY_Y_OFFSET + 4, 10, 2);
      }

      if (floor.escalatorLeft) {
        g.fillStyle(COLORS.escalator, 1);
        g.fillRect(4, y + 1, 8, FLOOR_HEIGHT - 2);
      }
      if (floor.escalatorRight) {
        g.fillStyle(COLORS.escalator, 1);
        g.fillRect(244, y + 1, 8, FLOOR_HEIGHT - 2);
      }
    }

    // Draw shaft columns
    for (const shaft of SHAFTS) {
      g.lineStyle(1, COLORS.elevatorCable, 0.5);
      const topY = floorToY(Math.max(...shaft.serviceFloors));
      const botY = floorToY(Math.min(...shaft.serviceFloors)) + FLOOR_HEIGHT;
      g.strokeRect(shaft.x - 12, topY, 24, botY - topY);
    }
  }

  private createElevators(): void {
    for (const shaft of SHAFTS) {
      const startFloor = shaft.serviceFloors[0]!;
      const car = new ElevatorCar(this, shaft, 0, startFloor);
      this.elevators.push(car);

      if (shaft.doubleLift) {
        const topCar = new ElevatorCar(this, shaft, 1, shaft.serviceFloors.at(-1)!);
        this.elevators.push(topCar);
      }
    }
  }

  private createLamps(): void {
    for (const floor of FLOORS) {
      if (!floor.hasLamps) continue;
      const y = floorToY(floor.number) + 1;
      for (const lx of [60, 128, 196]) {
        const lamp = this.add.rectangle(lx, y, 6, 4, COLORS.lamp);
        lamp.setData('floor', floor.number);
        lamp.setData('active', true);
        this.lamps.push(lamp);
      }
    }
  }

  private getCursors(): { left: boolean; right: boolean; up: boolean; down: boolean; fire: boolean; jump: boolean } {
    const kb = this.input.keyboard!;
    const keys = this.activePlayerIndex === 0 ? KEYS.P1 : KEYS.P2;
    return {
      left: kb.addKey(keys.left).isDown,
      right: kb.addKey(keys.right).isDown,
      up: kb.addKey(keys.up).isDown,
      down: kb.addKey(keys.down).isDown,
      fire: kb.addKey(keys.fire).isDown,
      jump: Phaser.Input.Keyboard.JustDown(kb.addKey(keys.jump)),
    };
  }

  update(_time: number, delta: number): void {
    if (this.gameOver || this.levelComplete) return;

    const player = this.getActivePlayer();
    const cursors = this.getCursors();
    const speedMult = this.alarm.getElevatorSpeedMultiplier();

    this.alarm.update(delta);

    // Update elevators
    for (const car of this.elevators) {
      car.updateCar(delta, speedMult);
    }

    // Player movement
    player.handleMovement(cursors, this.elevators);
    if (cursors.jump) {
      player.jump();
      this.audio.jump();
    }
    if (cursors.fire && Phaser.Input.Keyboard.JustDown(this.input.keyboard!.addKey(
      this.activePlayerIndex === 0 ? KEYS.P1.fire : KEYS.P2.fire,
    ))) {
      const bullet = player.shoot(this.bullets);
      if (bullet) this.audio.shoot();
    }

    player.updatePlayer(delta);

    // Red door interaction
    this.checkRedDoors(player);

    // Basement exit
    this.checkBasementExit(player);

    // Spawn enemies
    this.spawnTimer -= delta;
    if (this.spawnTimer <= 0) {
      this.spawnEnemy();
      this.spawnTimer = 3000 / this.alarm.getEnemyAggressionMultiplier();
    }

    // Update enemies
    const isDark = this.isFloorDark(player.currentFloor);
    for (const enemy of this.enemies) {
      enemy.aggression = this.alarm.getEnemyAggressionMultiplier();
      enemy.updateEnemy(delta, player.x, player.y, isDark, this.elevators, this.bullets);
    }

    // Update bullets
    this.bullets.getChildren().forEach((b) => {
      (b as Bullet).update();
    });

    // Collisions
    this.handleCombat(player, isDark);
    this.handleCrush(player);
    this.handleLampShots();

    // Darkness timer
    if (this.globalDark) {
      this.globalDarkTimer -= delta;
      if (this.globalDarkTimer <= 0) {
        this.globalDark = false;
        this.drawBuilding();
      }
      this.darknessOverlay.setAlpha(0.55);
    } else {
      const floorDark = getFloorDef(player.currentFloor)?.permanentlyDark;
      this.darknessOverlay.setAlpha(floorDark ? 0.45 : 0);
    }

    // Camera follow active player
    this.cameras.main.startFollow(player, true, 0.1, 0.1, 0, 60);

    this.updateUI();
  }

  private isFloorDark(floor: number): boolean {
    if (this.globalDark) return true;
    return getFloorDef(floor)?.permanentlyDark ?? false;
  }

  private checkRedDoors(player: Player): void {
    const floor = getFloorDef(player.currentFloor);
    if (!floor || player.state === 'in_door') return;

    for (const door of floor.doors) {
      if (door.type !== 'red' || door.collected) continue;
      const doorX = door.side === 'left' ? 19 : 239;
      if (Math.abs(player.x - doorX) < 8 && Math.abs(player.y - (floorToY(floor.number) + HALLWAY_Y_OFFSET)) < 4) {
        player.enterDoor(door.side);
        this.time.delayedCall(600, () => {
          door.collected = true;
          this.getActiveScore().collectDocument();
          this.audio.collect();
          player.exitDoor();
          this.drawBuilding();
        });
        break;
      }
    }
  }

  private checkBasementExit(player: Player): void {
    if (player.currentFloor !== BASEMENT_FLOOR) return;

    if (!allDocumentsCollected()) {
      const floor = highestUncollectedRedDoorFloor();
      if (floor) {
        player.y = floorToY(floor) + HALLWAY_Y_OFFSET;
        player.x = 128;
      }
      return;
    }

    const exitShaft = SHAFTS.find((s) => s.id === this.levelConfig.exitShaftId);
    if (exitShaft && Math.abs(player.x - exitShaft.x) < 16) {
      this.completeLevel();
    }
  }

  private completeLevel(): void {
    this.levelComplete = true;
    const bonus = this.getActiveScore().levelComplete(this.level);
    this.audio.levelComplete();

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 20, `LEVEL ${this.level} CLEAR!`, {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#ffff00',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(200);

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2, `BONUS ${bonus}`, {
        fontFamily: 'monospace',
        fontSize: '8px',
        color: '#ffffff',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(200);

  this.time.delayedCall(2500, () => {
      if (this.numPlayers === 2) {
        this.activePlayerIndex = this.activePlayerIndex === 0 ? 1 : 0;
      }
      this.scene.restart({
        players: this.numPlayers,
        level: this.level + 1,
        p1Lives: this.p1Lives,
        p2Lives: this.p2Lives,
        p1Score: this.scoreManager.score,
        p2Score: this.scoreManager2.score,
      });
    });
  }

  private spawnEnemy(): void {
    const player = this.getActivePlayer();
    const floors = [player.currentFloor, player.currentFloor + 1, player.currentFloor - 1].filter(
      (f) => f >= 1 && f <= TOTAL_FLOORS,
    );
    const floor = floors[Math.floor(Math.random() * floors.length)]!;
    const x = 40 + Math.random() * 176;
    const enemy = new Enemy(this, x, floor);
    this.enemies.push(enemy);
    if (this.enemies.length > 8) {
      const old = this.enemies.shift();
      old?.destroy();
    }
  }

  private handleCombat(player: Player, isDark: boolean): void {
    for (const enemy of this.enemies) {
      if (enemy.state === 'dead') continue;

      // Jump kick
      if (
        player.state === 'jump' &&
        Phaser.Math.Distance.Between(player.x, player.y, enemy.x, enemy.y) < 10
      ) {
        enemy.die();
        this.getActiveScore().jumpKickEnemy(isDark);
        this.audio.enemyHit();
        continue;
      }

      // Bullet hits
      this.bullets.getChildren().forEach((b) => {
        const bullet = b as Bullet;
        if (!bullet.active) return;

        if (bullet.ownerTag.startsWith('player') && enemy.isVulnerable) {
          if (Phaser.Math.Distance.Between(bullet.x, bullet.y, enemy.x, enemy.y) < 8) {
            if (enemy.isProne && bullet.y > enemy.y - 2) return;
            enemy.die();
            this.getActiveScore().shootEnemy(isDark);
            this.audio.enemyHit();
            bullet.destroy();
          }
        }

        if (bullet.ownerTag === 'enemy' && player.state !== 'in_door' && player.state !== 'dead') {
          if (Phaser.Math.Distance.Between(bullet.x, bullet.y, player.x, player.y) < 8) {
            if (player.crouching && bullet.y < player.y) return;
            this.killPlayer(player);
            bullet.destroy();
          }
        }
      });
    }
  }

  private handleCrush(player: Player): void {
    for (const car of this.elevators) {
      if (car.isCrushing(player.y, 12) && Math.abs(car.x - player.x) < 12) {
        if (player.state !== 'in_elevator' && player.state !== 'in_door') {
          this.killPlayer(player);
        }
      }

      for (const enemy of this.enemies) {
        if (enemy.state === 'dead') continue;
        if (car.isCrushing(enemy.y, 12) && Math.abs(car.x - enemy.x) < 12) {
          enemy.die();
          this.getActiveScore().crushKill();
        }
      }
    }
  }

  private handleLampShots(): void {
    this.bullets.getChildren().forEach((b) => {
      const bullet = b as Bullet;
      if (!bullet.active || !bullet.ownerTag.startsWith('player')) return;

      for (const lamp of this.lamps) {
        if (!lamp.getData('active')) continue;
        if (Phaser.Math.Distance.Between(bullet.x, bullet.y, lamp.x, lamp.y) < 6) {
          lamp.setData('active', false);
          lamp.setFillStyle(0x444433);
          bullet.destroy();
          this.globalDark = true;
          this.globalDarkTimer = 5000;
          this.drawBuilding();

          // Check lamp crush on enemies
          for (const enemy of this.enemies) {
            if (enemy.state === 'dead') continue;
            if (Math.abs(enemy.x - lamp.x) < 8 && enemy.floor === lamp.getData('floor')) {
              enemy.die();
              this.getActiveScore().lampKill();
            }
          }
        }
      }
    });
  }

  private killPlayer(player: Player): void {
    player.die();
    this.audio.death();
    const lives = player.playerIndex === 0 ? --this.p1Lives : --this.p2Lives;
    player.lives = Math.max(0, lives);

    if (lives <= 0) {
      if (this.numPlayers === 2 && player.playerIndex === 0 && this.p2Lives > 0) {
        this.activePlayerIndex = 1;
        this.player2!.respawn(30);
        this.cameras.main.startFollow(this.player2!);
        return;
      }
      if (this.numPlayers === 2 && player.playerIndex === 1 && this.p1Lives > 0) {
        this.activePlayerIndex = 0;
        this.player.respawn(30);
        return;
      }
      this.endGame();
      return;
    }

    this.time.delayedCall(1500, () => {
      player.respawn(30);
    });
  }

  private endGame(): void {
    this.gameOver = true;
    const hi = Math.max(this.scoreManager.score, this.scoreManager2.score);
    const stored = parseInt(localStorage.getItem('ea_highscore') ?? '0', 10);
    if (hi > stored) localStorage.setItem('ea_highscore', String(hi));

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'GAME OVER', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#ff4444',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(200);

    this.time.delayedCall(3000, () => {
      this.scene.start('Title');
    });
  }

  private updateUI(): void {
    const p = this.getActivePlayer();
    const score = this.getActiveScore().score;
    let text = `1UP ${String(score).padStart(6, '0')}  L${this.level}  F${p.currentFloor}`;
    text += `  LIVES ${p.lives}`;
    if (this.numPlayers === 2) {
      text += `  P${this.activePlayerIndex + 1}`;
    }
    const docs = FLOORS.flatMap((f) => f.doors).filter((d) => d.type === 'red' && !d.collected).length;
    text += `  DOCS ${docs}`;
    this.uiText.setText(text);
  }
}
