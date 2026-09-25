import { Rng } from '../core/rng';
import { generateBuilding, type Building, type Door, type Escalator, type Shaft } from './building';
import {
  BASEMENT,
  BODY_HALF,
  CAMERA_MAX,
  CAMERA_MIN,
  CAR_WAIT,
  CROUCH_H,
  ENEMY_SHAFT_STOP,
  ESC_FRAMES,
  EXTRA_LIFE_EVERY,
  EXTRA_LIFE_FIRST,
  FLOOR_H,
  GETAWAY_X,
  GRAVITY,
  HIGH_SHOT,
  JUMP_V,
  LOW_SHOT,
  MAX_PLAYER_BULLETS,
  PLAYER_BULLET_SPEED,
  PLAYER_SHAFT_STOP,
  ROOF,
  SAFE_FALL,
  SCORE,
  SHAFT_HALF,
  STAND_H,
  VIEW_H,
  WALK_SPEED,
  WALL_L,
  WALL_R,
  ceilingY,
  floorY,
  roomFloor,
} from './constants';
import { carFloor, carRoofFloor, createCar, isStoppedAt, updateCar, type Car } from './elevator';

export interface Input {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  /** Edge-triggered: true only on the frame the button went down. */
  fire: boolean;
  jump: boolean;
}

export const NO_INPUT: Input = {
  left: false,
  right: false,
  up: false,
  down: false,
  fire: false,
  jump: false,
};

export type Facing = -1 | 1;
export type PlayerMode = 'zip' | 'walk' | 'car' | 'roof' | 'esc' | 'door' | 'fall' | 'dead' | 'drive';
export type DeathKind = 'shot' | 'kick' | 'lamp' | 'crush' | 'fall';

export interface Player {
  x: number;
  /** World y of the feet. */
  y: number;
  floor: number;
  facing: Facing;
  mode: PlayerMode;
  crouch: boolean;
  jumpY: number;
  vy: number;
  jumpDx: number;
  moving: boolean;
  walkT: number;
  shootT: number;
  car: Car | null;
  esc: Escalator | null;
  escDown: boolean;
  door: Door | null;
  /** Set on boarding a car so a held direction does not carry you straight out the other side. */
  boardLock: boolean;
  /** The shaft being fallen down, and the height the fall started from. */
  fallShaft: Shaft | null;
  fallFromY: number;
  /** Frames spent in the current mode. */
  t: number;
  invuln: number;
  hidden: boolean;
  deathKind: DeathKind | null;
}

export interface Enemy {
  id: number;
  x: number;
  y: number;
  floor: number;
  facing: Facing;
  state: 'emerge' | 'active' | 'dead';
  t: number;
  jumpY: number;
  vy: number;
  crouchT: number;
  aimT: number;
  aimLow: boolean;
  cooldown: number;
  speed: number;
  keepDist: number;
  wanderDir: -1 | 0 | 1;
  wanderT: number;
  moving: boolean;
  walkT: number;
  door: Door | null;
  deathKind: DeathKind | null;
  seenBullets: Set<number>;
}

export interface Bullet {
  id: number;
  x: number;
  y: number;
  vx: number;
  owner: 'player' | 'enemy';
}

export interface Popup {
  x: number;
  y: number;
  text: string;
  t: number;
}

export type WorldEvent =
  | 'shoot'
  | 'enemyShoot'
  | 'enemyDie'
  | 'playerDie'
  | 'doc'
  | 'allDocs'
  | 'door'
  | 'jump'
  | 'lamp'
  | 'crush'
  | 'alarm'
  | 'ding'
  | 'clear'
  | 'extraLife'
  | 'warp'
  | 'start'
  | 'gameOver';

export type Status = 'intro' | 'play' | 'dying' | 'warp' | 'escape' | 'bonus' | 'gameover';

export interface Difficulty {
  enemySpeed: number;
  fireCooldown: number;
  bulletSpeed: number;
  maxEnemies: number;
  spawnInterval: number;
  alarmFrames: number;
  dodge: number;
}

export function difficulty(level: number): Difficulty {
  return {
    enemySpeed: Math.min(0.55 + level * 0.07, 1.1),
    fireCooldown: Math.max(120 - level * 10, 45),
    bulletSpeed: Math.min(2 + level * 0.15, 3.2),
    maxEnemies: Math.min(2 + Math.floor(level / 2), 5),
    spawnInterval: Math.max(170 - level * 12, 70),
    alarmFrames: 60 * Math.max(100 - level * 5, 50),
    dodge: Math.min(0.15 + level * 0.05, 0.5),
  };
}

