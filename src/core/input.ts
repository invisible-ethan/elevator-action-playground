export type Action = 'left' | 'right' | 'up' | 'down' | 'fire' | 'jump' | 'start' | 'pause' | 'mute';

const KEYMAP: Record<string, Action> = {
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
  ArrowUp: 'up',
  KeyW: 'up',
  ArrowDown: 'down',
  KeyS: 'down',
  KeyZ: 'fire',
  KeyJ: 'fire',
  Space: 'fire',
  KeyX: 'jump',
  KeyK: 'jump',
  Enter: 'start',
  KeyP: 'pause',
  Escape: 'pause',
  KeyM: 'mute',
};

/**
 * Collects keyboard, gamepad and touch input. `held` is the live state; `pressed` records
 * buttons that went down since the last `poll()` so a quick tap is never lost between frames.
 */
export class InputManager {
  private held = new Set<Action>();
  private pressed = new Set<Action>();
  private virtualHeld = new Set<Action>();
  private padPrev = new Set<Action>();
  onFirstInteraction: (() => void) | null = null;

  constructor(target: Window) {
    target.addEventListener('keydown', (e) => {
      const action = KEYMAP[e.code];
      this.interacted();
      if (!action) return;
      e.preventDefault();
      if (!e.repeat) this.press(action);
      this.held.add(action);
    });
    target.addEventListener('keyup', (e) => {
      const action = KEYMAP[e.code];
      if (action) this.held.delete(action);
    });
    target.addEventListener('blur', () => this.held.clear());
    target.addEventListener('pointerdown', () => this.interacted());
  }

  private interacted(): void {
    if (this.onFirstInteraction) {
      this.onFirstInteraction();
      this.onFirstInteraction = null;
    }
  }

  private press(action: Action): void {
    this.pressed.add(action);
  }

  /** Used by the on-screen touch controls. */
  setVirtual(action: Action, down: boolean): void {
    this.interacted();
    if (down) {
      if (!this.virtualHeld.has(action)) this.press(action);
      this.virtualHeld.add(action);
    } else {
      this.virtualHeld.delete(action);
    }
  }

  private pollGamepad(): Set<Action> {
    const out = new Set<Action>();
    const pads = typeof navigator !== 'undefined' && navigator.getGamepads ? navigator.getGamepads() : [];
    for (const pad of pads) {
      if (!pad) continue;
      const b = (i: number) => !!pad.buttons[i]?.pressed;
      const ax = pad.axes[0] ?? 0;
      const ay = pad.axes[1] ?? 0;
      if (b(14) || ax < -0.5) out.add('left');
      if (b(15) || ax > 0.5) out.add('right');
      if (b(12) || ay < -0.5) out.add('up');
      if (b(13) || ay > 0.5) out.add('down');
      if (b(0) || b(2)) out.add('fire');
      if (b(1) || b(3)) out.add('jump');
      if (b(9)) out.add('start');
      if (b(8)) out.add('pause');
    }
    for (const a of out) if (!this.padPrev.has(a)) this.press(a);
    this.padPrev = out;
    return out;
  }

  poll(): { held: Set<Action>; pressed: Set<Action> } {
    const pad = this.pollGamepad();
    const held = new Set<Action>([...this.held, ...this.virtualHeld, ...pad]);
    const pressed = this.pressed;
    this.pressed = new Set();
    return { held, pressed };
  }
}
