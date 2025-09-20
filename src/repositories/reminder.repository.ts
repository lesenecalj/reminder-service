import { Repository } from 'typeorm';
import { Reminder, ReminderStatus } from '../entities/reminder.entity';
import { AppDataSource } from '../data-source';

export class ReminderRepository {
  private repo: Repository<Reminder>;

  constructor() {
    this.repo = AppDataSource.getRepository(Reminder);
  }

  async add(rem: Reminder) {
    return this.repo.save(rem);
  }

  async get(id: string) {
    return this.repo.findOne({ where: { id } });
  }

  async list(status: ReminderStatus) {
    return this.repo.find({
      where: { status },
      order: { at: 'ASC' }
    });
  }

  async setFiredStatus(id: string, at: Date) {
    await this.repo.update({ id }, { status: "FIRED", fired_at: at });
  }
}