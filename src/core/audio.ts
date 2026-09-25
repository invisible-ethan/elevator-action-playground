import type { WorldEvent } from '../sim/world';

type Wave = OscillatorType;

/** Tiny Web Audio synthesiser: every sound effect is generated, no assets required. */
export class Sound {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  muted = false;

  constructor() {
    try {
      this.muted = localStorage.getItem('ea-muted') === '1';
    } catch {
      /* storage unavailable */
    }
  }

  /** Browsers only allow audio after a user gesture, so this is called on the first key press. */
  unlock(): void {
    if (this.ctx) return;
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    this.ctx = new Ctor();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.35;
    this.master.connect(this.ctx.destination);
  }

  toggleMute(): void {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.35;
    try {
      localStorage.setItem('ea-muted', this.muted ? '1' : '0');
    } catch {
      /* storage unavailable */
    }
  }

  private tone(freq: number, to: number, dur: number, wave: Wave = 'square', vol = 0.3, delay = 0): void {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = wave;
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + dur);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain).connect(this.master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  private noise(dur: number, vol = 0.3, delay = 0, cutoff = 2000): void {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime + delay;
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = cutoff;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(filter).connect(gain).connect(this.master);
    src.start(t);
  }

  private melody(notes: number[], step: number, wave: Wave = 'square', vol = 0.2): void {
    notes.forEach((n, i) => {
      if (n > 0) this.tone(n, n, step * 0.9, wave, vol, i * step);
    });
  }

  play(event: WorldEvent | 'select'): void {
    switch (event) {
      case 'shoot':
        this.tone(1400, 300, 0.09, 'square', 0.18);
        break;
      case 'enemyShoot':
        this.tone(700, 160, 0.12, 'sawtooth', 0.15);
        break;
      case 'enemyDie':
        this.noise(0.18, 0.25);
        this.tone(500, 60, 0.3, 'triangle', 0.3);
        break;
      case 'crush':
        this.noise(0.35, 0.4, 0, 600);
        this.tone(200, 40, 0.35, 'square', 0.25);
        break;
      case 'playerDie':
        this.melody([784, 740, 698, 659, 622, 587, 554, 523, 494, 466, 440, 415], 0.07, 'square', 0.2);
        break;
      case 'doc':
        this.melody([523, 659, 784, 1047, 784, 1047], 0.07, 'square', 0.18);
        break;
      case 'allDocs':
        this.melody([0, 0, 0, 0, 0, 0, 784, 988, 1175, 1568], 0.08, 'triangle', 0.25);
        break;
      case 'door':
        this.tone(220, 180, 0.12, 'triangle', 0.2);
        break;
      case 'jump':
        this.tone(300, 700, 0.14, 'triangle', 0.18);
        break;
      case 'lamp':
        this.noise(0.4, 0.35, 0, 4000);
        this.tone(1800, 200, 0.25, 'square', 0.12);
        break;
      case 'alarm':
        for (let i = 0; i < 4; i++) {
          this.tone(600, 1200, 0.25, 'sawtooth', 0.12, i * 0.5);
          this.tone(1200, 600, 0.25, 'sawtooth', 0.12, i * 0.5 + 0.25);
        }
        break;
      case 'ding':
        this.tone(1320, 1320, 0.12, 'sine', 0.15);
        break;
      case 'clear':
        this.melody([523, 523, 659, 784, 0, 659, 784, 1047, 1047], 0.11, 'square', 0.2);
        this.melody([262, 0, 330, 0, 392, 0, 523, 0, 523], 0.11, 'triangle', 0.25);
        break;
      case 'extraLife':
        this.melody([1047, 1319, 1568, 2093, 1568, 2093], 0.06, 'square', 0.15);
        break;
      case 'warp':
        this.melody([659, 587, 523, 494, 440], 0.1, 'triangle', 0.25);
        break;
      case 'start':
        this.melody([392, 523, 659, 784, 659, 784, 1047], 0.09, 'square', 0.16);
        break;
      case 'gameOver':
        this.melody([523, 0, 392, 0, 330, 294, 262], 0.16, 'triangle', 0.3);
        break;
      case 'select':
        this.tone(880, 1760, 0.1, 'square', 0.15);
        break;
    }
  }
}
