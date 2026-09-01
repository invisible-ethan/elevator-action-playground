export class AudioManager {
  private ctx: AudioContext | null = null;

  private getContext(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
    }
    return this.ctx;
  }

  playTone(freq: number, duration: number, type: OscillatorType = 'square', volume = 0.08): void {
    try {
      const ctx = this.getContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.value = volume;
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {
      // Audio may be blocked until user gesture
    }
  }

  shoot(): void {
    this.playTone(880, 0.06, 'square', 0.05);
  }

  jump(): void {
    this.playTone(330, 0.08, 'triangle', 0.06);
  }

  collect(): void {
    this.playTone(523, 0.1, 'square', 0.07);
    setTimeout(() => this.playTone(659, 0.1, 'square', 0.07), 80);
  }

  enemyHit(): void {
    this.playTone(200, 0.12, 'sawtooth', 0.06);
  }

  death(): void {
    this.playTone(180, 0.2, 'sawtooth', 0.08);
    setTimeout(() => this.playTone(120, 0.3, 'sawtooth', 0.08), 150);
  }

  alarm(): void {
    this.playTone(440, 0.15, 'square', 0.1);
    setTimeout(() => this.playTone(330, 0.15, 'square', 0.1), 200);
  }

  levelComplete(): void {
    [523, 659, 784, 1047].forEach((f, i) => {
      setTimeout(() => this.playTone(f, 0.15, 'square', 0.07), i * 120);
    });
  }
}