export interface WorldOptions {
  seed?: number;
  level?: number;
  lives?: number;
  hiScore?: number;
}

const ZIP_FRAMES = 80;
const DOOR_FRAMES = 84;

export class World {
  readonly seed: number;
  rng: Rng;
  level = 1;
  score = 0;
  hiScore: number;
  lives: number;
  nextExtra = EXTRA_LIFE_FIRST;

  b!: Building;
  cars: Car[] = [];
  player!: Player;
  enemies: Enemy[] = [];
  bullets: Bullet[] = [];
  popups: Popup[] = [];
  events: WorldEvent[] = [];
  diff!: Difficulty;

  status: Status = 'intro';
  statusT = 0;
  frame = 0;
  levelFrames = 0;
  alarm = false;
  blackout = 0;
  spawnT = 0;
  cameraY = CAMERA_MIN;
  getawayX = GETAWAY_X;
  bonus = 0;
  message: { text: string; t: number } | null = null;

  private nextId = 1;
  private ctl: Input = NO_INPUT;

  constructor(opts: WorldOptions = {}) {
    this.seed = opts.seed ?? (Math.random() * 2 ** 32) >>> 0;
    this.rng = new Rng(this.seed);
    this.lives = opts.lives ?? 3;
    this.hiScore = opts.hiScore ?? 10000;
    this.startLevel(opts.level ?? 1);
  }

  get docsLeft(): number {
    return this.b.doors.filter((d) => d.red && !d.taken).length;
  }

  get docsTotal(): number {
    return this.b.doors.filter((d) => d.red).length;
  }

  startLevel(level: number): void {
    this.level = level;
    this.diff = difficulty(level);
    const levelSeed = (this.seed + level * 7919) >>> 0;
    this.rng = new Rng(levelSeed ^ 0x9e3779b9);
    this.b = generateBuilding(level, levelSeed);
    this.cars = this.b.shafts.map((s) => createCar(s, this.rng));
    this.enemies = [];
    this.bullets = [];
    this.popups = [];
    this.status = 'intro';
    this.statusT = 0;
    this.levelFrames = 0;
    this.alarm = false;
    this.blackout = 0;
    this.spawnT = 120;
    this.getawayX = GETAWAY_X;
    this.message = { text: `LEVEL ${level}`, t: 120 };
    this.player = {
      x: -10,
      y: floorY(ROOF) - 70,
      floor: ROOF,
      facing: 1,
      mode: 'zip',
      crouch: false,
      jumpY: 0,
      vy: 0,
      jumpDx: 0,
      moving: false,
      walkT: 0,
      shootT: 0,
      car: null,
      esc: null,
      escDown: false,
      door: null,
      boardLock: false,
      fallShaft: null,
      fallFromY: 0,
      t: 0,
      invuln: 0,
      hidden: false,
      deathKind: null,
    };
    this.cameraY = CAMERA_MIN;
    this.events.push('start');
  }

  step(input: Input): void {
    this.events = [];
    this.frame++;
    this.ctl = input;
    if (this.message && --this.message.t <= 0) this.message = null;

    switch (this.status) {
      case 'intro':
        this.updateZip();
        break;
      case 'play':
        this.levelFrames++;
        if (!this.alarm && this.levelFrames >= this.diff.alarmFrames) {
          this.alarm = true;
          this.events.push('alarm');
          this.message = { text: 'ALARM!', t: 120 };
        }
        this.updatePlayer(input);
        this.spawnEnemies();
        break;
      case 'dying':
        this.player.t++;
        if (--this.statusT <= 0) this.afterDeath();
        break;
      case 'warp':
        if (--this.statusT === 60) this.warpToMissedDoor();
        if (this.statusT <= 0) this.status = 'play';
        break;
      case 'escape':
        // Engine revs for half a second, then the car pulls out of the garage.
        if (this.statusT < 120) this.getawayX += Math.min(3, (120 - this.statusT) * 0.03);
        if (--this.statusT <= 0) {
          this.status = 'bonus';
          this.statusT = 150;
          this.bonus = 1000 * this.level;
        }
        break;
      case 'bonus':
        if (this.statusT === 110) this.addScore(this.bonus);
        if (--this.statusT <= 0) this.startLevel(this.level + 1);
        break;
      case 'gameover':
        this.statusT--;
        break;
    }

    if (this.status !== 'bonus' && this.status !== 'gameover') {
      this.updateCars();
      this.syncRider();
      this.updateEnemies();
      this.updateBullets();
      this.updateLamps();
      this.updateDoors();
    }
    if (this.blackout > 0) this.blackout--;
    for (const p of this.popups) {
      p.t--;
      p.y -= 0.3;
    }
    this.popups = this.popups.filter((p) => p.t > 0);
    this.updateCamera(false);
  }

