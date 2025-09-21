import WebSocket from 'ws';
import { z } from "zod";
import { ReminderPayloadWsSchema, FiredReminderPayloadWsSchema, ReminderPayload, FiredReminderPayload } from '../schemas';

type WsPayloadSchemas =
  | typeof ReminderPayloadWsSchema
  | typeof FiredReminderPayloadWsSchema;

type wsPayload = ReminderPayload | FiredReminderPayload;

type AttachOptions = {
  exitOnFire?: boolean;
};

function validateWsPayload<T extends wsPayload>(
  schema: Extract<WsPayloadSchemas, z.ZodType<T>>, payload: z.ZodType<T>): T | null {
  const result = schema.safeParse(payload);
  if (!result.success) {
    console.error('Invalid payload:', result.error.format());
    return null;
  }
  return result.data;
}

export function attachReminderEvents(ws: WebSocket, { exitOnFire = true }: AttachOptions) {
  ws.on('message', (buf) => {
    let data;
    try {
      data = JSON.parse(buf.toString());
    } catch {
      console.error('Invalid Payload: JSON bad formatting');
      return;
    }

    if (data?.type === 'S2C_REMINDER_ADDED') {
      const payload = validateWsPayload(ReminderPayloadWsSchema, data.payload);
      if (!payload) return;
      console.warn(
        `Accusé de réception (created: ${payload.created}) (id:${payload.id}) pour le rappel: ${payload.name}.`,
      );
    }

    if (data?.type === 'S2C_REMINDER_FIRED') {
      const payload = validateWsPayload(
        FiredReminderPayloadWsSchema,
        data.payload,
      );
      if (!payload) return;
      console.info(`Rappel déclenché (${payload.id}): ${payload.name}.`);
      if (exitOnFire) {
        try {
          console.info('Fermeture du client.');
          ws.close();
        } catch { }
        process.exit(0);
      } else {
        console.info('Connexion conservée (exitOnFire=false).');
      }
    }

    if (data?.type === 'ERROR') {
      console.error('Erreur serveur :', data.payload);
      try {
        ws.close();
      } catch { }
      process.exit(1);
    }
  });

  ws.on('error', (e) => {
    console.error('WS error:', e?.message ?? e);
    process.exit(1);
  });
}

export function waitOpen(ws: WebSocket): Promise<void> {
  if (ws.readyState === WebSocket.OPEN) return Promise.resolve();
  return new Promise((resolve, reject) => {
    ws.once('open', resolve);
    ws.once('error', reject);
  });
}
