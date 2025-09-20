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

  async getPendingReminder() {
    const pendingReminders = await this.reminderRepo.list('PENDING');
    this.scheduler.load(pendingReminders);
  }

  async addReminder(input: CreateReminderInput): Promise<CreateReminderOutput> {
    const { name, atIso } = AddReminderSchema.parse(input);
    const at = new Date(atIso);
    const now = this.clock.now();

    if (Number.isNaN(at.getTime()) || at.getTime() <= now.getTime()) {
      throw new Error("'at' must be a future ISO timestamp.");
    }

    const existing = await this.reminderRepo.getPendingByName(name);
    if (existing) {
      console.info(`[ReminderService][addReminder]: return reminder already created with name="${existing.name}" (${existing.id})`);
      return { reminder: existing, created: false };
    }

    try {
      const reminder = await this.reminderRepo.create({ name, at, status: 'PENDING' });
      const createdReminder = await this.reminderRepo.save(reminder);
      console.info(`[ReminderService][addReminder]: created reminder with name="${createdReminder.name}" (${createdReminder.id})`);
      this.scheduler.push(createdReminder);
      return { reminder: createdReminder, created: true };
    } catch (error: any) {
      if (error?.code === '23505') {
        const dup = await this.reminderRepo.getPendingByName(name);
        if (dup) return { reminder: dup, created: false };
      }
      throw error;
    }
  }

  private async fire(reminder: Reminder) {
    await this.reminderRepo.setFiredStatus(reminder.id, this.clock.now());
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