  // ---------------------------------------------------------------- player

  private updateZip(): void {
    const p = this.player;
    p.t++;
    if (p.t <= ZIP_FRAMES) {
      p.x = -10 + p.t * 0.6;
      p.y = floorY(ROOF) - 70 + p.t * 0.5;
    } else {
      p.vy += GRAVITY;
      p.y += p.vy;
      if (p.y >= floorY(ROOF)) {
        p.y = floorY(ROOF);
        p.vy = 0;
        p.mode = 'walk';
        p.floor = ROOF;
        p.t = 0;
        this.status = 'play';
      }
    }
  }

  private updatePlayer(input: Input): void {
    const p = this.player;
    p.t++;
    if (p.shootT > 0) p.shootT--;
    if (p.invuln > 0) p.invuln--;
    p.moving = false;

    switch (p.mode) {
      case 'walk':
        this.updateWalk(input);
        break;
      case 'car':
        this.updateInCar(input);
        break;
      case 'roof':
        this.updateOnRoof(input);
        break;
      case 'esc':
        this.updateEscalator();
        break;
      case 'door':
        this.updateDoor();
        break;
      case 'fall':
        this.updateFall();
        break;
      default:
        break;
    }
    if (p.mode === 'walk') {
      p.y = floorY(p.floor) - p.jumpY;
      this.checkGoal();
    }
  }

  private updateWalk(input: Input): void {
    const p = this.player;
    const airborne = p.jumpY > 0 || p.vy > 0;

    if (airborne) {
      p.jumpY += p.vy;
      p.vy -= GRAVITY;
      if (p.jumpDx) this.movePlayer(p.jumpDx);
      if (p.jumpY <= 0) {
        p.jumpY = 0;
        p.vy = 0;
        p.jumpDx = 0;
      } else if (p.jumpY > 4) {
        this.checkJumpKick();
      }
      if (input.fire) this.firePlayer();
      return;
    }

    // Escalators take priority over crouching / doors.
    for (const e of this.b.escalators) {
      if (input.down && e.top === p.floor && Math.abs(p.x - e.topX) <= 3) {
        this.startEscalator(e, true);
        return;
      }
      if (input.up && e.top - 1 === p.floor && Math.abs(p.x - e.bottomX) <= 3) {
        this.startEscalator(e, false);
        return;
      }
    }

    if (input.up) {
      const door = this.b.doors.find(
        (d) => d.floor === p.floor && d.red && !d.taken && Math.abs(d.x - p.x) < 6,
      );
      if (door) {
        p.mode = 'door';
        p.door = door;
        p.t = 0;
        p.x = door.x;
        p.crouch = false;
        this.events.push('door');
        return;
      }
    }

    p.crouch = input.down;
    const dx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    if (dx) p.facing = dx as Facing;

    if (input.jump && !p.crouch) {
      p.vy = JUMP_V;
      p.jumpY = 0.01;
      p.jumpDx = dx * WALK_SPEED;
      this.events.push('jump');
    } else if (dx && !p.crouch) {
      this.movePlayer(dx * WALK_SPEED);
      if (p.mode !== 'walk') return;
      p.moving = true;
      p.walkT++;
    }
    if (input.fire) this.firePlayer();
  }

  /**
   * Walk along the current floor. At a shaft the player steps into a waiting car or onto its roof,
   * is stopped by a car passing through, or otherwise falls down the empty shaft. The bottom floor
   * of a shaft is solid, so there you just walk in.
   */
  private movePlayer(dx: number): void {
    const p = this.player;
    let nx = Math.max(WALL_L + 6, Math.min(WALL_R - 6, p.x + dx));
    const airborne = p.jumpY > 0;
    for (const s of this.b.shafts) {
      if (p.floor < s.min || p.floor > s.max) continue;
      const d0 = p.x - s.x;
      const d1 = nx - s.x;
      if (Math.abs(d1) >= PLAYER_SHAFT_STOP || Math.abs(d1) >= Math.abs(d0)) continue;
      const car = this.cars[s.id];
      if (!airborne && isStoppedAt(car, p.floor)) {
        this.boardCar(car);
        return;
      }
      if (!airborne && carRoofFloor(car) === p.floor) {
        p.mode = 'roof';
        p.car = car;
        p.crouch = false;
        p.x = s.x + Math.sign(d0) * (SHAFT_HALF - 1);
        return;
      }
      const carInRoom = car.y > floorY(p.floor) - FLOOR_H && car.y - FLOOR_H < floorY(p.floor);
      if (!airborne && !carInRoom) {
        if (p.floor === s.min) continue;
        this.startFall(s, d0);
        return;
      }
      nx = s.x + Math.sign(d0 || -dx) * PLAYER_SHAFT_STOP;
    }
    p.x = nx;
  }

