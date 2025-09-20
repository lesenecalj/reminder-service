import { z } from 'zod';
import { Reminder } from "../entities/reminder.entity";
export interface Clock { now(): Date };

export interface Schedulable extends Reminder {
  id: string;
  at: Date;
}

export interface inputReminderDto {
  name: string;
  atIso: string;
};

export type ReminderStatus = 'PENDING' | 'FIRED';

export const AddReminderSchema = z.object({
  name: z.string().min(1).max(256),
  atIso: z.string().datetime(),
});