import Phaser from 'phaser';
import {
  FLOOR_HEIGHT,
  GAME_WIDTH,
  HALLWAY_Y_OFFSET,
} from '../config/gameConfig';
import { FLOORS, floorToY, SHAFTS, type FloorDef } from '../data/buildingLayout';
import { PALETTE } from './palette';

export interface BuildingDrawState {
  globalDark: boolean;
}

function getShaftsForFloor(floorNumber: number): number[] {
  return SHAFTS.filter((s) => s.serviceFloors.includes(floorNumber)).map((s) => s.x);
}

function drawDoor(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  isRed: boolean,
  collected: boolean,
): void {
  const color = isRed ? (collected ? PALETTE.redDark : PALETTE.red) : PALETTE.navy;
  g.fillStyle(color, 1);
  g.fillRect(x, y + 2, 8, 10);
  g.fillStyle(PALETTE.navyDark, 1);
  g.fillRect(x + 1, y + 3, 6, 8);
  // knob
  g.fillStyle(PALETTE.white, 1);
  g.fillRect(x + 5, y + 7, 1, 1);
  // floor mat
  g.fillStyle(PALETTE.mat, 1);
  g.fillRect(x - 1, y + HALLWAY_Y_OFFSET + 2, 10, 2);
}

function drawFloorNumber(g: Phaser.GameObjects.Graphics, y: number, num: number): void {
  g.fillStyle(PALETTE.red, 1);
  g.fillRect(GAME_WIDTH - 14, y + 2, 12, 10);
  g.fillStyle(PALETTE.white, 1);
  const str = String(num);
  const ox = GAME_WIDTH - 12;
  const oy = y + 4;
  if (str.length === 1) {
    drawMiniDigit(g, ox + 2, oy, Number(str));
  } else {
    drawMiniDigit(g, ox, oy, Number(str[0]));
    drawMiniDigit(g, ox + 5, oy, Number(str[1]));
  }
}

function drawMiniDigit(g: Phaser.GameObjects.Graphics, x: number, y: number, d: number): void {
  const segs: Record<number, number[][]> = {
    0: [[1,1,1],[1,0,1],[1,0,1],[1,1,1]],
    1: [[0,1,0],[0,1,0],[0,1,0],[0,1,0]],
    2: [[1,1,1],[0,0,1],[1,1,1],[1,0,0]],
    3: [[1,1,1],[0,0,1],[1,1,1],[0,0,1]],
    4: [[1,0,1],[1,0,1],[1,1,1],[0,0,1]],
    5: [[1,1,1],[1,0,0],[1,1,1],[0,0,1]],
    6: [[1,1,1],[1,0,0],[1,1,1],[1,0,1]],
    7: [[1,1,1],[0,0,1],[0,0,1],[0,0,1]],
    8: [[1,1,1],[1,0,1],[1,1,1],[1,0,1]],
    9: [[1,1,1],[1,0,1],[1,1,1],[0,0,1]],
  };
  const grid = segs[d] ?? segs[0]!;
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 3; col++) {
      if (grid[row]![col]) {
        g.fillRect(x + col, y + row, 1, 1);
      }
    }
  }
}

function drawFloorSegment(
  g: Phaser.GameObjects.Graphics,
  floor: FloorDef,
  state: BuildingDrawState,
): void {
  const y = floorToY(floor.number);
  const dark = floor.permanentlyDark || state.globalDark;
  const roomColor = dark ? PALETTE.tealDark : PALETTE.teal;

  // Black background
  g.fillStyle(PALETTE.black, 1);
  g.fillRect(0, y, GAME_WIDTH, FLOOR_HEIGHT);

  const shaftXs = getShaftsForFloor(floor.number);
  const segments: { left: number; right: number }[] = [];
  let cursor = 2;
  const sorted = [...shaftXs].sort((a, b) => a - b);
  for (const sx of sorted) {
    const shaftLeft = sx - 10;
    if (cursor < shaftLeft) {
      segments.push({ left: cursor, right: shaftLeft - 1 });
    }
    cursor = sx + 10;
  }
  if (cursor < GAME_WIDTH - 16) {
    segments.push({ left: cursor, right: GAME_WIDTH - 16 });
  }
  if (segments.length === 0) {
    segments.push({ left: 2, right: GAME_WIDTH - 16 });
  }

  // Room interiors
  for (const seg of segments) {
    g.fillStyle(roomColor, 1);
    g.fillRect(seg.left, y + 1, seg.right - seg.left + 1, FLOOR_HEIGHT - 3);
  }

  // Elevator shafts
  for (const sx of sorted) {
    g.fillStyle(PALETTE.black, 1);
    g.fillRect(sx - 10, y, 20, FLOOR_HEIGHT);
    g.fillStyle(PALETTE.grayDark, 1);
    g.fillRect(sx - 1, y, 2, FLOOR_HEIGHT);
  }

  // Gray floor slab
  g.fillStyle(PALETTE.gray, 1);
  g.fillRect(0, y + HALLWAY_Y_OFFSET + 4, GAME_WIDTH - 14, 3);
  g.fillStyle(PALETTE.grayDark, 1);
  g.fillRect(0, y + HALLWAY_Y_OFFSET + 7, GAME_WIDTH - 14, 1);

  // Doors
  for (const door of floor.doors) {
    const doorPositions: Record<string, number> = {
      left: 24,
      right: GAME_WIDTH - 36,
    };
    const dx = doorPositions[door.side] ?? 24;
    drawDoor(g, dx, y, door.type === 'red', !!door.collected);
  }

  // Lamps
  if (floor.hasLamps && !dark) {
    for (const seg of segments) {
      const lx = Math.floor((seg.left + seg.right) / 2);
      g.fillStyle(PALETTE.lamp, 1);
      g.fillRect(lx - 2, y + 1, 4, 2);
      g.fillStyle(PALETTE.white, 1);
      g.fillRect(lx - 1, y + 2, 2, 1);
    }
  }

  // Escalators
  if (floor.escalatorLeft) {
    g.fillStyle(PALETTE.gray, 1);
    g.fillRect(4, y + 1, 6, FLOOR_HEIGHT - 2);
    g.lineStyle(1, PALETTE.grayDark, 1);
    for (let i = 0; i < 4; i++) {
      g.lineBetween(4, y + 2 + i * 3, 10, y + 4 + i * 3);
    }
  }
  if (floor.escalatorRight) {
    g.fillStyle(PALETTE.gray, 1);
    g.fillRect(GAME_WIDTH - 22, y + 1, 6, FLOOR_HEIGHT - 2);
    g.lineStyle(1, PALETTE.grayDark, 1);
    for (let i = 0; i < 4; i++) {
      g.lineBetween(GAME_WIDTH - 22, y + 2 + i * 3, GAME_WIDTH - 16, y + 4 + i * 3);
    }
  }

  if (floor.number > 0) {
    drawFloorNumber(g, y, floor.number);
  }
}

export function drawBuilding(
  g: Phaser.GameObjects.Graphics,
  state: BuildingDrawState,
): void {
  g.clear();
  for (const floor of FLOORS) {
    drawFloorSegment(g, floor, state);
  }
}

export function getDoorX(side: 'left' | 'right'): number {
  return side === 'left' ? 28 : GAME_WIDTH - 32;
}
