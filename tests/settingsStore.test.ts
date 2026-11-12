// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { initialAppState, serializeBackup, type AppState } from '@tasmate/core';
import { useAppStore } from '../src/stores/appStore';

const NOW = new Date('2026-11-12T09:30:00.000Z');

function makeTask(): AppState['tasks'][number] {
  return {
    id: 'task-settings',
    title: '設定画面の確認',
    description: '',
    category: '勉強',
    estimatedMinutes: 25,
    scheduledDate: '2026-11-12',
    status: 'planned',
    createdAt: '2026-11-12T08:00:00.000Z',
    updatedAt: '2026-11-12T08:00:00.000Z',
  };
}

function resetStore(): void {
  window.localStorage.clear();
  useAppStore.setState({ ...initialAppState() });
}

describe('設定ストア', () => {
  beforeEach(resetStore);

  it('バックアップを復元するとタスクと設定が置き換わる', () => {
    const source = initialAppState();
    source.tasks = [makeTask()];
    source.settings = { lastBackupAt: '2026-01-01T00:00:00.000Z' };

    const result = useAppStore
      .getState()
      .importAppState(serializeBackup(source, NOW));

    expect(result.ok).toBe(true);
    const state = useAppStore.getState();
    expect(state.tasks[0]?.title).toBe('設定画面の確認');
    expect(state.activeSession).toBeNull();
    expect(state.settings.lastBackupAt).toBe(NOW.toISOString());
  });

  it('不正なバックアップでは状態を変更しない', () => {
    useAppStore.setState({ tasks: [makeTask()] });

    const result = useAppStore.getState().importAppState('not json');

    expect(result.ok).toBe(false);
    expect(useAppStore.getState().tasks[0]?.id).toBe('task-settings');
  });

  it('最終バックアップ日時を記録し、不正な日時は無視する', () => {
    useAppStore.getState().markBackupExported(NOW.toISOString());
    expect(useAppStore.getState().settings.lastBackupAt).toBe(NOW.toISOString());

    useAppStore.getState().markBackupExported('invalid');
    expect(useAppStore.getState().settings.lastBackupAt).toBe(NOW.toISOString());
  });

  it('リセットで設定も初期状態に戻す', () => {
    useAppStore.setState({
      tasks: [makeTask()],
      settings: { lastBackupAt: NOW.toISOString() },
    });

    useAppStore.getState().resetAll();

    expect(useAppStore.getState().tasks).toEqual([]);
    expect(useAppStore.getState().settings).toEqual({ lastBackupAt: null });
  });
});
