import { z } from 'zod';
import { randomUUID } from 'crypto';
import { Reminder } from '../entities/reminder.entity';
import { ReminderRepository } from '../repositories/reminder.repository';
import { Clock } from '../lib/types/clock';
import { Scheduler } from '../helpers/scheduler';
import { Broadcaster } from '../helpers/broadcaster';

const addInput = z.object({
  name: z.string().min(1).max(256),
  atIso: z.string().datetime(),
})

export class ReminderService {
  private readonly reminderRepo;
  private readonly scheduler;
  private readonly broadcaster;
  constructor(
    private clock: Clock,
    scheduler: Scheduler,
    broadcaster: Broadcaster,
    reminderRepository: ReminderRepository,
  ) {
    this.scheduler = scheduler;
    this.broadcaster = broadcaster;
    this.reminderRepo = reminderRepository;
  }

  async getPendingReminder() {
    const pendingReminders = await this.reminderRepo.list('PENDING');
    this.scheduler.load(pendingReminders);
  }

  async addReminder(input: { name: string; atIso: string }) {
    const { name, atIso } = addInput.parse(input);
    const at = Date.parse(atIso);
    const now = this.clock.now().getTime();
    if (Number.isNaN(at) || at <= now) {
      throw Object.assign(new Error("'at' must be a future ISO timestamp"), { code: 'INVALID_AT' });
    }
    const rem: Reminder = {
      id: 'rmd_' + randomUUID(),
      name,
      at,
      status: 'PENDING',
      created_at: now,
      fired_at: null
    };
    await this.reminderRepo.add(rem);
    this.scheduler.push(rem);
    return rem;
  }

  private async fire(reminder: Reminder) {
    const time = this.clock.now().getTime();
    await this.reminderRepo.markFired(reminder.id, time);
  }

  async onReminderDue(reminder: Reminder) {
    const ts = this.clock.now().getTime();
    await this.reminderRepo.markFired(reminder.id, ts);
    this.broadcaster.reminderFired({
      id: reminder.id,
      name: reminder.name,
      atIso: new Date(reminder.at).toISOString(),
      firedAtIso: new Date(ts).toISOString()
    })
  }
}
