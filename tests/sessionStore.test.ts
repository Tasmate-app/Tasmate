// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { initialAppState } from '../src/services/appState';
import { useAppStore } from '../src/stores/appStore';
import type { Task } from '../src/types/index';

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    title: 'テストタスク',
    description: '',
    category: '勉強',
    estimatedMinutes: 25,
    scheduledDate: '2026-10-19',
    status: 'planned',
    createdAt: '2026-10-19T00:00:00.000Z',
    updatedAt: '2026-10-19T00:00:00.000Z',
    ...overrides,
  };
}

function resetStore(): void {
  window.localStorage.clear();
  useAppStore.setState({ ...initialAppState() });
}

describe('セッション開始のタスク検証', () => {
  beforeEach(resetStore);

  it('完了済みタスクではセッションを開始できない', () => {
    useAppStore.setState({ tasks: [makeTask({ status: 'completed' })] });

    useAppStore.getState().startSession('task-1', 'd-hills', ['c-hinata']);

    expect(useAppStore.getState().activeSession).toBeNull();
    expect(useAppStore.getState().tasks[0].status).toBe('completed');
  });

  it('アーカイブ済みタスクではセッションを開始できない', () => {
    useAppStore.setState({
      tasks: [makeTask({ archivedAt: '2026-10-20T00:00:00.000Z' })],
    });

    useAppStore.getState().startSession('task-1', 'd-hills', ['c-hinata']);

    expect(useAppStore.getState().activeSession).toBeNull();
  });

  it('予定中のタスクは開始でき、完了後は再開始できない', () => {
    useAppStore.setState({ tasks: [makeTask()] });

    useAppStore.getState().startSession('task-1', 'd-hills', ['c-hinata']);
    expect(useAppStore.getState().activeSession?.taskId).toBe('task-1');

    useAppStore.getState().finishSession('completed');
    expect(useAppStore.getState().tasks[0].status).toBe('completed');

    useAppStore.getState().startSession('task-1', 'd-hills', ['c-hinata']);
    expect(useAppStore.getState().activeSession).toBeNull();
  });
});
