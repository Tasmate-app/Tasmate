import { describe, expect, it } from 'vitest';
import type { Task } from '@tasmate/types';
import {
  createAppStore,
  initialAppState,
  normalizeAppState,
} from '../packages/core/src/index';

const TASK: Task = {
  id: 'task-level-up',
  title: 'レベルアップ確認タスク',
  description: '',
  category: '勉強',
  estimatedMinutes: 60,
  scheduledDate: '2026-11-11',
  status: 'planned',
  createdAt: '2026-11-11T00:00:00.000Z',
  updatedAt: '2026-11-11T00:00:00.000Z',
};

function findCharacter(
  store: ReturnType<typeof createAppStore>,
  definitionId: string,
) {
  return store.getState().characters.find((c) => c.definitionId === definitionId);
}

describe('経験値による自動レベルアップ', () => {
  it('タスク完了で閾値に達すると自動でレベルが上がる', () => {
    const store = createAppStore({
      initialState: { ...initialAppState(), tasks: [TASK] },
    });
    store.getState().startSession(TASK.id, 'd-hills', ['c-hinata']);
    store.setState((state) => ({
      activeSession:
        state.activeSession === null
          ? null
          : { ...state.activeSession, accumulatedSeconds: 60 * 60 },
    }));

    store.getState().finishSession('completed');

    const character = findCharacter(store, 'c-hinata');
    expect(character?.level).toBe(3);
    expect(character?.experience).toBeLessThan(300);
  });

  it('保存データの未処理経験値を読み込み時に自動レベルアップへ反映する', () => {
    const state = {
      ...initialAppState(),
      characters: [{ definitionId: 'c-hinata', level: 1, experience: 350 }],
    };
    const normalized = normalizeAppState(state);
    expect(normalized.characters[0]).toMatchObject({ level: 3, experience: 50 });
  });
});

describe('素材による手動レベルアップ', () => {
  it('経験値なしでも硬貨と星屑を消費してレベルが上がる', () => {
    const store = createAppStore({
      initialState: {
        ...initialAppState(),
        itemInventory: { coin: 100, stardust: 1 },
      },
    });

    expect(store.getState().levelUpCharacter('c-hinata')).toBe(true);

    const character = findCharacter(store, 'c-hinata');
    expect(character).toMatchObject({ level: 2, experience: 0 });
    expect(store.getState().itemInventory).toEqual({ coin: 50 });
  });

  it('素材が足りなければレベルは上がらない', () => {
    const store = createAppStore({
      initialState: {
        ...initialAppState(),
        itemInventory: { coin: 100 },
      },
    });

    expect(store.getState().levelUpCharacter('c-hinata')).toBe(false);
    expect(findCharacter(store, 'c-hinata')).toMatchObject({ level: 1, experience: 0 });
  });
});
