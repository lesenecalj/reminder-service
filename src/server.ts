import 'dotenv/config';
import { WebSocket } from 'ws';
import { BullmqScheduler } from './adapters/scheduler/bullmq.scheduler';
import { WebSocketGateway } from './controllers/ws.gateway';
import { AppDataSource } from './data-source';
import { Broadcaster } from './helpers/broadcaster';
import { ReminderRepository } from './repositories/reminder.repository';
import { ReminderService } from './services/reminder.service';
import { shutdown } from './helpers/shutdown';

const PORT = Number(process.env.PORT || 8080);
async function main() {
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
  await reminderService.bootstrap();

  const webSocketGateway = new WebSocketGateway(PORT, reminderService, clients);
  await webSocketGateway.start();
  console.info(`WS listening on ws://localhost:${PORT}`);

  process.on('SIGINT', async () => { shutdown(webSocketGateway, scheduler, 'SIGINT') });
  process.on('SIGTERM', async () => { shutdown(webSocketGateway, scheduler, 'SIGTERM') });
}

main().catch((err) => {
  console.error('Fatal server error', err);
  process.exit(1);
})