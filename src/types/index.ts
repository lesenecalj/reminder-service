import { z } from 'zod';

import { Reminder } from "../entities/reminder.entity";
import { FiredReminderPayloadWsSchema, ReminderPayloadWsSchema } from '../schemas';
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

export type ReminderPayload = z.infer<typeof ReminderPayloadWsSchema>;
export type FiredReminderPayload = z.infer<typeof FiredReminderPayloadWsSchema>;