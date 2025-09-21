import { Queue, Worker, JobsOptions } from 'bullmq';
import IORedis from 'ioredis';

export interface IScheduler {
  start(onFire: (id: string) => Promise<void> | void): Promise<void> | void;
  push(job: { id: string; at: Date }): Promise<void> | void;
  load(jobs: { id: string; at: Date }[]): Promise<void> | void;
  clear?(): Promise<void> | void;
  close?(): Promise<void> | void;
}

type Cfg = { redisUrl: string; queueName?: string };

export class BullmqScheduler implements IScheduler {
  private queue: Queue;
  private worker?: Worker;

  constructor(private readonly cfg: Cfg) {
    const connection = new IORedis(cfg.redisUrl, { maxRetriesPerRequest: null });
    this.queue = new Queue(cfg.queueName ?? 'reminders', { connection });
  }

  async start(onFire: (id: string) => Promise<void>) {
    const connection = new IORedis(this.cfg.redisUrl, { maxRetriesPerRequest: null });

    this.worker = new Worker(
      this.queue.name,
      async (job) => {
        if (job.id) await onFire(job.id);
      },
      { connection }
    );

    this.worker.on('failed', (job, err) => {
      console.error('[BullmqScheduler] job failed', { id: job?.id, err: err?.message });
    });
  }

  async push(job: { id: string; at: Date }) {
    const delay = Math.max(0, job.at.getTime() - Date.now());
    const opts: JobsOptions = {
      delay,
      jobId: job.id,
      removeOnComplete: true,
      removeOnFail: 100
    };
    await this.queue.add(job.id, {}, opts);
  }

  async load(jobs: { id: string; at: Date }[]) {
    console.info('loading jobs', JSON.stringify(jobs, null, 2));
    await Promise.all(jobs.map(j => this.push(j)));
  }

  async clear() {
    await this.queue.drain(true);
  }

  async close() {
    await this.worker?.close();
    await this.queue.close();
  }
}