import { Clock } from '../lib/types/clock';
import type { Reminder } from '../entities/reminder.entity';

export class Scheduler {
  private queue: Reminder[] = []
  private timer: NodeJS.Timeout | null = null
  private onFire?: (r: Reminder) => void;

  constructor(private readonly clock: Clock) { }

  setOnFire(fn: (r: Reminder) => void) { this.onFire = fn; }

  load(reminders: Reminder[]) {
    this.queue = reminders
      .filter(r => r.status === 'PENDING')
      .sort((a, b) => a.at - b.at);
    this.reschedule();
  }

  push(rem: Reminder) {
    const idx = this.queue.findIndex(r => r.at > rem.at);
    if (idx === -1) {
      this.queue.push(rem);
    } else {
      this.queue.splice(idx, 0, rem);
    }
    this.reschedule();
  }

  private clearTimer() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private reschedule() {
    this.clearTimer();
    const now = this.clock.now().getTime();

    while (this.queue.length && this.queue[0].at <= now) {
      const due = this.queue.shift()!;
      if (this.onFire) this.onFire(due);
    }
    if (!this.queue.length) return; 8

    const next = this.queue[0];
    const delay = Math.max(0, next.at - this.clock.now().getTime());
    this.timer = setTimeout(() => this.reschedule(), delay);
  }
}