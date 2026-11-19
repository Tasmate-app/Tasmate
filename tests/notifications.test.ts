import { describe, expect, it } from 'vitest';
import {
  buildTaskNotificationCandidates,
  createDefaultNotificationSettings,
  isTaskNotificationIdentifier,
  normalizeNotificationSettings,
} from '@tasmate/core';
import type { Task } from '@tasmate/types';

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    title: '英語の復習',
    description: '',
    category: '勉強',
    estimatedMinutes: 25,
    scheduledDate: '2026-11-16',
    startTime: '09:00',
    status: 'planned',
    createdAt: '2026-11-15T00:00:00.000Z',
    updatedAt: '2026-11-15T00:00:00.000Z',
    ...overrides,
  };
}

function localTime(dateKey: string, hour: number, minute: number): string {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day, hour, minute).toISOString();
}

describe('予定クエスト通知', () => {
  it('開始予定時刻に #44 の通知候補を作る', () => {
    const candidates = buildTaskNotificationCandidates(
      [makeTask()],
      createDefaultNotificationSettings(),
      new Date(2026, 10, 16, 8, 0),
    );

    expect(candidates).toHaveLength(2);
    const start = candidates[0];
    expect(start).toMatchObject({
      kind: 'task-start',
      taskId: 'task-1',
      scheduledDate: '2026-11-16',
      triggerAt: localTime('2026-11-16', 9, 0),
    });
    expect(start?.identifier).toBe('tasmate:task-start:task-1:2026-11-16');
    expect(isTaskNotificationIdentifier(start?.identifier ?? '')).toBe(true);
  });

  it('開始時刻が未設定なら既定時刻を使う', () => {
    const candidates = buildTaskNotificationCandidates(
      [makeTask({ startTime: undefined })],
      createDefaultNotificationSettings(),
      new Date(2026, 10, 16, 8, 0),
    );

    expect(candidates[0]).toMatchObject({
      kind: 'task-start',
      triggerAt: localTime('2026-11-16', 9, 0),
    });
    expect(candidates[1]).toMatchObject({
      kind: 'task-incomplete',
      triggerAt: localTime('2026-11-16', 9, 10),
    });
  });

  it('#45 は開始時刻＋猶予を過ぎた未完了クエストに作る', () => {
    const candidates = buildTaskNotificationCandidates(
      [
        makeTask({ id: 'planned', status: 'planned' }),
        makeTask({ id: 'interrupted', status: 'interrupted' }),
        makeTask({ id: 'active', status: 'active' }),
        makeTask({ id: 'completed', status: 'completed' }),
        makeTask({ id: 'cancelled', status: 'cancelled' }),
        makeTask({ id: 'archived', archivedAt: '2026-11-15T00:00:00.000Z' }),
      ],
      { ...createDefaultNotificationSettings(), taskStartEnabled: false },
      new Date(2026, 10, 16, 8, 0),
    );

    expect(candidates.map((candidate) => candidate.taskId).sort()).toEqual([
      'interrupted',
      'planned',
    ]);
    expect(candidates.every((candidate) => candidate.kind === 'task-incomplete')).toBe(
      true,
    );
    expect(candidates[0]?.triggerAt).toBe(localTime('2026-11-16', 9, 10));
  });

  it('通知時刻を過ぎた予定は予約しない', () => {
    const candidates = buildTaskNotificationCandidates(
      [
        makeTask({ id: 'started', startTime: '09:00' }),
        makeTask({ id: 'not-yet', startTime: '10:00' }),
      ],
      { ...createDefaultNotificationSettings(), incompleteReminderEnabled: false },
      new Date(2026, 10, 16, 9, 5),
    );

    expect(candidates.map((candidate) => candidate.taskId)).toEqual(['not-yet']);
    expect(candidates[0]?.kind).toBe('task-start');
  });

  it('通知全体が無効なら候補を作らない', () => {
    const candidates = buildTaskNotificationCandidates(
      [makeTask()],
      { ...createDefaultNotificationSettings(), enabled: false },
      new Date(2026, 10, 16, 8, 0),
    );

    expect(candidates).toEqual([]);
  });

  it('通知設定の不正値を補完する', () => {
    const settings = normalizeNotificationSettings({
      enabled: 'yes',
      taskStartEnabled: false,
      incompleteReminderEnabled: false,
      defaultStartTime: '9:00',
      incompleteDelayMinutes: 9999,
    });

    expect(settings).toEqual({
      enabled: true,
      taskStartEnabled: false,
      incompleteReminderEnabled: false,
      defaultStartTime: '09:00',
      incompleteDelayMinutes: 1440,
    });
  });

  it('予約数を上限までに抑え、近い順に採用する', () => {
    const tasks = Array.from({ length: 70 }, (_, index) => {
      const minute = index % 60;
      const hour = 9 + Math.floor(index / 60);
      return makeTask({
        id: `task-${index}`,
        startTime: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
      });
    });

    const candidates = buildTaskNotificationCandidates(
      tasks,
      { ...createDefaultNotificationSettings(), incompleteReminderEnabled: false },
      new Date(2026, 10, 16, 8, 0),
    );

    expect(candidates).toHaveLength(64);
    expect(candidates[0]?.taskId).toBe('task-0');
    expect(candidates[63]?.taskId).toBe('task-63');
  });
});
