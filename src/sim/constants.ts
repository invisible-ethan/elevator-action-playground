// Geometry and tuning shared by the simulation and the renderer.
// All units are arcade pixels; the screen is the original 256x224.

export const SCREEN_W = 256;
export const SCREEN_H = 224;
export const HUD_TOP = 16;
export const HUD_BOTTOM = 16;
export const VIEW_H = SCREEN_H - HUD_TOP - HUD_BOTTOM;

export const FLOOR_H = 48;
export const SLAB_H = 6;

/** Floor numbering: 31 is the roof, 30..1 are offices, 0 is the basement garage. */
export const ROOF = 31;
export const TOP_FLOOR = 30;
export const BASEMENT = 0;

export const WALL_L = 16;
export const WALL_R = 240;

/** Horizontal slots that can hold an elevator shaft or an escalator. */
export const SLOTS = [64, 128, 192] as const;
export const SHAFT_HALF = 12;
export const ESC_HALF = 20;

export const DOOR_XS = [34, 96, 160, 222] as const;
export const DOOR_HALF = 8;
export const DOOR_H = 30;

export const LAMP_XS = [46, 112, 144, 210] as const;

/** Getaway car position in the basement. */
export const GETAWAY_X = 212;

// Characters
export const BODY_HALF = 5;
export const STAND_H = 22;
export const CROUCH_H = 14;
/** Bullet height above the feet for a standing (high) and crouching (low) shot. */
export const HIGH_SHOT = 16;
export const LOW_SHOT = 7;

export const WALK_SPEED = 1;
export const JUMP_V = 3;
export const GRAVITY = 0.2;
export const PLAYER_BULLET_SPEED = 4;
export const MAX_PLAYER_BULLETS = 2;

/** How far from a shaft's centre a walker is stopped when there is no car to step into. */
export const PLAYER_SHAFT_STOP = SHAFT_HALF + BODY_HALF - 1;
export const ENEMY_SHAFT_STOP = SHAFT_HALF + 1;

export const CAR_WAIT = 50;
export const CAR_AUTO_SPEED = 0.7;
export const CAR_PLAYER_SPEED = 1.4;

export const ESC_FRAMES = FLOOR_H;

/** The longest drop down a shaft the player survives (about one floor). */
export const SAFE_FALL = FLOOR_H + 8;

export const SCORE = {
  shot: 100,
  kick: 150,
  lamp: 150,
  crush: 300,
  document: 500,
  lampHit: 50,
} as const;

export const EXTRA_LIFE_FIRST = 10000;
export const EXTRA_LIFE_EVERY = 20000;

/** Y coordinate (world space, down is positive) of the floor line characters on floor `f` stand on. */
export const floorY = (f: number): number => (ROOF + 1 - f) * FLOOR_H;

/** Floor whose room contains world y (a y exactly on a floor line belongs to that floor). */
export const roomFloor = (y: number): number => ROOF + 1 - Math.ceil(y / FLOOR_H - 1e-6);

/** Y of the underside of the ceiling slab in room `f`. */
export const ceilingY = (f: number): number => floorY(f) - FLOOR_H + SLAB_H;

export const WORLD_BOTTOM = floorY(BASEMENT) + 12;
export const CAMERA_MIN = floorY(ROOF) - 120;
export const CAMERA_MAX = WORLD_BOTTOM - VIEW_H;
