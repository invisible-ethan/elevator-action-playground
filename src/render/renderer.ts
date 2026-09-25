import type { Door, Escalator, Lamp, Shaft } from '../sim/building';
import {
  BASEMENT,
  DOOR_H,
  DOOR_HALF,
  FLOOR_H,
  HUD_BOTTOM,
  HUD_TOP,
  ROOF,
  SCREEN_H,
  SCREEN_W,
  SHAFT_HALF,
  SLAB_H,
  TOP_FLOOR,
  VIEW_H,
  WALL_L,
  WALL_R,
  ceilingY,
  floorY,
  roomFloor,
} from '../sim/constants';
import type { Car } from '../sim/elevator';
import type { Enemy, Player, World } from '../sim/world';
import { drawText, drawTextCentered } from './font';
import { drawCharacter, drawFallen, drawSquashed, type FrameName, type PaletteName } from './sprites';

const LIGHT = {
  room: '#20a8a8',
  roomTop: '#189090',
  roomBase: '#168484',
  slab: '#d0d0d0',
  slabEdge: '#808080',
  pillar: '#a8a8a8',
  facade: '#5c5c5c',
  facadeLine: '#4a4a4a',
  shaft: '#0c4c54',
  shaftEdge: '#b8b8b8',
  cable: '#062a2e',
  car: '#f8a8c8',
  carBack: '#e890b4',
  carFrame: '#fff0f6',
  carShade: '#c07090',
  doorBlue: '#1414b8',
  doorBlueHi: '#4848f0',
  doorFrame: '#a0a0e0',
  doorRed: '#d01818',
  doorRedHi: '#f86060',
  doorOpen: '#000008',
  lampShade: '#e8e8e8',
  lampGlow: '#fff8a0',
  cord: '#2a2a2a',
  esc: '#808890',
  escStep: '#b8c0c8',
  escRail: '#303038',
  numBg: '#d01010',
  numText: '#ffffff',
};

const DARK: typeof LIGHT = {
  ...LIGHT,
  room: '#06060e',
  roomTop: '#04040a',
  roomBase: '#08081a',
  slab: '#26262e',
  slabEdge: '#141418',
  pillar: '#202028',
  shaft: '#030308',
  shaftEdge: '#26262e',
  car: '#3a2430',
  carBack: '#2e1c26',
  carFrame: '#4a3440',
  carShade: '#2a1822',
  doorBlue: '#0a0a2a',
  doorBlueHi: '#10103a',
  doorFrame: '#16163a',
  doorRed: '#2a0808',
  doorRedHi: '#3a1010',
  lampShade: '#303030',
  lampGlow: '#303030',
  esc: '#1a1a20',
  escStep: '#24242a',
  escRail: '#101014',
  numBg: '#400808',
  numText: '#808080',
};

export const HUD = {
  band: '#f8b0d0',
  label: '#a00038',
  text: '#000000',
  hi: '#101080',
};

type Colors = typeof LIGHT;

export function renderWorld(ctx: CanvasRenderingContext2D, w: World): void {
  const camY = Math.round(w.cameraY);
  const C = w.blackout > 0 ? DARK : LIGHT;

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, HUD_TOP, SCREEN_W, VIEW_H);
  ctx.clip();
  ctx.fillStyle = '#1a1008';
  ctx.fillRect(0, HUD_TOP, SCREEN_W, VIEW_H);
  ctx.translate(0, HUD_TOP - camY);

  const topF = Math.min(ROOF, roomFloor(camY) + 1);
  const botF = Math.max(BASEMENT, roomFloor(camY + VIEW_H) - 1);

  drawBackdrop(ctx, camY);
  for (let f = botF; f <= topF; f++) {
    if (f >= 1 && f <= TOP_FLOOR) drawRoom(ctx, w, f, C);
  }
  if (botF <= BASEMENT + 1) drawBasement(ctx, w);
  if (topF >= ROOF - 1) drawRoof(ctx, w);

  for (const e of w.b.escalators) {
    if (e.top >= botF && e.top - 1 <= topF) drawEscalator(ctx, e, C);
  }
  for (const s of w.b.shafts) drawShaft(ctx, s, botF, topF, C);
  for (const car of w.cars) drawCarBack(ctx, car, C);

  for (const lamp of w.b.lamps) {
    if (lamp.floor >= botF && lamp.floor <= topF) drawLamp(ctx, lamp, C);
  }

  const dark = w.blackout > 0;
  for (const e of w.enemies) drawEnemy(ctx, e, dark);
  drawPlayer(ctx, w, dark);

  for (const car of w.cars) drawCarFront(ctx, car, C);
  // The player riding the car roof is drawn on top of its frame.
  if (w.player.mode === 'roof') drawPlayer(ctx, w, dark);

  for (const b of w.bullets) {
    ctx.fillStyle = b.owner === 'player' ? '#ffffff' : '#ffe040';
    ctx.fillRect(Math.round(b.x) - 2, Math.round(b.y), 4, 1);
    if (dark) {
      ctx.fillStyle = '#ff8020';
      ctx.fillRect(Math.round(b.x) - 1, Math.round(b.y) - 1, 2, 3);
    }
  }

  for (const p of w.popups) {
    drawTextCentered(ctx, p.text, p.x, Math.round(p.y), '#ffffff');
  }

  ctx.restore();
  renderOverlay(ctx, w);
  renderHud(ctx, w);
}