  private startFall(s: Shaft, side: number): void {
    const p = this.player;
    p.mode = 'fall';
    p.fallShaft = s;
    p.fallFromY = p.y;
    p.x = s.x + Math.sign(side) * (SHAFT_HALF - BODY_HALF);
    p.vy = 0;
    p.crouch = false;
    p.car = null;
  }

  /** Drop down the shaft until landing on the roof of the car below or on the shaft floor. */
  private updateFall(): void {
    const p = this.player;
    const s = p.fallShaft!;
    const car = this.cars[s.id];
    const prev = p.y;
    p.vy = Math.min(p.vy + GRAVITY, 4);
    p.y += p.vy;
    const roof = car.y - FLOOR_H;
    // The small margin catches a car rising to meet the player between frames.
    if (prev <= roof + 2 && p.y >= roof) {
      p.y = roof;
      p.mode = 'roof';
      p.car = car;
      this.landFall();
      return;
    }
    const bottom = floorY(s.min);
    if (p.y >= bottom) {
      p.y = bottom;
      p.mode = 'walk';
      p.floor = s.min;
      this.landFall();
      return;
    }
    p.floor = roomFloor(p.y);
  }

  private landFall(): void {
    const p = this.player;
    p.vy = 0;
    p.fallShaft = null;
    if (p.y - p.fallFromY > SAFE_FALL) this.killPlayer('fall');
  }

  private boardCar(car: Car): void {
    const p = this.player;
    p.mode = 'car';
    p.car = car;
    p.x = car.x;
    p.crouch = false;
    p.boardLock = true;
    car.driven = true;
    car.wait = CAR_WAIT;
  }

  private updateInCar(input: Input): void {
    const p = this.player;
    const car = p.car!;
    p.x = car.x;
    const f = car.state === 'wait' ? carFloor(car) : null;
    p.crouch = f !== null && f === car.shaft.min && input.down;
    if (!input.left && !input.right) p.boardLock = false;
    if (f !== null && !p.boardLock && (input.left || input.right) && !input.up && !input.down) {
      const dir: Facing = input.right ? 1 : -1;
      p.mode = 'walk';
      p.floor = f;
      p.facing = dir;
      p.x = car.x + dir * (PLAYER_SHAFT_STOP + 1);
      p.car = null;
      car.driven = false;
      car.wait = CAR_WAIT;
      return;
    }
    if (input.left) p.facing = -1;
    if (input.right) p.facing = 1;
    if (input.fire) this.firePlayer();
  }

  private updateOnRoof(input: Input): void {
    const p = this.player;
    const car = p.car!;
    const s = car.shaft;
    p.crouch = input.down;
    const dx = p.crouch ? 0 : (input.right ? 1 : 0) - (input.left ? 1 : 0);
    if (dx) {
      p.facing = dx as Facing;
      const nx = p.x + dx;
      const rf = carRoofFloor(car);
      if (Math.abs(nx - s.x) > SHAFT_HALF - 1) {
        if (rf !== null && car.state === 'wait') {
          p.mode = 'walk';
          p.floor = rf;
          p.car = null;
          p.x = s.x + dx * PLAYER_SHAFT_STOP;
          return;
        }
      } else {
        p.x = nx;
        p.moving = true;
        p.walkT++;
      }
    }
    if (input.fire) this.firePlayer();
  }

  private startEscalator(e: Escalator, down: boolean): void {
    const p = this.player;
    p.mode = 'esc';
    p.esc = e;
    p.escDown = down;
    p.t = 0;
    p.crouch = false;
    const toX = down ? e.bottomX : e.topX;
    const fromX = down ? e.topX : e.bottomX;
    p.facing = toX > fromX ? 1 : -1;
  }

  private updateEscalator(): void {
    const p = this.player;
    const e = p.esc!;
    const k = Math.min(1, p.t / ESC_FRAMES);
    p.moving = true;
    p.walkT++;
    if (p.escDown) {
      p.x = e.topX + (e.bottomX - e.topX) * k;
      p.y = floorY(e.top) + FLOOR_H * k;
    } else {
      p.x = e.bottomX + (e.topX - e.bottomX) * k;
      p.y = floorY(e.top - 1) - FLOOR_H * k;
    }
    p.floor = roomFloor(p.y);
    if (p.t >= ESC_FRAMES) {
      p.mode = 'walk';
      p.floor = p.escDown ? e.top - 1 : e.top;
      p.x = Math.round(p.x + p.facing * 4);
      p.esc = null;
    }
  }

