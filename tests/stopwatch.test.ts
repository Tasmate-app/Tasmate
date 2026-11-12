// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { initialAppState, normalizeAppState, type AppState } from '../src/services/appState';
import { useAppStore } from '../src/stores/appStore';
import type { Task, WorkSession } from '../src/types/index';

function resetStore(): void {
  window.localStorage.clear();
  useAppStore.setState({ ...initialAppState() });
}

const stopwatchInput = {
  title: ' 数学の問題集 ',
  description: '応用問題',
  category: '',
};

describe('ストップウォッチ即時タスク', () => {
  beforeEach(resetStore);

  it('タスクを作成し、その場で計測を開始する', () => {
    const sessionId = useAppStore
      .getState()
      .startStopwatchTask(stopwatchInput, 'd-hills', ['c-hinata']);

    const state = useAppStore.getState();
    expect(sessionId).not.toBeNull();
    expect(state.activeSession?.id).toBe(sessionId);
    expect(state.activeSession?.timerMode).toBe('stopwatch');
    expect(state.activeSession?.taskId).toBe(state.tasks[0].id);
    expect(state.tasks[0]).toMatchObject({
      title: '数学の問題集',
      description: '応用問題',
      timerMode: 'stopwatch',
      estimatedMinutes: 0,
      status: 'active',
    });
    expect(state.tasks[0].scheduledDate).toBeUndefined();
    expect(state.tasks[0].startTime).toBeUndefined();
  });

  it('進行中の作業がある場合は新しい計測を開始しない', () => {
    const firstSessionId = useAppStore
      .getState()
      .startStopwatchTask(stopwatchInput, 'd-hills', ['c-hinata']);

    const secondSessionId = useAppStore
      .getState()
      .startStopwatchTask({ ...stopwatchInput, title: '別の作業' }, 'd-hills', ['c-hinata']);

    const state = useAppStore.getState();
    expect(secondSessionId).toBeNull();
    expect(state.tasks).toHaveLength(1);
    expect(state.activeSession?.id).toBe(firstSessionId);
  });

  it('キャラクター未選択ではタスクを作成しない', () => {
    const sessionId = useAppStore
      .getState()
      .startStopwatchTask(stopwatchInput, 'd-hills', []);

    const state = useAppStore.getState();
    expect(sessionId).toBeNull();
    expect(state.tasks).toHaveLength(0);
    expect(state.activeSession).toBeNull();
  });

  it('終了時にストップウォッチとして履歴へ記録する', () => {
    useAppStore.getState().startStopwatchTask(stopwatchInput, 'd-hills', ['c-hinata']);

    const rewardId = useAppStore.getState().finishSession('completed');

    const state = useAppStore.getState();
    expect(rewardId).not.toBeNull();
    expect(state.activeSession).toBeNull();
    expect(state.sessionHistory[0].timerMode).toBe('stopwatch');
    expect(state.tasks[0].status).toBe('completed');
  });
});

function makeLegacyState(tasks: Task[], sessionHistory: WorkSession[]): AppState {
  return {
    version: 1,
    tasks,
    sessionHistory,
    inventory: { currency: 0, materials: {} },
    characters: [],
    facilities: [],
    rewards: [],
    appliedRewardSessionIds: [],
  } as unknown as AppState;
}

const legacyTask = {
  id: 'task-stopwatch',
  title: '即時タスク',
  description: '',
  category: '勉強',
  estimatedMinutes: 30,
  timerMode: 'stopwatch',
  status: 'completed',
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
} as Task;

const legacySession = {
  id: 'session-stopwatch',
  taskId: legacyTask.id,
  startedAt: '2026-10-01T00:00:00.000Z',
  firstStartedAt: '2026-10-01T00:00:00.000Z',
  accumulatedSeconds: 120,
  state: 'idle',
  result: 'completed',
  endedAt: '2026-10-01T00:02:00.000Z',
  destinationId: 'd-hills',
  assignedCharacterIds: ['c-hinata'],
  taskTitleSnapshot: legacyTask.title,
} as WorkSession;

describe('ストップウォッチ形式の予定', () => {
  beforeEach(resetStore);

  it('予定日時を保持してストップウォッチ予定を作成する', () => {
    const taskId = useAppStore.getState().createTask({
      title: '英語の復習',
      description: '',
      category: '',
      estimatedMinutes: 30,
      timerMode: 'stopwatch',
      scheduledDate: '2026-11-20',
      startTime: '18:00',
      endTime: '19:00',
    });

    const task = useAppStore.getState().tasks.find((item) => item.id === taskId);
    expect(task).toMatchObject({
      timerMode: 'stopwatch',
      estimatedMinutes: 0,
      scheduledDate: '2026-11-20',
      startTime: '18:00',
      endTime: '19:00',
    });
    expect(task?.scheduledAt).toBeDefined();
  });
});

describe('ストップウォッチの保存データ正規化', () => {
  it('ストップウォッチタスクの予定時間を 0 にそろえる', () => {
    const normalized = normalizeAppState(
      makeLegacyState([legacyTask], [legacySession]),
      new Date(2026, 9, 23, 12),
    );

    expect(normalized.tasks[0].timerMode).toBe('stopwatch');
    expect(normalized.tasks[0].estimatedMinutes).toBe(0);
  });

  it('予定日時付きストップウォッチタスクの予定日時を保持する', () => {
    const scheduledTask = {
      ...legacyTask,
      estimatedMinutes: 45,
      scheduledDate: '2026-11-20',
      startTime: '18:00',
      endTime: '19:00',
    } as Task;
    const normalized = normalizeAppState(
      makeLegacyState([scheduledTask], [legacySession]),
      new Date(2026, 9, 23, 12),
    );

    expect(normalized.tasks[0]).toMatchObject({
      timerMode: 'stopwatch',
      estimatedMinutes: 0,
      scheduledDate: '2026-11-20',
      startTime: '18:00',
      endTime: '19:00',
    });
  });

  it('計測方式を持たない旧データは見積タイマーとして扱う', () => {
    const estimateTask = { ...legacyTask, timerMode: undefined, estimatedMinutes: 25 } as Task;
    const estimateSession = { ...legacySession, timerMode: undefined } as WorkSession;

    const normalized = normalizeAppState(
      makeLegacyState([estimateTask], [estimateSession]),
      new Date(2026, 9, 23, 12),
    );

    expect(normalized.tasks[0].timerMode).toBeUndefined();
    expect(normalized.tasks[0].estimatedMinutes).toBe(25);
    expect(normalized.sessionHistory[0].timerMode).toBeUndefined();
  });

  it('ストップウォッチセッションの計測方式を保持する', () => {
    const session = { ...legacySession, timerMode: 'stopwatch' } as WorkSession;
    const normalized = normalizeAppState(
      makeLegacyState([legacyTask], [session]),
      new Date(2026, 9, 23, 12),
    );

    expect(normalized.sessionHistory[0].timerMode).toBe('stopwatch');
  });
});
