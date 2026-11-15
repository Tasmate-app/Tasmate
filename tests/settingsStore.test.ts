// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { initialAppState, serializeBackup, type AppState } from '@tasmate/core';
import { createDefaultNavigationItems } from '@tasmate/core';
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
    source.settings = {
      lastBackupAt: '2026-01-01T00:00:00.000Z',
      tutorialCompletedAt: '2026-01-02T00:00:00.000Z',
      navigationItems: createDefaultNavigationItems(),
    };

    const result = useAppStore
      .getState()
      .importAppState(serializeBackup(source, NOW));

    expect(result.ok).toBe(true);
    const state = useAppStore.getState();
    expect(state.tasks[0]?.title).toBe('設定画面の確認');
    expect(state.activeSession).toBeNull();
    expect(state.settings.lastBackupAt).toBe(NOW.toISOString());
    expect(state.settings.tutorialCompletedAt).toBe('2026-01-02T00:00:00.000Z');
  });

  it('不正なバックアップでは状態を変更しない', () => {
    useAppStore.setState({ tasks: [makeTask()] });

    const result = useAppStore.getState().importAppState('not json');

    expect(result.ok).toBe(false);
    expect(useAppStore.getState().tasks[0]?.id).toBe('task-settings');
  });

  it('バックアップからサイドバーの並びと表示設定を復元する', () => {
    const source = initialAppState();
    const customNavigation: AppState['settings']['navigationItems'] = [
      { id: 'character', visible: true },
      { id: 'sortie', visible: true },
      { id: 'history', visible: false },
      { id: 'base', visible: true },
      { id: 'inventory', visible: true },
      { id: 'synthesis', visible: true },
    ];
    source.settings = {
      lastBackupAt: null,
      tutorialCompletedAt: null,
      navigationItems: customNavigation,
    };

    const result = useAppStore
      .getState()
      .importAppState(serializeBackup(source, NOW));

    expect(result.ok).toBe(true);
    expect(useAppStore.getState().settings.navigationItems).toEqual(customNavigation);
  });

  it('最終バックアップ日時を記録し、不正な日時は無視する', () => {
    useAppStore.getState().markBackupExported(NOW.toISOString());
    expect(useAppStore.getState().settings.lastBackupAt).toBe(NOW.toISOString());

    useAppStore.getState().markBackupExported('invalid');
    expect(useAppStore.getState().settings.lastBackupAt).toBe(NOW.toISOString());
  });

  it('チュートリアル完了日時を記録し、不正な日時は無視する', () => {
    useAppStore.getState().markTutorialCompleted(NOW.toISOString());
    expect(useAppStore.getState().settings.tutorialCompletedAt).toBe(
      NOW.toISOString(),
    );

    useAppStore.getState().markTutorialCompleted('invalid');
    expect(useAppStore.getState().settings.tutorialCompletedAt).toBe(
      NOW.toISOString(),
    );
  });

  it('リセットで設定も初期状態に戻す', () => {
    useAppStore.setState({
      tasks: [makeTask()],
      settings: {
        lastBackupAt: NOW.toISOString(),
        tutorialCompletedAt: NOW.toISOString(),
        navigationItems: createDefaultNavigationItems(),
      },
    });

    useAppStore.getState().resetAll();

    expect(useAppStore.getState().tasks).toEqual([]);
    expect(useAppStore.getState().settings).toEqual({
      lastBackupAt: null,
      tutorialCompletedAt: null,
      navigationItems: createDefaultNavigationItems(),
    });
  });

  it('サイドバー項目の表示切替と並べ替えを保存する', () => {
    const store = useAppStore.getState();

    store.setNavigationItemVisible('history', false);
    expect(
      useAppStore
        .getState()
        .settings.navigationItems.find((item) => item.id === 'history')?.visible,
    ).toBe(false);

    store.setNavigationItemVisible('sortie', false);
    expect(
      useAppStore
        .getState()
        .settings.navigationItems.find((item) => item.id === 'sortie')?.visible,
    ).toBe(true);

    store.moveNavigationItem('inventory', 'up');
    expect(
      useAppStore.getState().settings.navigationItems.map((item) => item.id),
    ).toEqual(['sortie', 'history', 'base', 'inventory', 'character', 'synthesis']);

    store.resetNavigationItems();
    expect(useAppStore.getState().settings.navigationItems).toEqual(
      createDefaultNavigationItems(),
    );
  });
});
