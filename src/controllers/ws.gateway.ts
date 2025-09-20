import { WebSocket, WebSocketServer } from 'ws';
import { Scheduler } from '../helpers/scheduler';
import { ReminderService } from '../services/reminder.service';

export class WebSocketGateway {
  private wss?: WebSocketServer
  private readonly clients = new Set<WebSocket>();
  private readonly scheduler: Scheduler;
  private readonly reminderService: ReminderService;

  constructor(
    private readonly port: number,
    reminderService: ReminderService,
    scheduler: Scheduler,
    clients: Set<WebSocket>,
  ) {
    this.reminderService = reminderService;
    this.scheduler = scheduler;
    this.clients = clients;
  }

  async start() {
    this.wss = new WebSocketServer({ port: this.port })

    this.wss.on('connection', (ws) => {
      this.clients.add(ws);
      ws.on('close', () => this.clients.delete(ws));
      ws.on('error', () => this.clients.delete(ws));

      ws.on('message', async (buf) => {
        try {
          const msg = JSON.parse(String(buf));
          if (msg?.type === 'C2S_ADD_REMINDER') {
            const { name, at } = msg.payload ?? {};
            const rem = await this.reminderService.addReminder({ name, atIso: at });
            ws.send(JSON.stringify({
              type: 'S2C_REMINDER_ADDED',
              payload: { id: rem.id, name: rem.name, at: new Date(rem.at).toISOString() },
            }));
          } else {
            ws.send(JSON.stringify({ type: 'ERROR', payload: { code: 'UNKNOWN_TYPE', message: 'Unsupported message type' } }));
          }
        } catch (e: any) {
          ws.send(JSON.stringify({ type: 'ERROR', payload: { code: e.code ?? 'SERVER_ERROR', message: e.message ?? 'Unknown error' } }));
        }
      })
    })

    await this.reminderService.getPendingReminder();
  }

  async stop() {
    if ((this.scheduler as any).clearTimer) (this.scheduler as any).clearTimer();

    for (const ws of this.clients) try { ws.close() } catch { }
    this.clients.clear();

    await new Promise<void>((resolve) => this.wss?.close(() => resolve()));
    this.wss = undefined;
  }

  get address() {
    return this.wss?.address();
  }
}