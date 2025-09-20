import WebSocket from 'ws';
import { waitOpen, attachReminderEvents } from './ws.handler.js';

const WS_URL = 'ws://localhost:8080';

async function main() {
  const ws = new WebSocket(WS_URL);
  await waitOpen(ws);
  console.info(`Listening on ${WS_URL}`);
  attachReminderEvents(ws, { exitOnFire: false });
}

main().catch((err) => { console.error('Fatal listener error:', err); process.exit(1); });