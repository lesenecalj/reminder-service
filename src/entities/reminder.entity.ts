import { Entity, PrimaryColumn, Column } from 'typeorm'

export type ReminderStatus = 'PENDING' | 'FIRED';

@Entity({ name: 'reminders' })
export class Reminder {
  @PrimaryColumn({ type: 'text' })
  id!: string

  @Column({ type: 'text' })
  name!: string

  @Column({ type: 'integer' })
  at!: number

  @Column({ type: 'text' })
  status!: ReminderStatus

  @Column({ type: 'integer' })
  created_at!: number

  @Column({ type: 'integer', nullable: true })
  fired_at!: number | null
}