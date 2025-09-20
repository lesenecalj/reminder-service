import { Entity, PrimaryColumn, Column, Index } from 'typeorm'

export type ReminderStatus = 'PENDING' | 'FIRED';

@Index('uniq_pending_name', ['name'], { unique: true, where: "status = 'PENDING'" })
@Entity({ name: 'reminders' })
export class Reminder {
  @PrimaryColumn({ type: 'text' })
  id!: string;

  @Column({ type: 'text' })
  name!: string;

  @Column({ type: 'timestamptz' })
  at!: Date;

  @Column({ type: 'text' })
  status!: ReminderStatus;

  @Column({ type: 'timestamptz' })
  created_at!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  fired_at!: Date | null;
}