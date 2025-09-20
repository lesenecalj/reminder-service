import { Clock, Schedulable } from '../lib/types';

export class Scheduler {
  private queue: Schedulable[] = [];
  private timer: NodeJS.Timeout | null = null;
  private onFire?: (s: Schedulable) => void;

  constructor(private readonly clock: Clock) { }

  setOnFire(fn: (r: Schedulable) => void) { this.onFire = fn; }

  load(reminders: Schedulable[]) {
    this.queue = reminders
      .filter(r => r.status === 'PENDING')
      .sort((a, b) => a.at.getTime() - b.at.getTime());
    this.reschedule();
  }

  push(rem: Schedulable) {
    const idx = this.queue.findIndex(r => r.at.getTime() > rem.at.getTime());
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

    while (this.queue.length && this.queue[0].at.getTime() <= now) {
      const due = this.queue.shift()!;
      if (this.onFire) this.onFire(due);
    }
    if (!this.queue.length) return;

    const next = this.queue[0];
    const delay = Math.max(0, next.at.getTime() - this.clock.now().getTime());
    this.timer = setTimeout(() => this.reschedule(), delay);
  }
}