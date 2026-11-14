import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Task } from '@tasmate/types';
import {
  createAppStore,
  initialAppState,
  normalizeAppState,
  remainingEstimateSeconds,
  sessionElapsedSeconds,
  sessionTotalElapsedSeconds,
  toAppStateSnapshot,
} from '../packages/core/src/index';

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-interrupt',
    title: '中断テスト',
    description: '',
    category: '勉強',
    estimatedMinutes: 25,
    scheduledDate: '2026-11-13',
    status: 'planned',
    createdAt: '2026-11-13T00:00:00.000Z',
    updatedAt: '2026-11-13T00:00:00.000Z',
    ...overrides,
  };
}

function createStore(...tasks: Task[]) {
  return createAppStore({
    initialState: {
      ...initialAppState(),
      tasks,
      activeSession: null,
    },
  });
}

function segmentSeconds(sessionId: string, store: ReturnType<typeof createStore>): number {
  const session = store.getState().sessionHistory.find((item) => item.id === sessionId);
  if (session?.endedAt === undefined) return 0;
  return sessionElapsedSeconds(session, Date.parse(session.endedAt));
}

describe('中断・再開', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-13T00:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('タイマー式は中断時点の報酬を確定し、残り時間と累計時間を保持して再開する', () => {
    const store = createStore(makeTask());
    store.getState().startSession('task-interrupt', 'd-hills', ['c-hinata']);
    const firstSessionId = store.getState().activeSession?.id;
    expect(firstSessionId).toBeDefined();

    vi.advanceTimersByTime(10 * 60 * 1000);
    const firstRewardId = store.getState().interruptSession();
    const interrupted = store.getState();

    expect(firstRewardId).not.toBeNull();
    expect(interrupted.activeSession).toBeNull();
    expect(interrupted.tasks[0].status).toBe('interrupted');
    expect(interrupted.interruptedQuests).toHaveLength(1);
    expect(interrupted.interruptedQuests[0].elapsedSeconds).toBe(600);
    expect(segmentSeconds(firstSessionId ?? '', store)).toBe(600);
    expect(interrupted.sessionHistory[0].result).toBe('interrupted');
    expect(remainingEstimateSeconds(25, interrupted.interruptedQuests[0].elapsedSeconds)).toBe(
      900,
    );

    vi.advanceTimersByTime(5 * 60 * 1000);
    store.getState().resumeInterruptedQuest(interrupted.interruptedQuests[0].id);
    const resumed = store.getState();
    expect(resumed.activeSession?.carriedSeconds).toBe(600);
    expect(resumed.tasks[0].status).toBe('active');
    expect(resumed.interruptedQuests).toHaveLength(0);
    expect(sessionTotalElapsedSeconds(resumed.activeSession, Date.now())).toBe(600);

    vi.advanceTimersByTime(5 * 60 * 1000);
    const secondRewardId = store.getState().finishSession();
    const completed = store.getState();

    expect(secondRewardId).not.toBeNull();
    expect(completed.tasks[0].status).toBe('completed');
    expect(completed.interruptedQuests).toHaveLength(0);
    expect(completed.sessionHistory[0].result).toBe('completed');
    expect(completed.sessionHistory[0].carriedSeconds).toBe(600);
    expect(segmentSeconds(completed.sessionHistory[0].id, store)).toBe(300);
    expect(completed.rewards).toHaveLength(2);
  });

  it('ストップウォッチ式は中断時点の作業時間を保持し、完了時は再開後の時間だけを記録する', () => {
    const store = createStore(
      makeTask({ timerMode: 'stopwatch', estimatedMinutes: 0 }),
    );
    store.getState().startSession('task-interrupt', 'd-hills', ['c-hinata']);

    vi.advanceTimersByTime(8 * 60 * 1000);
    store.getState().interruptSession();
    const interrupted = store.getState();
    expect(interrupted.interruptedQuests[0].elapsedSeconds).toBe(480);
    expect(interrupted.tasks[0].status).toBe('interrupted');

    store.getState().resumeInterruptedQuest(interrupted.interruptedQuests[0].id);
    vi.advanceTimersByTime(4 * 60 * 1000);
    store.getState().finishSession();
    const completed = store.getState();

    expect(completed.sessionHistory[0].carriedSeconds).toBe(480);
    expect(segmentSeconds(completed.sessionHistory[0].id, store)).toBe(240);
    expect(completed.tasks[0].status).toBe('completed');
  });

  it('複数の中断クエストを保持し、別々に再開・破棄できる', () => {
    const store = createStore(
      makeTask({ id: 'task-a', title: 'A' }),
      makeTask({ id: 'task-b', title: 'B' }),
    );

    store.getState().startSession('task-a', 'd-hills', ['c-hinata']);
    vi.advanceTimersByTime(5 * 60 * 1000);
    store.getState().interruptSession();

    store.getState().startSession('task-b', 'd-hills', ['c-hinata']);
    vi.advanceTimersByTime(3 * 60 * 1000);
    store.getState().interruptSession();

    const both = store.getState();
    expect(both.interruptedQuests).toHaveLength(2);
    expect(both.tasks.map((task) => task.status)).toEqual(['interrupted', 'interrupted']);

    const taskBQuest = both.interruptedQuests.find((quest) => quest.taskId === 'task-b');
    expect(taskBQuest).toBeDefined();
    store.getState().resumeInterruptedQuest(taskBQuest?.id ?? '');
    expect(store.getState().interruptedQuests).toHaveLength(1);
    expect(store.getState().tasks.find((task) => task.id === 'task-a')?.status).toBe(
      'interrupted',
    );

    const taskAQuest = store.getState().interruptedQuests[0];
    store.getState().discardInterruptedQuest(taskAQuest.id);
    expect(store.getState().interruptedQuests).toHaveLength(0);
    expect(store.getState().tasks.find((task) => task.id === 'task-a')?.status).toBe('planned');
  });

  it('破棄しても確定済みの報酬は取り消さず、タスクを予定に戻す', () => {
    const store = createStore(makeTask());
    store.getState().startSession('task-interrupt', 'd-hills', ['c-hinata']);
    vi.advanceTimersByTime(4 * 60 * 1000);
    store.getState().interruptSession();
    const afterInterrupt = store.getState();

    store.getState().discardInterruptedQuest(afterInterrupt.interruptedQuests[0].id);
    const afterDiscard = store.getState();

    expect(afterDiscard.interruptedQuests).toHaveLength(0);
    expect(afterDiscard.tasks[0].status).toBe('planned');
    expect(afterDiscard.rewards).toHaveLength(afterInterrupt.rewards.length);
  });

  it('中断中のタスクは削除・直接開始できない', () => {
    const store = createStore(makeTask());
    store.getState().startSession('task-interrupt', 'd-hills', ['c-hinata']);
    store.getState().interruptSession();

    store.getState().deleteTask('task-interrupt');
    expect(store.getState().tasks[0].archivedAt).toBeUndefined();

    store.getState().startSession('task-interrupt', 'd-hills', ['c-hinata']);
    expect(store.getState().activeSession).toBeNull();
    expect(store.getState().interruptedQuests).toHaveLength(1);
  });

  it('中断中クエストを保存・正規化しても累計時間とスナップショットを維持する', () => {
    const store = createStore(makeTask());
    store.getState().startSession('task-interrupt', 'd-hills', ['c-hinata']);
    vi.advanceTimersByTime(6 * 60 * 1000);
    store.getState().interruptSession();
    const state = store.getState();

    const normalized = normalizeAppState(
      toAppStateSnapshot(state),
      new Date('2026-11-13T01:00:00.000Z'),
    );

    expect(normalized.interruptedQuests).toHaveLength(1);
    expect(normalized.interruptedQuests[0]).toMatchObject({
      taskId: 'task-interrupt',
      elapsedSeconds: 360,
      destinationId: 'd-hills',
      assignedCharacterIds: ['c-hinata'],
      taskTitleSnapshot: '中断テスト',
    });
    expect(normalized.tasks[0].status).toBe('interrupted');
  });
});
