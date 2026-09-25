import { Sound } from './core/audio';
import { InputManager, type Action } from './core/input';
import { renderPause, renderTitle, renderWorld } from './render/renderer';
import { SCREEN_H, SCREEN_W } from './sim/constants';
import { World, type Input } from './sim/world';

const STEP = 1000 / 60;
const HI_KEY = 'ea-hiscore';

function loadHiScore(): number {
  try {
    return Number(localStorage.getItem(HI_KEY)) || 10000;
  } catch {
    return 10000;
  }
}

function saveHiScore(score: number): void {
  try {
    localStorage.setItem(HI_KEY, String(score));
  } catch {
    /* storage unavailable */
  }
}

class Game {
  private mode: 'title' | 'play' = 'title';
  private world: World | null = null;
  private paused = false;
  private frame = 0;
  private hiScore = loadHiScore();

  constructor(
    private ctx: CanvasRenderingContext2D,
    private input: InputManager,
    private sound: Sound,
  ) {}

  update(): void {
    this.frame++;
    const { held, pressed } = this.input.poll();
    if (pressed.has('mute')) this.sound.toggleMute();

    if (this.mode === 'title') {
      if (pressed.has('start') || pressed.has('fire')) {
        this.sound.play('select');
        this.world = new World({ hiScore: this.hiScore });
        this.mode = 'play';
        this.paused = false;
      }
      return;
    }

    const w = this.world!;
    if (pressed.has('pause')) this.paused = !this.paused;
    if (this.paused) return;

    const frameInput: Input = {
      left: held.has('left'),
      right: held.has('right'),
      up: held.has('up'),
      down: held.has('down'),
      fire: pressed.has('fire'),
      jump: pressed.has('jump'),
    };
    w.step(frameInput);
    for (const e of w.events) this.sound.play(e);

    if (w.hiScore > this.hiScore) {
      this.hiScore = w.hiScore;
      saveHiScore(this.hiScore);
    }
    const skip = w.status === 'gameover' && (pressed.has('start') || w.statusT <= 0);
    if (skip) {
      this.mode = 'title';
      this.world = null;
    }
  }

  render(): void {
    if (this.mode === 'title' || !this.world) {
      renderTitle(this.ctx, this.frame, this.hiScore, this.sound.muted, document.body.classList.contains('touch'));
      return;
    }
    renderWorld(this.ctx, this.world);
    if (this.paused) renderPause(this.ctx);
  }

  /** Exposed for automated play-testing from the browser console. */
  get debugWorld(): World | null {
    return this.world;
  }
}

function fitCanvas(canvas: HTMLCanvasElement): void {
  const touch = document.body.classList.contains('touch');
  const availH = window.innerHeight * (touch ? 0.62 : 1);
  const scale = Math.min(window.innerWidth / SCREEN_W, availH / SCREEN_H);
  const s = scale >= 1 ? Math.floor(scale * 2) / 2 : scale;
  canvas.style.width = `${Math.floor(SCREEN_W * s)}px`;
  canvas.style.height = `${Math.floor(SCREEN_H * s)}px`;
}

function setupTouch(input: InputManager): void {
  const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  if (!isTouch) return;
  document.body.classList.add('touch');
  document.querySelectorAll<HTMLElement>('[data-action]').forEach((el) => {
    const actions = el.dataset.action!.split(' ') as Action[];
    const set = (down: boolean) => (ev: Event) => {
      ev.preventDefault();
      el.classList.toggle('active', down);
      for (const a of actions) input.setVirtual(a, down);
    };
    el.addEventListener('pointerdown', set(true));
    el.addEventListener('pointerup', set(false));
    el.addEventListener('pointercancel', set(false));
    el.addEventListener('pointerleave', set(false));
  });
}

function main(): void {
  const canvas = document.querySelector<HTMLCanvasElement>('#screen')!;
  canvas.width = SCREEN_W;
  canvas.height = SCREEN_H;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  const input = new InputManager(window);
  const sound = new Sound();
  input.onFirstInteraction = () => sound.unlock();
  setupTouch(input);

  const game = new Game(ctx, input, sound);
  (window as unknown as { game: Game }).game = game;

  fitCanvas(canvas);
  window.addEventListener('resize', () => fitCanvas(canvas));

  let last = performance.now();
  let acc = 0;
  const loop = (now: number) => {
    acc += Math.min(250, now - last);
    last = now;
    let steps = 0;
    while (acc >= STEP && steps < 5) {
      game.update();
      acc -= STEP;
      steps++;
    }
    if (steps === 5) acc = 0;
    game.render();
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}

main();
