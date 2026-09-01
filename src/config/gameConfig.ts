export const GAME_WIDTH = 256;
export const GAME_HEIGHT = 224;
export const SCALE = 3;

export const FLOOR_HEIGHT = 22;
export const HALLWAY_Y_OFFSET = 14;
export const TOTAL_FLOORS = 30;
export const BASEMENT_FLOOR = 0;

export const PLAYER_SPEED = 60;
export const PLAYER_JUMP_VELOCITY = -180;
export const GRAVITY = 500;
export const BULLET_SPEED = 140;
export const MAX_BULLETS = 3;

export const ENEMY_SPEED = 35;
export const ENEMY_SHOOT_INTERVAL = 1800;
export const ENEMY_SPAWN_INTERVAL = 3500;

export const ELEVATOR_SPEED = 45;
export const ALARM_ELEVATOR_LAG = 0.4;
export const ALARM_TIME_MS = 90000;

export const RED_DOOR_SHELTER_MS = 5000;
export const EXTRA_LIFE_SCORE = 10000;

export const SCORES = {
  shoot: 100,
  jumpKick: 150,
  shootDark: 150,
  jumpKickDark: 200,
  lampDrop: 300,
  crush: 300,
  document: 500,
} as const;

export const LEVEL_RED_DOORS = (level: number): number =>
  Math.min(4 + level, 10);

export const LEVEL_BONUS = (level: number): number =>
  Math.min(level * 1000, 10000);

export { COLORS, HUD_TOP_HEIGHT, HUD_BOTTOM_HEIGHT, PALETTE } from '../graphics/palette';

export const KEYS = {
  P1: {
    left: 'LEFT',
    right: 'RIGHT',
    up: 'UP',
    down: 'DOWN',
    fire: 'Z',
    jump: 'X',
    start: 'ENTER',
  },
  P2: {
    left: 'A',
    right: 'D',
    up: 'W',
    down: 'S',
    fire: 'G',
    jump: 'H',
    start: 'BACKSPACE',
  },
} as const;

export const STARTING_LIVES = 3;
