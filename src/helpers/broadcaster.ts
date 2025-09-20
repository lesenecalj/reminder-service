import type { WebSocket } from 'ws';

export class Broadcaster {
  constructor(private readonly clients: Set<WebSocket>) {}

  send(type: string, payload: any) {
    const msg = JSON.stringify({ type, payload });
    for (const ws of this.clients) {
      if (ws.readyState === ws.OPEN) ws.send(msg);
    }
  }

  reminderFired(p: { id: string; name: string; atIso: string; firedAtIso: string }) {
    this.send('S2C_REMINDER_FIRED', p);
  }
}