import { z } from 'zod';

export const AddReminderSchema = z.object({
  name: z.string().min(1).max(256),
  atIso: z.string().datetime(),
});

export const ReminderPayloadWsSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  at: z.string().datetime(),
  created: z.boolean(),
});

export const FiredReminderPayloadWsSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  atIso: z.string().datetime(),
  firedAtIso: z.string().datetime(),
});