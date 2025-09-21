import 'dotenv/config';
import { WebSocket } from 'ws';
import { AppDataSource } from './data-source';
import { WebSocketGateway } from './controllers/ws.gateway';
import { ReminderService } from './services/reminder.service';
import { ReminderRepository } from './repositories/reminder.repository';
import { Broadcaster } from './helpers/broadcaster';
import { BullmqScheduler } from './adapters/scheduler/bullmq.scheduler';

const PORT = Number(process.env.PORT || 8080);

await AppDataSource.initialize();
console.info('DB initialized');
const clients = new Set<WebSocket>();
const scheduler = new BullmqScheduler({ redisUrl: process.env.REDIS_URL! });
const broadcaster = new Broadcaster(clients);
const reminderRepository = new ReminderRepository();
const reminderService = new ReminderService(
  scheduler,
  broadcaster,
  reminderRepository,
);

await scheduler.start((id) => reminderService.onReminderDue(id));

const webSocketGateway = new WebSocketGateway(PORT, reminderService, clients);
await webSocketGateway.start();
console.info(`WS listening on ws://localhost:${PORT}`);

const pendingReminders = await reminderService.getPendingReminders();
if (pendingReminders && pendingReminders.length > 0) {
  const nextReminderToBeCalled = pendingReminders[0];
  console.log(`next reminder to be called is  ${nextReminderToBeCalled.name} (${nextReminderToBeCalled.id})`);
}

process.on('SIGINT', async () => { await webSocketGateway.stop(); process.exit(0) });
process.on('SIGTERM', async () => { await webSocketGateway.stop(); process.exit(0) });