  private updateDoor(): void {
    const p = this.player;
    const door = p.door!;
    door.open = Math.max(door.open, 6);
    if (p.t === 16) p.hidden = true;
    if (p.t === 50 && door.red && !door.taken) {
      door.taken = true;
      this.addScore(SCORE.document, door.x, floorY(door.floor) - DOOR_POPUP_Y);
      this.events.push('doc');
      if (this.docsLeft === 0) {
        this.events.push('allDocs');
        this.message = { text: 'GO TO THE BASEMENT!', t: 150 };
      }
    }
    if (p.t === 68) p.hidden = false;
    if (p.t >= DOOR_FRAMES) {
      p.mode = 'walk';
      p.door = null;
    }
  }

  private firePlayer(): void {
    const p = this.player;
    if (this.bullets.filter((b) => b.owner === 'player').length >= MAX_PLAYER_BULLETS) return;
    p.shootT = 10;
    this.bullets.push({
      id: this.nextId++,
      x: p.x + p.facing * 8,
      y: p.y - (p.crouch ? LOW_SHOT : HIGH_SHOT),
      vx: p.facing * PLAYER_BULLET_SPEED,
      owner: 'player',
    });
    this.events.push('shoot');
  }

  private checkJumpKick(): void {
    const p = this.player;
    for (const e of this.enemies) {
      if (e.state !== 'active' || e.floor !== p.floor || e.jumpY > 4) continue;
      if (Math.abs(e.x - p.x) < 11) this.killEnemy(e, 'kick');
    }
  }

  /** Keep the player glued to the car they are riding in or on. */
  private syncRider(): void {
    const p = this.player;
    if (!p.car || (p.mode !== 'car' && p.mode !== 'roof')) return;
    const car = p.car;
    if (p.mode === 'car') {
      p.x = car.x;
      p.y = car.y;
    } else {
      p.y = car.y - FLOOR_H;
      // Riding the roof into the top of the shaft is fatal.
      const height = p.crouch ? CROUCH_H : STAND_H;
      if (p.y - height < floorY(car.shaft.max) - FLOOR_H + 2 && this.status === 'play') {
        this.killPlayer('crush');
      }
    }
    p.floor = roomFloor(p.y);
  }

  private checkGoal(): void {
    const p = this.player;
    if (p.floor !== BASEMENT || this.status !== 'play') return;
    if (this.docsLeft > 0) {
      this.status = 'warp';
      this.statusT = 120;
      this.message = { text: 'COLLECT ALL SECRET DOCUMENTS!', t: 120 };
      this.events.push('warp');
    } else if (Math.abs(p.x - GETAWAY_X) < 14) {
      this.status = 'escape';
      this.statusT = 150;
      p.mode = 'drive';
      p.hidden = true;
      this.enemies = [];
      this.bullets = [];
      this.events.push('clear');
    }
  }

  private warpToMissedDoor(): void {
    const missed = this.b.doors
      .filter((d) => d.red && !d.taken)
      .sort((a, b) => b.floor - a.floor)[0];
    if (!missed) return;
    const p = this.player;
    p.mode = 'walk';
    p.floor = missed.floor;
    p.x = missed.x + (missed.x < 128 ? 14 : -14);
    p.facing = missed.x < p.x ? -1 : 1;
    p.jumpY = 0;
    p.vy = 0;
    p.crouch = false;
    p.car = null;
    p.y = floorY(p.floor);
    p.invuln = 90;
    this.enemies = [];
    this.bullets = [];
    this.updateCamera(true);
  }

  killPlayer(kind: DeathKind): void {
    const p = this.player;
    if (this.status !== 'play') return;
    p.deathKind = kind;
    p.mode = 'dead';
    p.t = 0;
    p.hidden = false;
    p.jumpY = 0;
    p.crouch = false;
    if (p.car) {
      p.car.driven = false;
      p.car.wait = CAR_WAIT;
    }
    this.status = 'dying';
    this.statusT = 150;
    this.events.push('playerDie');
  }

