import { Entity, Column, Index, CreateDateColumn, PrimaryGeneratedColumn } from 'typeorm'
import { ReminderStatus } from '../types';

@Index('uniq_pending_name', ['name'], { unique: true, where: "status = 'PENDING'" })
@Entity({ name: 'reminders' })
export class Reminder {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'text' })
  name!: string;

  @Column({ type: 'timestamptz' })
  at!: Date;

  @Column({ type: 'text' })
  status!: ReminderStatus;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @Column({ type: 'timestamptz', nullable: true, default: null })
  fired_at!: Date | null;
}