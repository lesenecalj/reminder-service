import { beforeEach, describe, expect, it, vi } from 'vitest';
import { IScheduler } from '../src/adapters/scheduler/bullmq.scheduler';
import { Reminder } from '../src/entities/reminder.entity';
import { ReminderRepository } from '../src/repositories/reminder.repository';
import { ReminderService } from '../src/services/reminder.service';
import { Broadcaster } from '../src/helpers/broadcaster';

describe('ReminderService', () => {
  let repo: ReminderRepository;
  let scheduler: IScheduler;
  let broadcaster: Broadcaster;
  let service: ReminderService;

  const FIXED_NOW = new Date('2030-01-01T12:00:00.000Z');
  const clock = () => new Date(FIXED_NOW);

  beforeEach(() => {
    const insertIfNotExists = vi.fn<(data: { name: string; at: Date }) => Promise<Reminder | null>>();
    const getPendingByName = vi.fn<(name: string) => Promise<Reminder | null>>();
    const setFiredStatus = vi.fn<(id: string, at: Date) => Promise<Reminder | null>>();
    const list = vi.fn<(status: 'PENDING' | 'FIRED') => Promise<Reminder[]>>();

    const repoProp: any = {};
    const save = vi.fn();
    const get = vi.fn();
    const listPending = vi.fn();
    const markFiredIfPending = vi.fn();

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
      load: vi.fn(async (_items: any[]) => { }),
      push: vi.fn(async (_r: any) => { }),
    } as unknown as IScheduler;

    broadcaster = {
      send: vi.fn(),
      reminderFired: vi.fn(),
    } as unknown as Broadcaster;

    service = new ReminderService(scheduler, broadcaster, repo, clock) as any;

    (service as any).attachScheduler?.(scheduler);
  });

  describe('addReminder', () => {
    it('should reject when name is empty', async () => {
      // Arrange
      const atIso = new Date(FIXED_NOW.getTime() + 60_000).toISOString();

      // Act + Assert
      await expect(service.addReminder({ name: '', atIso })).rejects.toThrow();
      expect(repo.insertIfNotExists).not.toHaveBeenCalled();
      expect(scheduler.push).not.toHaveBeenCalled();
    });

    it('should reject when atIso is invalid', async () => {
      await expect(service.addReminder({ name: 'demo', atIso: 'not-a-date' })).rejects.toThrow();
      expect(repo.insertIfNotExists).not.toHaveBeenCalled();
      expect(scheduler.push).not.toHaveBeenCalled();
    });

    it('should reject when atIso is in the past', async () => {
      const past = new Date(FIXED_NOW.getTime() - 1_000).toISOString();
      await expect(service.addReminder({ name: 'demo', atIso: past })).rejects.toThrow();
      expect(repo.insertIfNotExists).not.toHaveBeenCalled();
      expect(scheduler.push).not.toHaveBeenCalled();
    });

    it('should set created=true and push into scheduler on first call', async () => {
      // Arrange
      const at = new Date(FIXED_NOW.getTime() + 60_000);
      const reminder: Reminder = {
        id: 'r1',
        name: 'demo',
        at,
        status: 'PENDING',
        created_at: FIXED_NOW,
        fired_at: null,
      };
      (repo as any).insertIfNotExists.mockResolvedValueOnce(reminder);

      // Act
      const res = await service.addReminder({ name: 'demo', atIso: at.toISOString() });

      // Assert
      expect(res.created).toBe(true);
      expect(res.reminder).toEqual(reminder);
      expect(repo.insertIfNotExists).toHaveBeenCalledTimes(1);
      expect(repo.getPendingByName).not.toHaveBeenCalled();
      expect(scheduler.push).toHaveBeenCalledTimes(1);
      expect(scheduler.push).toHaveBeenCalledWith(reminder);
    });

    it('should set created=false and not push when same name already pending', async () => {
      // Arrange
      const at = new Date(FIXED_NOW.getTime() + 60_000);
      const existing: Reminder = {
        id: 'r1',
        name: 'demo',
        at,
        status: 'PENDING',
        created_at: FIXED_NOW,
        fired_at: null,
      };
      (repo as any).insertIfNotExists.mockResolvedValueOnce(null);
      (repo as any).getPendingByName.mockResolvedValueOnce(existing);

      // Act
      const res = await service.addReminder({ name: 'demo', atIso: at.toISOString() });

      // Assert
      expect(res.created).toBe(false);
      expect(res.reminder).toEqual(existing);
      expect(repo.insertIfNotExists).toHaveBeenCalledTimes(1);
      expect(repo.getPendingByName).toHaveBeenCalledWith('demo');
      expect(scheduler.push).not.toHaveBeenCalled();
    });
  });

  describe('onReminderDue', () => {
    it('should set FIRED status then call broadcaster.reminderFired with ISO payload', async () => {
      // Arrange
      const fired: Reminder = {
        id: 'r1',
        name: 'demo',
        at: new Date('2030-01-01T12:05:00.000Z'),
        created_at: new Date('2030-01-01T12:00:00.000Z'),
        fired_at: FIXED_NOW,
        status: 'FIRED',
      } as Reminder;
      (repo as any).setFiredStatus.mockResolvedValueOnce(fired);

      // Act
      await service.onReminderDue('r1');

      // Assert
      expect(repo.setFiredStatus).toHaveBeenCalledTimes(1);
      expect(repo.setFiredStatus).toHaveBeenCalledWith('r1', FIXED_NOW);

      expect(broadcaster.reminderFired).toHaveBeenCalledTimes(1);
      const payload = (broadcaster.reminderFired as any).mock.calls[0][0];
      expect(payload).toMatchObject({
        id: 'r1',
        name: 'demo',
        atIso: fired.at.toISOString(),
        firedAtIso: FIXED_NOW.toISOString(),
      });
    });

    it('should not broadcast when reminder is already FIRED or not found', async () => {
      // Arrange
      (repo as any).setFiredStatus.mockResolvedValueOnce(null);

      // Act
      await service.onReminderDue('rX');

      // Assert
      expect(repo.setFiredStatus).toHaveBeenCalledWith('rX', FIXED_NOW);
      expect(broadcaster.reminderFired).not.toHaveBeenCalled();
    });
  });

  describe('bootstrap', () => {
    it('should call scheduler.load once with all PENDING reminders', async () => {
      // Arrange
      const r1 = { id: 'a', at: new Date(FIXED_NOW.getTime() + 10_000) } as any;
      const r2 = { id: 'b', at: new Date(FIXED_NOW.getTime() + 20_000) } as any;
      repo.list = vi.fn().mockResolvedValue([r1, r2]);
      const loadSpy = vi.spyOn(scheduler, 'load').mockResolvedValue();

      // Act
      await service.bootstrap();

      // Assert
      expect(repo.list).toHaveBeenCalledWith('PENDING');
      expect(loadSpy).toHaveBeenCalledTimes(1);
      expect(loadSpy).toHaveBeenCalledWith([r1, r2]);
    });
  });
});