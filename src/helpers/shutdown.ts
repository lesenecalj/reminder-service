import { IScheduler } from "../adapters/scheduler/bullmq.scheduler";
import { WebSocketGateway } from "../controllers/ws.gateway";
import { AppDataSource } from "../data-source";

export async function shutdown(webSocketGateway: WebSocketGateway, scheduler: IScheduler, signal: string) {
  console.info(`[server] Received ${signal}, shutting down...`);
  try {
    await webSocketGateway.stop();
    await scheduler.close?.();
    await AppDataSource.destroy();
    console.info('[server] Shutdown complete');
    process.exit(0);
  } catch (err) {
    console.error('[server] Error during shutdown', err);
    process.exit(1);
  }
}