// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { initialAppState } from '../src/services/appState';
import { useAppStore } from '../src/stores/appStore';
import type { RestSession, Task, WorkSession } from '../src/types/index';

function makeTask(): Task {
  return {
    id: 'task-1',
    title: 'テストタスク',
    description: '',
    category: '勉強',
    estimatedMinutes: 25,
    status: 'planned',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

function makeSession(overrides: Partial<WorkSession> = {}): WorkSession {
  return {
    id: 'session-1',
    taskId: 'task-1',
    startedAt: '2026-01-01T09:00:00.000Z',
    endedAt: '2026-01-01T09:25:00.000Z',
    accumulatedSeconds: 0,
    state: 'idle',
    result: 'completed',
    destinationId: 'd-hills',
    assignedCharacterIds: ['c-hinata'],
    ...overrides,
  };
}

function resetStore(): void {
  window.localStorage.clear();
  useAppStore.setState({ ...initialAppState() });
}

describe('休息・応援イベントのストア統合', () => {
  beforeEach(resetStore);

  it('休憩時間を有効範囲に丸めて開始する', () => {
    useAppStore.getState().startRest(0, 'session-1');
    expect(useAppStore.getState().restSession?.plannedMinutes).toBe(1);

    useAppStore.getState().startRest(90, 'session-1');
    expect(useAppStore.getState().restSession?.plannedMinutes).toBe(60);
  });

  it('設定時間が経過した休憩を一度だけ完了し、応援イベントを追加する', () => {
    const startedAt = new Date(Date.now() - 61_000).toISOString();
    const rest: RestSession = {
      id: 'rest-1',
      startedAt,
      plannedMinutes: 1,
      sourceSessionId: 'session-1',
      state: 'active',
    };
    useAppStore.setState({ restSession: rest, sessionHistory: [makeSession()] });

    useAppStore.getState().completeRest();
    const state = useAppStore.getState();
    expect(state.restSession?.state).toBe('completed');
    expect(state.supportEvents).toHaveLength(1);
    expect(state.supportEvents[0].kind).toBe('rest-complete');
    expect(state.supportEvents[0].seen).toBe(false);

    useAppStore.getState().completeRest();
    expect(useAppStore.getState().supportEvents).toHaveLength(1);
  });

  it('直前の作業から休憩なしで始めると連続作業の応援イベントを追加する', () => {
    const endedAt = new Date(Date.now() - 60_000).toISOString();
    useAppStore.setState({
      tasks: [makeTask()],
      sessionHistory: [makeSession({ endedAt })],
      restSession: null,
      supportEvents: [],
    });

    useAppStore.getState().startSession('task-1', 'd-hills', ['c-hinata']);
    const state = useAppStore.getState();
    expect(state.activeSession).not.toBeNull();
    expect(state.supportEvents).toHaveLength(1);
    expect(state.supportEvents[0].kind).toBe('consecutive-work');

    useAppStore.getState().acknowledgeSupportEvent(state.supportEvents[0].id);
    expect(useAppStore.getState().supportEvents[0].seen).toBe(true);
  });

  it('長時間の連続作業では同じセッションにつき一度だけ応援イベントを追加する', () => {
    const startedAt = new Date(Date.now() - 51 * 60_000).toISOString();
    useAppStore.setState({
      activeSession: makeSession({
        id: 'long-session',
        startedAt,
        endedAt: undefined,
        state: 'running',
        result: undefined,
      }),
      supportEvents: [],
    });

    useAppStore.getState().checkLongWorkSupport();
    expect(useAppStore.getState().supportEvents).toHaveLength(1);
    expect(useAppStore.getState().supportEvents[0].kind).toBe('long-work');

    useAppStore.getState().checkLongWorkSupport();
    expect(useAppStore.getState().supportEvents).toHaveLength(1);
  });
});
