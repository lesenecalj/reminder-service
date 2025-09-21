import { Repository } from 'typeorm';
import { Reminder } from '../entities/reminder.entity';
import { AppDataSource } from '../data-source';
import { ReminderStatus } from '../types';

export class ReminderRepository {
  private repo: Repository<Reminder>;

  constructor() {
    this.repo = AppDataSource.getRepository(Reminder);
  }

  async insertIfNotExists(data: { name: string; at: Date }): Promise<Reminder | null> {
    const qb = this.repo.createQueryBuilder()
      .insert()
      .into(Reminder)
      .values([{ name: data.name, at: data.at, status: 'PENDING' }])
      .onConflict(`(name) WHERE status = 'PENDING' DO NOTHING`)
      .returning('*');

    const res = await qb.execute();
    return (res.generatedMaps[0] as Reminder) ?? null;
  }

  async getPendingByName(name: string) {
    return this.repo.findOne({ where: { name, status: 'PENDING' } });
  }

  async list(status: ReminderStatus) {
    return this.repo.find({
      where: { status },
      order: { at: 'ASC' }
    });
  }

  async setFiredStatus(id: string, at: Date): Promise<Reminder> {
    const qb = this.repo
      .createQueryBuilder()
      .update(Reminder)
      .set({ status: 'FIRED', fired_at: at })
      .where('id = :id AND status = :status', { id, status: 'PENDING' })
      .returning('*');

    const res = await qb.execute();
    return (res.raw[0] as Reminder) ?? null;
  }
}