// ------------------------------------------------------------------ building

function drawBackdrop(ctx: CanvasRenderingContext2D, camY: number): void {
  const roofY = floorY(ROOF);
  // Night sky above the roof.
  if (camY < roofY) {
    ctx.fillStyle = '#000024';
    ctx.fillRect(0, camY, SCREEN_W, roofY - camY);
    ctx.fillStyle = '#9090d0';
    for (let i = 0; i < 44; i++) {
      const x = (i * 97 + 13) % SCREEN_W;
      const y = roofY - 170 + ((i * 53) % 150);
      ctx.fillRect(x, y, 1, 1);
    }
    ctx.fillStyle = '#f8f0b0';
    ctx.beginPath();
    ctx.arc(206, roofY - 112, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000024';
    ctx.beginPath();
    ctx.arc(202, roofY - 115, 8, 0, Math.PI * 2);
    ctx.fill();
    // Distant skyline.
    ctx.fillStyle = '#0c0c3c';
    const skyline = [
      [0, 30], [14, 44], [30, 22], [44, 52], [60, 36], [78, 28], [92, 48],
      [110, 26], [126, 40], [146, 30], [160, 56], [176, 34], [196, 24], [214, 46], [232, 32], [246, 42],
    ];
    for (const [x, h] of skyline) ctx.fillRect(x, roofY - h, 16, h);
    ctx.fillStyle = '#f0d060';
    for (let i = 0; i < 30; i++) {
      const [bx, h] = skyline[i % skyline.length];
      ctx.fillRect(bx + 3 + ((i * 5) % 10), roofY - h + 4 + ((i * 7) % Math.max(4, h - 8)), 1, 2);
    }
  }
  // Facade on both sides of the rooms.
  const top = Math.max(camY, roofY);
  const ground = floorY(1);
  if (top < ground) {
    ctx.fillStyle = LIGHT.facade;
    ctx.fillRect(0, top, WALL_L - 4, ground - top);
    ctx.fillRect(WALL_R + 4, top, SCREEN_W - WALL_R - 4, ground - top);
    ctx.fillStyle = LIGHT.facadeLine;
    for (let f = Math.min(TOP_FLOOR, roomFloor(top)); f >= roomFloor(Math.min(ground, camY + VIEW_H)); f--) {
      const y = floorY(f + 1);
      ctx.fillRect(0, y, WALL_L - 4, 2);
      ctx.fillRect(WALL_R + 4, y, SCREEN_W - WALL_R - 4, 2);
      ctx.fillRect(4, y + 12, 4, 20);
      ctx.fillRect(SCREEN_W - 8, y + 12, 4, 20);
    }
  }
  // Street level: red brick outside, earth below.
  if (camY + VIEW_H > ground) {
    for (let y = ground; y < floorY(BASEMENT) + 16; y += 4) {
      const row = (y - ground) / 4;
      ctx.fillStyle = '#c82828';
      ctx.fillRect(0, y, WALL_L - 4, 4);
      ctx.fillRect(WALL_R + 4, y, SCREEN_W - WALL_R - 4, 4);
      ctx.fillStyle = '#f08070';
      ctx.fillRect(0, y + 3, WALL_L - 4, 1);
      ctx.fillRect(WALL_R + 4, y + 3, SCREEN_W - WALL_R - 4, 1);
      for (let x = row % 2 ? 0 : 4; x < SCREEN_W; x += 8) {
        if (x < WALL_L - 4 || x >= WALL_R + 4) ctx.fillRect(x, y, 1, 3);
      }
    }
  }
}

function drawSlab(ctx: CanvasRenderingContext2D, y: number, C: Colors): void {
  ctx.fillStyle = C.slab;
  ctx.fillRect(WALL_L - 4, y, WALL_R - WALL_L + 8, SLAB_H);
  ctx.fillStyle = C.slabEdge;
  ctx.fillRect(WALL_L - 4, y + SLAB_H - 1, WALL_R - WALL_L + 8, 1);
}

function drawRoom(ctx: CanvasRenderingContext2D, w: World, f: number, C: Colors): void {
  const y0 = floorY(f) - FLOOR_H;
  const yF = floorY(f);
  ctx.fillStyle = C.room;
  ctx.fillRect(WALL_L, y0 + SLAB_H, WALL_R - WALL_L, FLOOR_H - SLAB_H);
  ctx.fillStyle = C.roomTop;
  ctx.fillRect(WALL_L, y0 + SLAB_H, WALL_R - WALL_L, 2);
  ctx.fillStyle = C.roomBase;
  ctx.fillRect(WALL_L, yF - 3, WALL_R - WALL_L, 3);
  // Side pillars
  ctx.fillStyle = C.pillar;
  ctx.fillRect(WALL_L - 4, y0, 4, FLOOR_H);
  ctx.fillRect(WALL_R, y0, 4, FLOOR_H);
  drawSlab(ctx, y0, C);

  for (const d of w.b.doors) if (d.floor === f) drawDoor(ctx, d, C);

  // Floor number plate
  ctx.fillStyle = C.numBg;
  ctx.fillRect(WALL_R - 22, y0 + SLAB_H + 3, 18, 9);
  drawText(ctx, String(f).padStart(2, '0'), WALL_R - 22, y0 + SLAB_H + 4, C.numText);
}

function drawDoor(ctx: CanvasRenderingContext2D, d: Door, C: Colors): void {
  const x = d.x - DOOR_HALF;
  const y = floorY(d.floor) - DOOR_H;
  const red = d.red && !d.taken;
  ctx.fillStyle = C.doorFrame;
  ctx.fillRect(x - 1, y - 1, DOOR_HALF * 2 + 2, DOOR_H + 1);
  if (d.open > 0) {
    ctx.fillStyle = C.doorOpen;
    ctx.fillRect(x, y, DOOR_HALF * 2, DOOR_H);
    // The door leaf swung open against the wall.
    ctx.fillStyle = red ? C.doorRed : C.doorBlue;
    ctx.fillRect(x - 3, y, 3, DOOR_H);
    return;
  }
  ctx.fillStyle = red ? C.doorRed : C.doorBlue;
  ctx.fillRect(x, y, DOOR_HALF * 2, DOOR_H);
  ctx.fillStyle = red ? C.doorRedHi : C.doorBlueHi;
  ctx.fillRect(x + 2, y + 3, DOOR_HALF * 2 - 4, 10);
  ctx.fillRect(x + 2, y + 16, DOOR_HALF * 2 - 4, 11);
  ctx.fillStyle = red ? C.doorRed : C.doorBlue;
  ctx.fillRect(x + 3, y + 4, DOOR_HALF * 2 - 6, 8);
  ctx.fillRect(x + 3, y + 17, DOOR_HALF * 2 - 6, 9);
  ctx.fillStyle = '#f0d040';
  ctx.fillRect(x + DOOR_HALF * 2 - 4, y + 15, 2, 2);
}

function drawLamp(ctx: CanvasRenderingContext2D, lamp: Lamp, C: Colors): void {
  const top = ceilingY(lamp.floor);
  const x = lamp.x;
  if (lamp.state === 'hang') {
    ctx.fillStyle = C.cord;
    ctx.fillRect(x, top, 1, 4);
    ctx.fillStyle = C.lampShade;
    ctx.fillRect(x - 2, top + 4, 5, 2);
    ctx.fillRect(x - 4, top + 6, 9, 3);
    ctx.fillStyle = C.lampGlow;
    ctx.fillRect(x - 2, top + 9, 5, 1);
    return;
  }
  const y = top + 4 + lamp.drop;
  if (lamp.state === 'fall') {
    ctx.fillStyle = '#e8e8e8';
    ctx.fillRect(x - 2, y, 5, 2);
    ctx.fillRect(x - 4, y + 2, 9, 3);
    return;
  }
  // Broken on the floor
  ctx.fillStyle = C.lampShade;
  const yF = floorY(lamp.floor) - 2;
  ctx.fillRect(x - 6, yF, 3, 2);
  ctx.fillRect(x - 1, yF - 1, 4, 3);
  ctx.fillRect(x + 4, yF, 2, 2);
}

function drawEscalator(ctx: CanvasRenderingContext2D, e: Escalator, C: Colors): void {
  const yTop = floorY(e.top);
  const dx = (e.bottomX - e.topX) / FLOOR_H;
  // Truss
  ctx.fillStyle = C.esc;
  for (let t = 0; t <= FLOOR_H; t++) {
    const x = e.topX + dx * t;
    ctx.fillRect(Math.round(x) - 5, yTop + t, 10, 4);
  }
  // Steps
  ctx.fillStyle = C.escStep;
  for (let t = 2; t <= FLOOR_H; t += 4) {
    const x = e.topX + dx * t;
    ctx.fillRect(Math.round(x) - 5, yTop + t, 10, 1);
  }
  // Handrail
  ctx.fillStyle = C.escRail;
  for (let t = 0; t <= FLOOR_H; t++) {
    const x = e.topX + dx * t;
    ctx.fillRect(Math.round(x) - 1, yTop + t - 14, 2, 2);
  }
  ctx.fillRect(Math.round(e.topX) - 1, yTop - 14, 2, 14);
  ctx.fillRect(Math.round(e.bottomX) - 1, yTop + FLOOR_H - 14, 2, 14);
  // Landing plates
  ctx.fillStyle = C.escStep;
  ctx.fillRect(Math.round(e.topX) - 6, yTop - 1, 12, 2);
  ctx.fillRect(Math.round(e.bottomX) - 6, yTop + FLOOR_H - 1, 12, 2);
}

function drawShaft(ctx: CanvasRenderingContext2D, s: Shaft, botF: number, topF: number, C: Colors): void {
  const lo = Math.max(s.min, botF);
  const hi = Math.min(s.max, topF);
  if (lo > hi) return;
  const top = floorY(hi) - FLOOR_H + (hi === s.max ? SLAB_H : 0);
  const bottom = floorY(lo);
  ctx.fillStyle = C.shaft;
  ctx.fillRect(s.x - SHAFT_HALF, top, SHAFT_HALF * 2, bottom - top);
  ctx.fillStyle = C.cable;
  ctx.fillRect(s.x - 5, top, 1, bottom - top);
  ctx.fillRect(s.x + 4, top, 1, bottom - top);
  ctx.fillStyle = C.shaftEdge;
  ctx.fillRect(s.x - SHAFT_HALF - 1, top, 1, bottom - top);
  ctx.fillRect(s.x + SHAFT_HALF, top, 1, bottom - top);
  // Door frame lintels on each floor
  for (let f = lo; f <= hi; f++) {
    const y = floorY(f) - FLOOR_H + SLAB_H;
    ctx.fillRect(s.x - SHAFT_HALF - 2, y, SHAFT_HALF * 2 + 4, 2);
  }
  // Pit floor
  if (lo === s.min) {
    ctx.fillStyle = C.slabEdge;
    ctx.fillRect(s.x - SHAFT_HALF, bottom, SHAFT_HALF * 2, 2);
  }
}

function drawCarBack(ctx: CanvasRenderingContext2D, car: Car, C: Colors): void {
  const x = car.x - SHAFT_HALF + 1;
  const w = SHAFT_HALF * 2 - 2;
  const top = car.y - FLOOR_H;
  ctx.fillStyle = C.car;
  ctx.fillRect(x, top, w, FLOOR_H);
  ctx.fillStyle = C.carBack;
  ctx.fillRect(x + 3, top + 5, w - 6, FLOOR_H - 8);
  ctx.fillStyle = C.carShade;
  ctx.fillRect(x, car.y - 2, w, 2);
  // Ceiling light
  ctx.fillStyle = C.lampGlow;
  ctx.fillRect(car.x - 3, top + 3, 6, 1);
}

function drawCarFront(ctx: CanvasRenderingContext2D, car: Car, C: Colors): void {
  const x = car.x - SHAFT_HALF + 1;
  const w = SHAFT_HALF * 2 - 2;
  const top = car.y - FLOOR_H;
  ctx.fillStyle = C.carFrame;
  ctx.fillRect(x, top, w, 2);
  ctx.fillRect(x, top, 2, FLOOR_H);
  ctx.fillRect(x + w - 2, top, 2, FLOOR_H);
  ctx.fillStyle = C.carShade;
  ctx.fillRect(x, car.y - 1, w, 1);
}

function drawRoof(ctx: CanvasRenderingContext2D, w: World): void {
  const y = floorY(ROOF);
  // Roof deck
  ctx.fillStyle = '#8a8a8a';
  ctx.fillRect(WALL_L - 8, y, WALL_R - WALL_L + 16, SLAB_H);
  ctx.fillStyle = '#5a5a5a';
  ctx.fillRect(WALL_L - 8, y + SLAB_H - 1, WALL_R - WALL_L + 16, 1);
  // Parapet posts and rail
  ctx.fillStyle = '#b0b0b0';
  ctx.fillRect(WALL_L - 8, y - 10, WALL_R - WALL_L + 16, 1);
  for (let x = WALL_L - 8; x <= WALL_R + 8; x += 16) ctx.fillRect(x, y - 10, 1, 10);
  // Elevator machine houses for shafts that reach the roof.
  for (const s of w.b.shafts) {
    if (s.max !== ROOF) continue;
    ctx.fillStyle = '#9a9a9a';
    ctx.fillRect(s.x - SHAFT_HALF - 6, y - FLOOR_H - 10, SHAFT_HALF * 2 + 12, FLOOR_H + 10);
    ctx.fillStyle = '#c4c4c4';
    ctx.fillRect(s.x - SHAFT_HALF - 8, y - FLOOR_H - 12, SHAFT_HALF * 2 + 16, 3);
    ctx.fillStyle = '#707070';
    ctx.fillRect(s.x - SHAFT_HALF - 6, y - FLOOR_H - 9, SHAFT_HALF * 2 + 12, 2);
    ctx.fillStyle = LIGHT.shaft;
    ctx.fillRect(s.x - SHAFT_HALF, y - FLOOR_H + SLAB_H, SHAFT_HALF * 2, FLOOR_H - SLAB_H);
  }
  // Antenna and water tank for flavour.
  ctx.fillStyle = '#6a6a6a';
  ctx.fillRect(214, y - 40, 2, 40);
  ctx.fillRect(206, y - 34, 18, 1);
  ctx.fillRect(208, y - 26, 14, 1);
  ctx.fillStyle = '#ff3030';
  if ((w.frame >> 5) % 2) ctx.fillRect(214, y - 42, 2, 2);
  // Zip line from the next building.
  ctx.fillStyle = '#c0c0c0';
  for (let x = -12; x <= 52; x++) {
    ctx.fillRect(x, Math.round(y - 94 + (x + 10) * (40 / 48)), 1, 1);
  }
  ctx.fillStyle = '#8a8a8a';
  ctx.fillRect(52, y - 44, 2, 44);
}

function drawBasement(ctx: CanvasRenderingContext2D, w: World): void {
  const y0 = floorY(1);
  const yF = floorY(BASEMENT);
  ctx.fillStyle = '#34343e';
  ctx.fillRect(WALL_L, y0 + SLAB_H, WALL_R - WALL_L, FLOOR_H - SLAB_H);
  ctx.fillStyle = '#2a2a32';
  for (let x = WALL_L + 8; x < WALL_R; x += 24) ctx.fillRect(x, y0 + SLAB_H, 2, FLOOR_H - SLAB_H);
  ctx.fillStyle = '#a8a8a8';
  ctx.fillRect(WALL_L - 4, y0, 4, FLOOR_H);
  drawSlab(ctx, y0, LIGHT);
  // Garage exit
  ctx.fillStyle = '#101018';
  ctx.fillRect(WALL_R, y0 + SLAB_H + 10, 4, FLOOR_H - SLAB_H - 10);
  // Floor
  ctx.fillStyle = '#606068';
  ctx.fillRect(WALL_L - 4, yF, WALL_R - WALL_L + 8, 8);
  ctx.fillStyle = '#f0d040';
  for (let x = WALL_L + 4; x < WALL_R; x += 20) ctx.fillRect(x, yF - 1, 10, 1);
  drawText(ctx, 'B1', WALL_L + 2, y0 + SLAB_H + 3, '#f0d040');
  drawGetawayCar(ctx, w.getawayX, yF, w.player.mode === 'drive', w.frame);
}

function drawGetawayCar(ctx: CanvasRenderingContext2D, x: number, feet: number, driven: boolean, frame: number): void {
  const left = Math.round(x) - 16;
  ctx.fillStyle = '#e02020';
  ctx.fillRect(left, feet - 11, 32, 7);
  ctx.fillRect(left + 7, feet - 17, 16, 6);
  ctx.fillStyle = '#80d0f8';
  ctx.fillRect(left + 9, feet - 16, 5, 4);
  ctx.fillRect(left + 16, feet - 16, 5, 4);
  if (driven) {
    ctx.fillStyle = '#f8d048';
    ctx.fillRect(left + 10, feet - 16, 3, 2);
  }
  ctx.fillStyle = '#ffff90';
  ctx.fillRect(left + 30, feet - 10, 2, 2);
  ctx.fillStyle = '#101010';
  const bob = driven && frame % 6 < 3 ? 1 : 0;
  ctx.fillRect(left + 4, feet - 5 + bob, 7, 5);
  ctx.fillRect(left + 21, feet - 5 + bob, 7, 5);
  ctx.fillStyle = '#909090';
  ctx.fillRect(left + 6, feet - 3 + bob, 3, 1);
  ctx.fillRect(left + 23, feet - 3 + bob, 3, 1);
}

// ------------------------------------------------------------------ characters

function walkFrame(walkT: number): FrameName {
  const phase = Math.floor(walkT / 7) % 4;
  return phase === 0 ? 'walkA' : phase === 2 ? 'walkB' : 'stand';
}

function drawPlayer(ctx: CanvasRenderingContext2D, w: World, dark: boolean): void {
  const p: Player = w.player;
  const pal: PaletteName = dark ? 'shadowPlayer' : 'player';
  if (p.hidden || p.mode === 'drive') return;
  if (p.invuln > 0 && (p.invuln >> 2) % 2 === 0) return;

  if (p.mode === 'dead') {
    if (p.t > 110 && (p.t >> 2) % 2) return;
    if (p.deathKind === 'crush') drawSquashed(ctx, pal, p.x, p.y, p.facing);
    else if (p.t < 24) drawCharacter(ctx, 'jump', pal, p.x - p.facing * (p.t >> 3), p.y - Math.sin(p.t / 8) * 6, p.facing);
    else drawFallen(ctx, pal, p.x - p.facing * 3, p.y, p.facing);
    return;
  }
  if (p.mode === 'zip') {
    drawCharacter(ctx, 'hang', pal, p.x, p.y, 1);
    return;
  }
  if (p.mode === 'door') {
    // Step into / out of the doorway, fading behind the frame.
    if (p.t < 16 || p.t > 68) drawCharacter(ctx, 'stand', pal, p.x, p.y, p.facing);
    return;
  }

  let frame: FrameName = 'stand';
  if (p.jumpY > 0) frame = 'jump';
  else if (p.crouch) frame = 'crouch';
  else if (p.shootT > 0) frame = 'shoot';
  else if (p.moving) frame = walkFrame(p.walkT);
  drawCharacter(ctx, frame, pal, p.x, p.y, p.facing);
  if (p.shootT > 6) drawMuzzle(ctx, p.x + p.facing * 12, p.y - (p.crouch ? 7 : 16));
}

function drawMuzzle(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.fillStyle = '#fff080';
  ctx.fillRect(Math.round(x) - 1, Math.round(y) - 1, 3, 3);
}

function drawEnemy(ctx: CanvasRenderingContext2D, e: Enemy, dark: boolean): void {
  const pal: PaletteName = dark ? 'shadow' : 'enemy';
  if (e.state === 'emerge') {
    if (e.t >= 10) drawCharacter(ctx, 'stand', pal, e.x, e.y, e.facing);
    return;
  }
  if (e.state === 'dead') {
    if (!e.deathKind) return;
    if (e.t > 40 && (e.t >> 2) % 2) return;
    if (e.deathKind === 'crush' || e.deathKind === 'lamp') drawSquashed(ctx, pal, e.x, e.y, e.facing);
    else if (e.t < 12) drawCharacter(ctx, 'jump', pal, e.x - e.facing * (e.t >> 2), e.y - Math.sin(e.t / 4) * 5, e.facing);
    else drawFallen(ctx, pal, e.x - e.facing * 3, floorY(e.floor), e.facing);
    return;
  }
  let frame: FrameName = 'stand';
  if (e.jumpY > 0) frame = 'jump';
  else if (e.crouchT > 0) frame = 'crouch';
  else if (e.aimT > 0) frame = 'shoot';
  else if (e.moving) frame = walkFrame(e.walkT);
  drawCharacter(ctx, frame, pal, e.x, e.y, e.facing);
  if (e.aimT > 0 && e.aimT < 4) drawMuzzle(ctx, e.x + e.facing * 12, e.y - (e.aimLow ? 7 : 16));
}

// ------------------------------------------------------------------ HUD & overlays

export function renderHud(ctx: CanvasRenderingContext2D, w: World): void {
  ctx.fillStyle = HUD.band;
  ctx.fillRect(0, 0, SCREEN_W, HUD_TOP);
  ctx.fillRect(0, SCREEN_H - HUD_BOTTOM, SCREEN_W, HUD_BOTTOM);

  drawText(ctx, 'PLAYER-1', 8, 0, HUD.label);
  drawText(ctx, String(w.score).padStart(6, '0'), 16, 8, HUD.text);
  drawText(ctx, 'HI-SCORE', 96, 0, HUD.label);
  drawText(ctx, String(w.hiScore).padStart(6, '0'), 104, 8, HUD.text);
  drawText(ctx, 'LEVEL', 192, 0, HUD.label);
  drawText(ctx, String(w.level).padStart(2, '0'), 208, 8, HUD.text);

  // Bottom band: lives, documents, alarm / floor.
  const by = SCREEN_H - HUD_BOTTOM + 4;
  for (let i = 0; i < Math.min(w.lives - 1, 6); i++) drawLifeIcon(ctx, 8 + i * 10, by);
  const docs = `DOCS ${w.docsTotal - w.docsLeft}/${w.docsTotal}`;
  drawText(ctx, docs, 84, by, w.docsLeft === 0 ? '#008000' : HUD.hi);
  if (w.alarm && (w.frame >> 4) % 2) {
    drawText(ctx, 'ALARM', 196, by, '#d00000');
  } else {
    const f = w.player.floor;
    drawText(ctx, f === ROOF ? 'ROOF' : f === BASEMENT ? 'B1' : `FL ${String(f).padStart(2, '0')}`, 196, by, HUD.text);
  }
}

function drawLifeIcon(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.fillStyle = '#c89818';
  ctx.fillRect(x + 1, y, 5, 2);
  ctx.fillStyle = '#e8a080';
  ctx.fillRect(x + 1, y + 2, 5, 2);
  ctx.fillStyle = '#b86818';
  ctx.fillRect(x, y + 4, 7, 4);
}

function renderOverlay(ctx: CanvasRenderingContext2D, w: World): void {
  const cy = HUD_TOP + VIEW_H / 2;
  if (w.message && w.status !== 'gameover') {
    banner(ctx, w.message.text, cy - 40, '#ffffff');
  }
  if (w.status === 'bonus') {
    banner(ctx, 'MISSION COMPLETE!', cy - 20, '#f8d048');
    if (w.statusT < 110) banner(ctx, `BONUS ${w.bonus}`, cy + 4, '#ffffff');
  }
  if (w.status === 'gameover') {
    banner(ctx, 'GAME OVER', cy - 8, '#ff4040');
  }
}

export function banner(ctx: CanvasRenderingContext2D, text: string, y: number, color: string): void {
  const width = text.length * 8 + 12;
  ctx.fillStyle = 'rgba(0,0,0,0.8)';
  ctx.fillRect(Math.round(SCREEN_W / 2 - width / 2), y - 4, width, 16);
  drawTextCentered(ctx, text, SCREEN_W / 2, y, color);
}

export function renderPause(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(0, HUD_TOP, SCREEN_W, VIEW_H);
  banner(ctx, 'PAUSE', HUD_TOP + VIEW_H / 2 - 4, '#ffffff');
}

// ------------------------------------------------------------------ title

export function renderTitle(
  ctx: CanvasRenderingContext2D,
  frame: number,
  hiScore: number,
  muted: boolean,
  touch: boolean,
): void {
  ctx.fillStyle = '#000018';
  ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);

  // Elevators gliding up and down either side of the logo.
  ctx.fillStyle = '#101030';
  ctx.fillRect(2, 20, 12, 96);
  ctx.fillRect(SCREEN_W - 14, 20, 12, 96);
  const carY = 22 + Math.round((Math.sin(frame / 50) + 1) * 40);
  ctx.fillStyle = LIGHT.car;
  ctx.fillRect(3, carY, 10, 12);
  ctx.fillRect(SCREEN_W - 13, 124 - carY, 10, 12);

  ctx.fillStyle = HUD.band;
  ctx.fillRect(0, 0, SCREEN_W, HUD_TOP);
  drawText(ctx, 'HI-SCORE', 96, 0, HUD.label);
  drawText(ctx, String(hiScore).padStart(6, '0'), 104, 8, HUD.text);

  drawLogo(ctx, 'ELEVATOR', 30, '#f83838', '#801010');
  drawLogo(ctx, 'ACTION', 58, '#48a8f8', '#103880');

  drawTextCentered(ctx, 'AGENT 17 - CODE NAME OTTO', SCREEN_W / 2, 90, '#f8d048');

  if ((frame >> 5) % 2 === 0) drawTextCentered(ctx, touch ? 'PRESS START' : 'PRESS ENTER TO START', SCREEN_W / 2, 106, '#ffffff');

  const lines: [string, string][] = [
    ['{} WALK   ^_ ELEVATOR', '#c0c0ff'],
    ['_ DUCK   ^ ENTER RED DOOR', '#c0c0ff'],
    ['Z FIRE   X JUMP   P PAUSE', '#c0c0ff'],
  ];
  const panelY = 124;
  ctx.fillStyle = '#0a0a2c';
  ctx.fillRect(8, panelY - 5, SCREEN_W - 16, 74);
  lines.forEach(([t, c], i) => drawTextCentered(ctx, t, SCREEN_W / 2, panelY + i * 10, c));
  drawTextCentered(ctx, 'GRAB EVERY RED-DOOR DOCUMENT', SCREEN_W / 2, panelY + 36, '#f86060');
  drawTextCentered(ctx, 'THEN ESCAPE FROM THE BASEMENT', SCREEN_W / 2, panelY + 46, '#f86060');
  drawTextCentered(ctx, muted ? 'M: SOUND OFF' : 'M: SOUND ON', SCREEN_W / 2, panelY + 58, '#808080');

  ctx.fillStyle = HUD.band;
  ctx.fillRect(0, SCREEN_H - HUD_BOTTOM, SCREEN_W, HUD_BOTTOM);
  drawTextCentered(ctx, 'FAN REMAKE - (C) 1983 TAITO', SCREEN_W / 2, SCREEN_H - 12, HUD.label);
}

function drawLogo(ctx: CanvasRenderingContext2D, text: string, y: number, color: string, shadow: string): void {
  const scale = 3;
  const x = SCREEN_W / 2 - (text.length * 8 * scale) / 2;
  drawText(ctx, text, x + 2, y + 2, shadow, scale);
  drawText(ctx, text, x, y, color, scale);
}
