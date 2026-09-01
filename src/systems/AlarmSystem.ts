import { ALARM_ELEVATOR_LAG, ALARM_TIME_MS } from '../config/gameConfig';

export class AlarmSystem {
  elapsed = 0;
  active = false;
  onAlarm?: () => void;

  update(delta: number): void {
    if (this.active) return;
    this.elapsed += delta;
    if (this.elapsed >= ALARM_TIME_MS) {
      this.active = true;
      this.onAlarm?.();
    }
  }

  getElevatorSpeedMultiplier(): number {
    return this.active ? ALARM_ELEVATOR_LAG : 1;
  }

  getEnemyAggressionMultiplier(): number {
    return this.active ? 2 : 1;
  }

  reset(): void {
    this.elapsed = 0;
    this.active = false;
  }
}
