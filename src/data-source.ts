import { DataSource } from 'typeorm'
import { Reminder } from './entities/reminder.entity';

export const AppDataSource = new DataSource({
  type: 'sqlite',
  database: process.env.DB_PATH || './data/reminders.db',
  entities: [Reminder],
  logging: false,
  synchronize: true
});
