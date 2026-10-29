// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { initialAppState } from '../src/services/appState';
import { useAppStore } from '../src/stores/appStore';
import type { Inventory, Task } from '../src/types/index';

const TASK: Task = {
  id: 'task-1',
  title: 'テストタスク',
  description: '',
  category: '勉強',
  estimatedMinutes: 25,
  scheduledDate: '2026-10-19',
  status: 'planned',
  createdAt: '2026-10-19T00:00:00.000Z',
  updatedAt: '2026-10-19T00:00:00.000Z',
};

function resetStore(): void {
  window.localStorage.clear();
  useAppStore.setState({ ...initialAppState() });
}

describe('所持素材が欠けた保存データ', () => {
  beforeEach(resetStore);

  it('報酬加算時に素材が NaN にならない', () => {
    useAppStore.setState({
      tasks: [TASK],
      inventory: { currency: 0, materials: {} } as Inventory,
    });

    useAppStore.getState().startSession('task-1', 'd-hills', ['c-hinata']);
    const session = useAppStore.getState().activeSession;
    expect(session).not.toBeNull();
    useAppStore.setState({
      activeSession: { ...session!, accumulatedSeconds: 25 * 60 },
    });
    useAppStore.getState().finishSession('completed');

    const inventory = useAppStore.getState().inventory;
    expect(Number.isFinite(inventory.currency)).toBe(true);
    expect(Number.isFinite(inventory.materials.shard_sun)).toBe(true);
    expect(Number.isFinite(inventory.materials.shard_moon)).toBe(true);
    expect(Number.isFinite(inventory.materials.shard_star)).toBe(true);
    expect(inventory.materials.shard_sun).toBeGreaterThan(0);
  });
});
