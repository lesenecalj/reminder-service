import { Reminder } from '../entities/reminder.entity';
import { Broadcaster } from '../helpers/broadcaster';
import { Scheduler } from '../helpers/scheduler';
import { ReminderRepository } from '../repositories/reminder.repository';
import { AddReminderSchema } from '../schemas';
import { Clock, CreateReminderInput, CreateReminderOutput } from '../types';

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

  async getPendingReminders(): Promise<Reminder[]> {
    const pendingReminders = await this.reminderRepo.list('PENDING');
    this.scheduler.load(pendingReminders);
    return pendingReminders;
  }

  async addReminder(input: CreateReminderInput): Promise<CreateReminderOutput> {
    const { name, atIso } = AddReminderSchema.parse(input);
    const at = new Date(atIso);
    const now = this.clock.now();

    if (Number.isNaN(at.getTime()) || at.getTime() <= now.getTime()) {
      throw new Error("'at' must be a future ISO timestamp.");
    }

    const created = await this.reminderRepo.insertIfNotExists({ name, at });
    if (created) {
      this.scheduler.push(created);
      return { reminder: created, created: true };
    }

    const existing = await this.reminderRepo.getPendingByName(name);
    if (!existing) {
      throw new Error('Inconsistent state after insertIfNotExists');
    }
    console.info(`[ReminderService][addReminder]: return reminder already created with name="${existing.name}" (${existing.id})`);
    return { reminder: existing, created: false };
  }

  async onReminderDue(reminder: Reminder) {
    console.info(`[ReminderService][onReminderDue]: set 'FIRED' status on reminder: ${reminder.id} ${reminder.name}`);
    const now = this.clock.now();
    await this.reminderRepo.setFiredStatus(reminder.id, now);
    this.broadcaster.reminderFired({
      id: reminder.id,
      name: reminder.name,
      atIso: new Date(reminder.at).toISOString(),
      firedAtIso: new Date(now).toISOString()
    })
  }
}