  private afterDeath(): void {
    this.lives--;
    if (this.lives <= 0) {
      this.status = 'gameover';
      this.statusT = 300;
      this.events.push('gameOver');
      return;
    }
    const p = this.player;
    const floor = Math.max(BASEMENT, Math.min(ROOF, roomFloor(p.y)));
    p.mode = 'walk';
    p.floor = floor;
    p.x = floor === ROOF ? 40 : 30;
    p.y = floorY(floor);
    p.car = null;
    p.esc = null;
    p.door = null;
    p.deathKind = null;
    p.jumpY = 0;
    p.vy = 0;
    p.facing = 1;
    p.invuln = 120;
    this.enemies = [];
    this.bullets = [];
    this.status = 'play';
    this.spawnT = 120;
    this.updateCamera(true);
  }

  private playerVulnerable(): boolean {
    const p = this.player;
    if (this.status !== 'play' || p.hidden || p.invuln > 0) return false;
    return (
      p.mode === 'walk' || p.mode === 'car' || p.mode === 'roof' || p.mode === 'esc' || p.mode === 'fall'
    );
  }

  private playerVisible(): boolean {
    const p = this.player;
    if (this.status !== 'play' || p.hidden) return false;
    return (
      p.mode === 'walk' || p.mode === 'car' || p.mode === 'roof' || p.mode === 'esc' || p.mode === 'fall'
    );
  }

  // ---------------------------------------------------------------- scoring

  addScore(points: number, x?: number, y?: number): void {
    this.score += points;
    if (this.score > this.hiScore) this.hiScore = this.score;
    while (this.score >= this.nextExtra) {
      this.lives++;
      this.nextExtra += EXTRA_LIFE_EVERY;
      this.events.push('extraLife');
    }
    if (x !== undefined && y !== undefined) {
      this.popups.push({ x, y, text: String(points), t: 50 });
    }
  }

  // ---------------------------------------------------------------- cars

  private updateCars(): void {
    const p = this.player;
    for (const car of this.cars) {
      const driving = car.driven && p.mode === 'car' && p.car === car && this.status === 'play';
      if (car.driven && !driving) car.driven = false;
      const before = car.y;
      const stopped = updateCar(car, driving ? { up: this.ctl.up, down: this.ctl.down } : null);
      if (stopped && driving) this.events.push('ding');
      if (car.y > before) this.checkCrush(car);
    }
  }

  /** A descending car squashes anyone standing in the mouth of its shaft. */
  private checkCrush(car: Car): void {
    const hits = (x: number, feet: number) => {
      const overlap = SHAFT_HALF + BODY_HALF - Math.abs(x - car.x);
      return overlap >= 3 && car.y > feet - STAND_H + 4 && car.y - FLOOR_H < feet;
    };
    for (const e of this.enemies) {
      if (e.state === 'active' && hits(e.x, e.y)) this.killEnemy(e, 'crush');
    }
    const p = this.player;
    if ((p.mode === 'walk' || p.mode === 'fall') && this.playerVulnerable() && hits(p.x, p.y)) {
      this.killPlayer('crush');
    }
  }

  // ---------------------------------------------------------------- enemies

  private spawnEnemies(): void {
    if (--this.spawnT > 0) return;
    const d = this.diff;
    this.spawnT = Math.round(d.spawnInterval * this.rng.range(0.7, 1.3) * (this.alarm ? 0.55 : 1));
    const alive = this.enemies.filter((e) => e.state !== 'dead').length;
    if (alive >= d.maxEnemies) return;
    const p = this.player;
    if (p.mode === 'door') return;
    const pf = p.floor;
    const candidates = this.b.doors.filter(
      (door) =>
        !door.red &&
        door.open === 0 &&
        Math.abs(door.floor - pf) <= 1 &&
        (door.floor !== pf || Math.abs(door.x - p.x) > 40) &&
        this.onScreen(floorY(door.floor)),
    );
    if (candidates.length === 0) return;
    // Favour the player's floor.
    const same = candidates.filter((c) => c.floor === pf);
    const door = same.length && this.rng.chance(0.65) ? this.rng.pick(same) : this.rng.pick(candidates);
    door.open = 30;
    this.addEnemy(door.floor, door.x, door);
    this.events.push('door');
  }

  /** Puts an enemy on a floor; with a door it first steps out of it. */
  addEnemy(floor: number, x: number, door: Door | null = null): Enemy {
    const d = this.diff;
    const e: Enemy = {
      id: this.nextId++,
      x,
      y: floorY(floor),
      floor,
      facing: this.player.x < x ? -1 : 1,
      state: door ? 'emerge' : 'active',
      t: 0,
      jumpY: 0,
      vy: 0,
      crouchT: 0,
      aimT: 0,
      aimLow: false,
      cooldown: this.rng.int(50, 100),
      speed: d.enemySpeed * this.rng.range(0.8, 1.2) * (this.alarm ? 1.3 : 1),
      keepDist: this.rng.int(36, 100),
      wanderDir: 0,
      wanderT: 0,
      moving: false,
      walkT: 0,
      door,
      deathKind: null,
      seenBullets: new Set(),
    };
    this.enemies.push(e);
    return e;
  }

