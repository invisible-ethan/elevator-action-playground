// Pixel-art character sprites, 12px wide, drawn facing right with feet on the bottom row.
// Legend: h hair/hat  s skin  e eye  w shirt  r tie  c suit  p trousers  k shoes  g gun

const HEAD = [
  '....hhhh....',
  '...hhhhhh...',
  '..hhhhhhhh..',
  '...hsssss...',
  '...hsssess..',
  '....sssss...',
  '.....sss....',
];

const TORSO = [
  '...cwwrcc...',
  '..ccwwrccc..',
  '..ccwwrccc..',
  '..cccwrccc..',
  '..cccccccc..',
  '..sccccccs..',
  '...cccccc...',
];

const TORSO_AIM = [
  '...cwwrcc...',
  '..ccwwrccsgg',
  '..ccwwrccc.g',
  '..cccwrccc..',
  '..cccccccc..',
  '..scccccc...',
  '...cccccc...',
];

const LEGS_STAND = [
  '...pppppp...',
  '...pppppp...',
  '...pp..pp...',
  '...pp..pp...',
  '...pp..pp...',
  '...pp..pp...',
  '...pp..pp...',
  '...pp..pp...',
  '..kkk..kkk..',
  '..kkk..kkkk.',
];

const LEGS_WALK_A = [
  '...pppppp...',
  '...pppppp...',
  '..ppp..ppp..',
  '..pp....pp..',
  '.pp......pp.',
  '.pp......pp.',
  'pp........pp',
  'pp........pp',
  'kk........kk',
  'kkk.......kkk'.slice(0, 12),
];

const LEGS_WALK_B = [
  '...pppppp...',
  '...pppppp...',
  '....pppp....',
  '....ppp.....',
  '....ppp.....',
  '....pppp....',
  '....p.pp....',
  '....p..pp...',
  '...kk..kk...',
  '..kkk..kkk..',
];

const LEGS_JUMP = [
  '...pppppp...',
  '...ppppppppp',
  '...pp...pppk',
  '...pp.....kk',
  '...pp.......',
  '..pp........',
  '..kk........',
  '.kkk........',
  '............',
  '............',
];

const CROUCH = [
  '....hhhh....',
  '...hhhhhh...',
  '..hhhhhhhh..',
  '...hsssss...',
  '...hsssess..',
  '....sssss...',
  '...cwwrcc...',
  '..ccwwrccsgg',
  '..ccwwrccc.g',
  '..cccccccc..',
  '..pppppppp..',
  '.ppppppppp..',
  '.pp...pppp..',
  '.pp.....pp..',
  '.kk.....pp..',
  'kkk....kkk..',
];

const HANG = [
  '.........ss.',
  '....hhhh.cc.',
  '...hhhhhhcc.',
  '..hhhhhhhhc.',
  '...hsssssc..',
  '...hsssesc..',
  '....ssssc...',
  '.....sssc...',
  '...cwwrcc...',
  '..ccwwrccc..',
  '..ccwwrccc..',
  '..cccwrccc..',
  '..cccccccc..',
  '..scccccc...',
  '...cccccc...',
  ...LEGS_WALK_B.slice(0, 9),
];

export const FRAMES = {
  stand: [...HEAD, ...TORSO, ...LEGS_STAND],
  walkA: [...HEAD, ...TORSO, ...LEGS_WALK_A],
  walkB: [...HEAD, ...TORSO, ...LEGS_WALK_B],
  shoot: [...HEAD, ...TORSO_AIM, ...LEGS_STAND],
  jump: [...HEAD, ...TORSO_AIM, ...LEGS_JUMP],
  crouch: CROUCH,
  hang: HANG,
} as const;

export type FrameName = keyof typeof FRAMES;

export interface SpritePalette {
  h: string;
  s: string;
  e: string;
  w: string;
  r: string;
  c: string;
  p: string;
  k: string;
  g: string;
}

export const PALETTES = {
  player: { h: '#f8d048', s: '#f8b890', e: '#000000', w: '#ffffff', r: '#d82020', c: '#d88838', p: '#7a4a20', k: '#282828', g: '#9090a0' },
  enemy: { h: '#101018', s: '#f8b890', e: '#000000', w: '#ffffff', r: '#101018', c: '#20206a', p: '#14143c', k: '#000000', g: '#9090a0' },
  shadow: { h: '#0c0c20', s: '#0c0c20', e: '#ffffff', w: '#0c0c20', r: '#0c0c20', c: '#0c0c20', p: '#0c0c20', k: '#0c0c20', g: '#0c0c20' },
  shadowPlayer: { h: '#1a1a34', s: '#1a1a34', e: '#f8d048', w: '#1a1a34', r: '#1a1a34', c: '#1a1a34', p: '#1a1a34', k: '#1a1a34', g: '#1a1a34' },
} satisfies Record<string, SpritePalette>;

export type PaletteName = keyof typeof PALETTES;

const cache = new Map<string, HTMLCanvasElement>();

function build(frame: FrameName, pal: PaletteName, flip: boolean): HTMLCanvasElement {
  const rows = FRAMES[frame];
  const colors = PALETTES[pal] as SpritePalette;
  const canvas = document.createElement('canvas');
  canvas.width = 12;
  canvas.height = rows.length;
  const ctx = canvas.getContext('2d')!;
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const ch = row[x] as keyof SpritePalette;
      const color = colors[ch];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(flip ? 11 - x : x, y, 1, 1);
    }
  });
  return canvas;
}

export function sprite(frame: FrameName, pal: PaletteName, facing: 1 | -1): HTMLCanvasElement {
  const key = `${frame}|${pal}|${facing}`;
  let c = cache.get(key);
  if (!c) {
    c = build(frame, pal, facing < 0);
    cache.set(key, c);
  }
  return c;
}

/** Draws a character centred on x with its feet at y. */
export function drawCharacter(
  ctx: CanvasRenderingContext2D,
  frame: FrameName,
  pal: PaletteName,
  x: number,
  feet: number,
  facing: 1 | -1,
): void {
  const img = sprite(frame, pal, facing);
  ctx.drawImage(img, Math.round(x - 6), Math.round(feet - img.height));
}

/** A character lying on the floor (rotated), used for death animations. */
export function drawFallen(
  ctx: CanvasRenderingContext2D,
  pal: PaletteName,
  x: number,
  feet: number,
  facing: 1 | -1,
): void {
  const img = sprite('stand', pal, facing);
  ctx.save();
  ctx.translate(Math.round(x), Math.round(feet));
  ctx.rotate((-facing * Math.PI) / 2);
  // Rotated about the feet: this offset keeps the body lying on the floor line.
  ctx.drawImage(img, facing > 0 ? 0 : -12, -img.height + 6);
  ctx.restore();
}

/** A character squashed flat by an elevator or a lamp. */
export function drawSquashed(
  ctx: CanvasRenderingContext2D,
  pal: PaletteName,
  x: number,
  feet: number,
  facing: 1 | -1,
): void {
  const img = sprite('stand', pal, facing);
  ctx.drawImage(img, Math.round(x - 8), Math.round(feet - 6), 16, 6);
}
