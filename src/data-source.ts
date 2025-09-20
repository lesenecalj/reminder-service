import { DataSource } from 'typeorm'
import { Reminder } from './entities/reminder.entity';

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [Reminder],
  logging: false,
  synchronize: true
});
