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

export const ServerToClientSchema = z.union([
  z.object({ type: z.literal('S2C_REMINDER_ADDED'), payload: ReminderPayloadWsSchema }),
  z.object({ type: z.literal('S2C_REMINDER_FIRED'), payload: FiredReminderPayloadWsSchema }),
  z.object({ type: z.literal('ERROR'), payload: z.object({ code: z.string(), message: z.string() }) }),
]);

export type ReminderPayload = z.infer<typeof ReminderPayloadWsSchema>;
export type FiredReminderPayload = z.infer<typeof FiredReminderPayloadWsSchema>;
export type ServerToClientMessage = z.infer<typeof ServerToClientSchema>;