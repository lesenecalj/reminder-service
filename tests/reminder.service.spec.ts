import { beforeEach, describe, expect, it, vi } from 'vitest';
import { IScheduler } from '../src/adapters/scheduler/bullmq.scheduler';
import { Broadcaster } from '../src/helpers/broadcaster';
import { ReminderRepository } from '../src/repositories/reminder.repository';
import { ReminderService } from '../src/services/reminder.service';
import { Reminder } from '../src/entities/reminder.entity';

describe('ReminderService.addReminder', () => {
  let repo: ReminderRepository;
  let scheduler: IScheduler;
  let broadcaster: Broadcaster;
  let service: ReminderService;
  const BASE_NOW = new Date('2030-01-01T12:00:00.000Z');

  beforeEach(() => {
    const insertIfNotExists = vi.fn<(data: { name: string; at: Date }) => Promise<Reminder | null>>();
    const getPendingByName = vi.fn<(name: string) => Promise<Reminder | null>>();

    const repoProp: any = {};
    const save = vi.fn();
    const get = vi.fn();
    const list = vi.fn();
    const listPending = vi.fn();
    const markFiredIfPending = vi.fn();
    const setFiredStatus = vi.fn();

    repo = {
      repo: repoProp,
      insertIfNotExists,
      getPendingByName,
      save,
      get,
      list,
      listPending,
      markFiredIfPending,
      setFiredStatus,
    } as unknown as ReminderRepository;

    scheduler = {
      start: vi.fn(),
      push: vi.fn(),
      load: vi.fn(),
    } as unknown as IScheduler;
    broadcaster = {
      send: vi.fn(),
      reminderFired: vi.fn(),
    } as unknown as Broadcaster;
    const clock = () => new Date(BASE_NOW);

    service = new ReminderService(scheduler, broadcaster, repo, clock) as any;

    if (typeof (service as any).attachScheduler === 'function') {
      (service as any).attachScheduler(scheduler);
    } else {
      (service as any).scheduler = scheduler;
    }
  });

  it('reject if name is empty', async () => {
    const atIso = new Date(BASE_NOW.getTime() + 60_000).toISOString();
    await expect(
      service.addReminder({ name: '', atIso })
    ).rejects.toThrow();
    expect(repo.insertIfNotExists).not.toHaveBeenCalled();
    expect(scheduler.push).not.toHaveBeenCalled();
  });

  it('reject if atIso is invalid', async () => {
    await expect(
      service.addReminder({ name: 'demo', atIso: 'not-a-date' })
    ).rejects.toThrow();
    expect(repo.insertIfNotExists).not.toHaveBeenCalled();
    expect(scheduler.push).not.toHaveBeenCalled();
  });

  it('reject if atIso is in the past', async () => {
    const atIsoPast = new Date(BASE_NOW.getTime() - 1000).toISOString();
    await expect(
      service.addReminder({ name: 'demo', atIso: atIsoPast })
    ).rejects.toThrow();
    expect(repo.insertIfNotExists).not.toHaveBeenCalled();
    expect(scheduler.push).not.toHaveBeenCalled();
  });

  it('first call, created=true, push scheduler', async () => {
    const at = new Date(BASE_NOW.getTime() + 60_000);
    const reminder: Reminder = {
      id: 'r1',
      name: 'demo',
      at,
      status: 'PENDING',
      created_at: BASE_NOW,
      fired_at: null,
    };

    (repo as any).insertIfNotExists.mockResolvedValueOnce(reminder);

    const res = await service.addReminder({ name: 'demo', atIso: at.toISOString() });

    expect(res.created).toBe(true);
    expect(res.reminder).toEqual(reminder);
    expect(repo.insertIfNotExists).toHaveBeenCalledTimes(1);
    expect(repo.getPendingByName).not.toHaveBeenCalled();
    expect(scheduler.push).toHaveBeenCalledTimes(1);
    expect(scheduler.push).toHaveBeenCalledWith(reminder);
  });

  it('second call with same name, created=false and no push', async () => {
    const at = new Date(BASE_NOW.getTime() + 60_000);
    const existing: Reminder = {
      id: 'r1',
      name: 'demo',
      at,
      status: 'PENDING',
      created_at: BASE_NOW,
      fired_at: null,
    };

    (repo as any).insertIfNotExists.mockResolvedValueOnce(null);
    (repo as any).getPendingByName.mockResolvedValueOnce(existing);

    const res = await service.addReminder({ name: 'demo', atIso: at.toISOString() });

    expect(res.created).toBe(false);
    expect(res.reminder).toEqual(existing);
    expect(repo.insertIfNotExists).toHaveBeenCalledTimes(1);
    expect(repo.getPendingByName).toHaveBeenCalledWith('demo');
    expect(scheduler.push).not.toHaveBeenCalled();
  });
});