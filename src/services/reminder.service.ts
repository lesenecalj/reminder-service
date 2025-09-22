import { IScheduler } from '../adapters/scheduler/bullmq.scheduler';
import { Reminder } from '../entities/reminder.entity';
import { Broadcaster } from '../helpers/broadcaster';
import { ReminderRepository } from '../repositories/reminder.repository';
import { AddReminderSchema } from '../schemas';
import { CreateReminderInput, CreateReminderOutput } from '../types';

export class ReminderService {
  constructor(
    private readonly scheduler: IScheduler,
    private readonly broadcaster: Broadcaster,
    private readonly reminderRepo: ReminderRepository,
    private readonly clock: () => Date = () => new Date(),
  ) { }

  async getPendingReminders(): Promise<Reminder[]> {
    return this.reminderRepo.list('PENDING');
  }

  async bootstrap() {
    const pendingReminders = await this.getPendingReminders();
    await this.scheduler.load(pendingReminders);
  }

  async addReminder(input: CreateReminderInput): Promise<CreateReminderOutput> {
    const { name, atIso } = AddReminderSchema.parse(input);
    const at = new Date(atIso);
    const now = this.clock();

    if (Number.isNaN(at.getTime()) || at.getTime() <= now.getTime()) {
      throw new Error("'at' must be a future ISO timestamp.");
    }

    const created = await this.reminderRepo.insertIfNotExists({ name, at });
    if (created && this.scheduler) {
      await this.scheduler.push(created);
      return { reminder: created, created: true };
    }

    const existing = await this.reminderRepo.getPendingByName(name);
    if (!existing) {
      throw new Error('Inconsistent state after insertIfNotExists');
    }
    console.info(`[ReminderService][addReminder]: return reminder already created with name="${existing.name}" (${existing.id})`);
    return { reminder: existing, created: false };
  }

  async onReminderDue(id: string) {
    const now = this.clock();
    const rem = await this.reminderRepo.setFiredStatus(id, now);
    if (!rem) return;
    console.info(`[ReminderService][onReminderDue]: set 'FIRED' status on reminder: ${rem.id} ${rem.name}`);
    this.broadcaster.reminderFired({
      id: rem.id,
      name: rem.name,
      atIso: new Date(rem.at).toISOString(),
      firedAtIso: new Date(now).toISOString()
    })
  }
}
