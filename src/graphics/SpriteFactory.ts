import Phaser from 'phaser';
import { PALETTE } from './palette';

type PixelRow = string;

const C: Record<string, number> = {
  '.': -1,
  K: PALETTE.hair,
  S: PALETTE.skin,
  W: PALETTE.white,
  T: PALETTE.coat,
  P: PALETTE.pants,
  R: PALETTE.shoe,
  B: PALETTE.suit,
  H: PALETTE.hat,
  N: PALETTE.navy,
  G: PALETTE.grayDark,
  X: PALETTE.red,
  L: PALETTE.lamp,
  M: PALETTE.mat,
  Y: PALETTE.bullet,
  E: PALETTE.pink,
  D: PALETTE.pinkDark,
};

function textureFromPixels(
  scene: Phaser.Scene,
  key: string,
  rows: PixelRow[],
): void {
  const h = rows.length;
  const w = rows[0]!.length;
  const canvas = scene.textures.createCanvas(key, w, h);
  const ctx = canvas!.getContext();
  const img = ctx.createImageData(w, h);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const ch = rows[y]![x] ?? '.';
      const color = C[ch] ?? -1;
      const i = (y * w + x) * 4;
      if (color < 0) {
        img.data[i + 3] = 0;
      } else {
        img.data[i] = (color >> 16) & 0xff;
        img.data[i + 1] = (color >> 8) & 0xff;
        img.data[i + 2] = color & 0xff;
        img.data[i + 3] = 255;
      }
    }
  }
  ctx.putImageData(img, 0, 0);
  canvas!.refresh();
}

export function generateGameTextures(scene: Phaser.Scene): void {
  textureFromPixels(scene, 'otto', [
    '..K.....',
    '.KKK....',
    '.SSS....',
  '.TTTT...',
    '.TTTT...',
    '.TTTT...',
    '..PP....',
    '..PP....',
    '..RR....',
  ]);

  textureFromPixels(scene, 'otto_crouch', [
    '........',
    '..K.....',
    '.KKSS...',
    '.TTTT...',
    '.TTTT...',
    '..PP....',
    '..RR....',
    '........',
  ]);

  textureFromPixels(scene, 'enemy', [
    '..HHH...',
    '.HHHHH..',
    '.HSSSH..',
    '.BBBBB..',
    '.BBBBB..',
    '.BBBBB..',
    '..BB....',
    '..BB....',
    '..BB....',
  ]);

  textureFromPixels(scene, 'enemy_prone', [
    '........',
    '........',
    '.HHHSSBB',
    '.BBBBBBB',
    '.BBBBBBB',
    '........',
    '........',
    '........',
    '........',
  ]);

  textureFromPixels(scene, 'bullet', [
    'YY',
    'YY',
  ]);

  textureFromPixels(scene, 'lamp', [
    '.LL.',
    'LLLL',
    '.GG.',
  ]);

  textureFromPixels(scene, 'door_blue', [
    'NNNN',
    'NNNN',
    'NNNN',
    'NNNN',
    'N..N',
    'N..N',
    'N..N',
    'NNNN',
  ]);

  textureFromPixels(scene, 'door_red', [
    'XXXX',
    'XXXX',
    'XXXX',
    'XXXX',
    'X..X',
    'X..X',
    'X..X',
    'XXXX',
  ]);

  textureFromPixels(scene, 'elevator_car', [
    'DDDDDDDDDD',
    'DEEEEEEEED',
    'DEEEEEEEED',
    'DEEEEEEEED',
    'DEEEEEEEED',
    'DDDDDDDDDD',
  ]);

  textureFromPixels(scene, 'life_icon', [
    '.K.',
    'KSK',
    '.T.',
  ]);

  textureFromPixels(scene, 'car', [
    '..XXXXXX..',
    '.XXXXXXXX.',
    'XXXXXXXXXX',
    'XXXXXXXXXX',
    '..RR..RR..',
  ]);

  textureFromPixels(scene, 'mat', [
    'MMMM',
    'MMMM',
  ]);

  const gfx = scene.make.graphics({ x: 0, y: 0 });
  gfx.fillStyle(PALETTE.black, 1);
  gfx.fillRect(0, 0, 256, 224);
  gfx.generateTexture('bg_black', 256, 224);
  gfx.destroy();
}

export function drawTitleLogo(scene: Phaser.Scene): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();

  // ELEVATOR - cyan block letters (simplified)
  const letters1 = 'ELEVATOR';
  g.fillStyle(PALETTE.cyan, 1);
  let x = 28;
  for (const ch of letters1) {
    drawBlockLetter(g, x, 36, ch, PALETTE.cyan);
    x += 24;
  }

  // ACTION - red block letters
  const letters2 = 'ACTION';
  x = 40;
  for (const ch of letters2) {
    drawBlockLetter(g, x, 68, ch, PALETTE.titleRed);
    x += 28;
  }

  g.fillStyle(PALETTE.white, 1);
  return g;
}

function drawBlockLetter(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  ch: string,
  color: number,
): void {
  const blocks: Record<string, number[][]> = {
    E: [[0,0],[0,1],[0,2],[1,0],[2,0],[2,1],[3,0],[3,1],[3,2]],
    L: [[0,0],[0,1],[0,2],[1,2],[2,2],[3,2]],
    V: [[0,0],[0,1],[1,1],[2,2],[3,1],[3,0]],
    A: [[1,0],[0,1],[2,1],[0,2],[1,2],[2,2]],
    T: [[0,0],[1,0],[2,0],[1,1],[1,2]],
    O: [[0,1],[1,0],[2,1],[0,2],[1,2],[2,2]],
    R: [[0,0],[0,1],[0,2],[1,0],[2,0],[2,1],[3,1],[3,2]],
    C: [[1,0],[0,1],[0,2],[1,2],[2,2]],
    I: [[1,0],[1,1],[1,2]],
    N: [[0,0],[0,1],[0,2],[1,1],[2,0],[2,1],[2,2]],
  };
  g.fillStyle(color, 1);
  for (const [bx, by] of blocks[ch] ?? []) {
    g.fillRect(x + bx * 3, y + by * 3, 3, 3);
  }
}
