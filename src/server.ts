import { WebSocket } from 'ws';
import 'dotenv/config';
import { AppDataSource } from './data-source';
import { WebSocketGateway } from './controllers/ws.gateway';
import { ReminderService } from './services/reminder.service';
import { ReminderRepository } from './repositories/reminder.repository';
import { Scheduler } from './helpers/scheduler';
import { SystemClock } from './helpers/system.clock';
import { Broadcaster } from './helpers/broadcaster';

const PORT = Number(process.env.PORT || 8080);

await AppDataSource.initialize();
console.info('DB initialized');
const systemClock = new SystemClock();
const clients = new Set<WebSocket>();

const scheduler = new Scheduler(systemClock);
const broadcaster = new Broadcaster(clients);
const reminderRepository = new ReminderRepository();
const reminderService = new ReminderService(
  systemClock,
  scheduler,
  broadcaster,
  reminderRepository,
);

scheduler.setOnFire(r => { reminderService.onReminderDue(r); });

const webSocketGateway = new WebSocketGateway(PORT, reminderService, scheduler, clients);
await webSocketGateway.start();
console.info(`WS listening on ws://localhost:${PORT}`);

const pendingReminders = await reminderService.getPendingReminders();
if (pendingReminders && pendingReminders.length > 0) {
  const nextReminderToBeCalled = pendingReminders[0];
  console.log(`next reminder to be called is  ${nextReminderToBeCalled.name} (${nextReminderToBeCalled.id})`);
}

process.on('SIGINT', async () => { await webSocketGateway.stop(); process.exit(0) });
process.on('SIGTERM', async () => { await webSocketGateway.stop(); process.exit(0) });