  private onScreen(y: number): boolean {
    return y > this.cameraY + 8 && y - STAND_H < this.cameraY + VIEW_H;
  }

  private updateEnemies(): void {
    const p = this.player;
    const visible = this.playerVisible();
    for (const e of this.enemies) {
      e.t++;
      e.moving = false;
      if (e.state === 'emerge') {
        if (e.door) e.door.open = Math.max(e.door.open, 4);
        if (e.t >= 24) {
          e.state = 'active';
          e.t = 0;
        }
        continue;
      }
      if (e.state === 'dead') continue;

      if (e.jumpY > 0) {
        e.jumpY += e.vy;
        e.vy -= GRAVITY;
        if (e.jumpY <= 0) {
          e.jumpY = 0;
          e.vy = 0;
        }
      }
      if (e.crouchT > 0) e.crouchT--;
      if (e.cooldown > 0) e.cooldown--;

      const sameFloor = visible && p.floor === e.floor;
      if (sameFloor) {
        e.facing = p.x < e.x ? -1 : 1;
        const dist = Math.abs(p.x - e.x);
        this.tryDodge(e);
        if (e.aimT > 0) {
          if (--e.aimT === 0) this.fireEnemy(e);
        } else if (
          e.cooldown === 0 &&
          e.jumpY === 0 &&
          dist < 230 &&
          (this.blackout === 0 || this.rng.chance(0.02))
        ) {
          e.aimT = 14;
          e.aimLow = p.crouch || this.rng.chance(0.35);
          if (e.aimLow) e.crouchT = Math.max(e.crouchT, 26);
        } else if (dist > e.keepDist && e.crouchT === 0 && e.jumpY === 0) {
          this.moveEnemy(e, e.facing * e.speed);
        }
      } else {
        if (--e.wanderT <= 0) {
          e.wanderDir = this.rng.pick([-1, 0, 1, 1, -1] as const);
          e.wanderT = this.rng.int(40, 120);
        }
        if (e.wanderDir) {
          e.facing = e.wanderDir;
          this.moveEnemy(e, e.wanderDir * e.speed * 0.6);
        }
        // Slip back into a blue door now and then.
        const door = this.b.doors.find(
          (dd) => dd.floor === e.floor && !dd.red && dd.open === 0 && Math.abs(dd.x - e.x) < 1,
        );
        if (door && this.rng.chance(0.3)) {
          door.open = 20;
          e.state = 'dead';
          e.deathKind = null;
          e.t = 999;
        }
      }
      e.y = floorY(e.floor) - e.jumpY;
    }
    // Remove finished corpses and enemies far from the action.
    this.enemies = this.enemies.filter((e) => {
      if (e.state === 'dead') return e.t < 70;
      return Math.abs(e.floor - p.floor) <= 2 || !this.playerVisible();
    });
  }

  private tryDodge(e: Enemy): void {
    if (e.jumpY > 0 || e.aimT > 0) return;
    for (const b of this.bullets) {
      if (b.owner !== 'player' || e.seenBullets.has(b.id)) continue;
      if (roomFloor(b.y) !== e.floor) continue;
      const ahead = Math.sign(e.x - b.x) === Math.sign(b.vx);
      if (!ahead || Math.abs(e.x - b.x) > 44) continue;
      e.seenBullets.add(b.id);
      if (!this.rng.chance(this.diff.dodge)) continue;
      const low = floorY(e.floor) - b.y < CROUCH_H;
      if (low) {
        e.vy = JUMP_V;
        e.jumpY = 0.01;
      } else {
        e.crouchT = Math.max(e.crouchT, 26);
      }
    }
  }

  private fireEnemy(e: Enemy): void {
    const low = e.aimLow;
    this.bullets.push({
      id: this.nextId++,
      x: e.x + e.facing * 8,
      y: floorY(e.floor) - e.jumpY - (low ? LOW_SHOT : HIGH_SHOT),
      vx: e.facing * this.diff.bulletSpeed,
      owner: 'enemy',
    });
    e.cooldown = Math.round(this.diff.fireCooldown * this.rng.range(0.7, 1.3) * (this.alarm ? 0.6 : 1));
    this.events.push('enemyShoot');
  }

