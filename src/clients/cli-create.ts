import 'dotenv/config';
import WebSocket from 'ws';
import { waitOpen, attachReminderEvents } from './ws.handler.js';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

const WS_URL = process.env.WS_URL;

if (!WS_URL) {
  console.error('process.env.WS_URL should be defined.');
  process.exit(1);
}

async function main() {
  const rl = createInterface({ input, output });
  const name = await rl.question('nom du rappel:');
  if (!name) {
    console.error('Le nom ne peut pas être vide.');
    process.exit(1);
  }
  const secRaw = await rl.question('Délai (en secondes):');
  const seconds = Number(secRaw);
  if (!Number.isInteger(seconds) || seconds <= 0) {
    console.error('Merci d’indiquer un entier > 0.');
    process.exit(1);
  }
  await rl.close();

  const ws = new WebSocket(WS_URL!);
  await waitOpen(ws);
  attachReminderEvents(ws, { exitOnFire: true });

  const at = new Date(Date.now() + seconds * 1000).toISOString();
  ws.send(
    JSON.stringify({
      type: 'C2S_ADD_REMINDER',
      payload: { name, at },
    }),
  );
  console.info(
    `Message envoyé (${name}) au server, programmé dans ${seconds}s (à ${at}).`,
  );
}

main().catch((err) => {
  console.error('Fatal CLI error:', err);
  process.exit(1);
});
