import { Reminder } from "../entities/reminder.entity";

export interface Clock { now(): Date };

export interface Schedulable extends Reminder {
  id: string;
  at: Date;
}

export type CreateReminderInput = {
  name: string;
  atIso: string;
};

export type CreateReminderOutput = {
  reminder: Reminder;
  created: boolean;
};

export type ReminderStatus = 'PENDING' | 'FIRED';