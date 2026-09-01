import { EXTRA_LIFE_SCORE, SCORES } from '../config/gameConfig';

export class ScoreManager {
  score = 0;
  private nextExtraLife = EXTRA_LIFE_SCORE;
  onExtraLife?: () => void;

  add(points: number): void {
    this.score += points;
    while (this.score >= this.nextExtraLife) {
      this.nextExtraLife += EXTRA_LIFE_SCORE;
      this.onExtraLife?.();
    }
  }

  shootEnemy(dark: boolean): void {
    this.add(dark ? SCORES.shootDark : SCORES.shoot);
  }

  jumpKickEnemy(dark: boolean): void {
    this.add(dark ? SCORES.jumpKickDark : SCORES.jumpKick);
  }

  lampKill(): void {
    this.add(SCORES.lampDrop);
  }

  crushKill(): void {
    this.add(SCORES.crush);
  }

  collectDocument(): void {
    this.add(SCORES.document);
  }

  levelComplete(level: number): number {
    const bonus = Math.min(level * 1000, 10000);
    this.add(bonus);
    return bonus;
  }

  reset(): void {
    this.score = 0;
    this.nextExtraLife = EXTRA_LIFE_SCORE;
  }
}