  private moveEnemy(e: Enemy, dx: number): void {
    let nx = Math.max(WALL_L + 6, Math.min(WALL_R - 6, e.x + dx));
    let blocked = nx !== e.x + dx;
    for (const s of this.b.shafts) {
      if (e.floor < s.min || e.floor > s.max) continue;
      const d0 = e.x - s.x;
      const d1 = nx - s.x;
      if (Math.abs(d1) < ENEMY_SHAFT_STOP && Math.abs(d1) < Math.abs(d0)) {
        nx = s.x + Math.sign(d0) * ENEMY_SHAFT_STOP;
        blocked = true;
      }
    }
    if (nx !== e.x) {
      e.moving = true;
      e.walkT++;
    }
    e.x = nx;
    if (blocked) e.wanderDir = (e.wanderDir ? -e.wanderDir : 0) as -1 | 0 | 1;
  }

  killEnemy(e: Enemy, kind: DeathKind): void {
    if (e.state === 'dead') return;
    e.state = 'dead';
    e.deathKind = kind;
    e.t = 0;
    e.aimT = 0;
    const points =
      kind === 'kick' ? SCORE.kick : kind === 'lamp' ? SCORE.lamp : kind === 'crush' ? SCORE.crush : SCORE.shot;
    this.addScore(points, e.x, e.y - 28);
    this.events.push(kind === 'crush' ? 'crush' : 'enemyDie');
  }

  // ---------------------------------------------------------------- bullets, lamps, doors

  private updateBullets(): void {
    const p = this.player;
    const keep: Bullet[] = [];
    for (const b of this.bullets) {
      b.x += b.vx;
      if (b.x < WALL_L || b.x > WALL_R) continue;
      let hit = false;
      if (b.owner === 'player') {
        const f = roomFloor(b.y);
        for (const lamp of this.b.lamps) {
          if (lamp.state !== 'hang' || lamp.floor !== f || Math.abs(lamp.x - b.x) > 4) continue;
          const top = ceilingY(f) - 2;
          if (b.y >= top && b.y <= top + 12) {
            lamp.state = 'fall';
            lamp.vy = 0;
            this.blackout = 100;
            this.addScore(SCORE.lampHit);
            this.events.push('lamp');
            hit = true;
            break;
          }
        }
        if (!hit) {
          for (const e of this.enemies) {
            if (e.state !== 'active') continue;
            if (inBox(b.x, b.y, e.x, e.y, e.crouchT > 0 || (e.aimLow && e.aimT > 0) ? CROUCH_H : STAND_H)) {
              this.killEnemy(e, 'shot');
              hit = true;
              break;
            }
          }
        }
      } else if (this.playerVulnerable() && inBox(b.x, b.y, p.x, p.y, p.crouch ? CROUCH_H : STAND_H)) {
        this.killPlayer('shot');
        hit = true;
      }
      if (!hit) keep.push(b);
    }
    this.bullets = keep;
  }

  private updateLamps(): void {
    for (const lamp of this.b.lamps) {
      if (lamp.state !== 'fall') continue;
      lamp.vy += 0.3;
      lamp.drop += lamp.vy;
      const y = ceilingY(lamp.floor) + 8 + lamp.drop;
      for (const e of this.enemies) {
        if (e.state !== 'active' || e.floor !== lamp.floor) continue;
        if (Math.abs(e.x - lamp.x) < 9 && y >= e.y - STAND_H) this.killEnemy(e, 'lamp');
      }
      if (y >= floorY(lamp.floor)) {
        lamp.state = 'broken';
        lamp.drop = floorY(lamp.floor) - ceilingY(lamp.floor) - 8;
      }
    }
  }

  private updateDoors(): void {
    for (const d of this.b.doors) if (d.open > 0) d.open--;
  }

  // ---------------------------------------------------------------- camera

  updateCamera(snap: boolean): void {
    const p = this.player;
    let target = p.y - 124;
    if (this.status === 'escape' || this.status === 'bonus') target = floorY(BASEMENT) - 124;
    target = Math.max(CAMERA_MIN, Math.min(CAMERA_MAX, target));
    if (snap) this.cameraY = target;
    else this.cameraY += (target - this.cameraY) * 0.18;
    if (Math.abs(target - this.cameraY) < 0.5) this.cameraY = target;
  }
}

const DOOR_POPUP_Y = 36;

export function inBox(px: number, py: number, x: number, feet: number, h: number): boolean {
  return px >= x - BODY_HALF && px <= x + BODY_HALF && py >= feet - h && py <= feet;
}
