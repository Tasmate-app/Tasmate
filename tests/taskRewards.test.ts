import { describe, expect, it, vi } from 'vitest';
import type { AIRewardEvaluation, Task } from '@tasmate/types';
import {
  createAppStore,
  initialAppState,
  pickRarity,
  rollTaskReward,
} from '../packages/core/src/index';

const TASK: Task = {
  id: 'task-reward',
  title: '数学の演習問題',
  description: '応用問題を10問解く',
  category: '勉強',
  subject: '数学',
  estimatedMinutes: 25,
  scheduledDate: '2026-11-09',
  status: 'planned',
  createdAt: '2026-11-09T00:00:00.000Z',
  updatedAt: '2026-11-09T00:00:00.000Z',
};

const EVALUATION: AIRewardEvaluation = {
  materialType: 'thought_crystal',
  difficulty: 3,
  confidence: 0.35,
  reason: 'テスト',
  source: 'fallback',
};

describe('結晶レアリティ抽選', () => {
  it('難易度1ではURが出ない', () => {
    expect(pickRarity(1, 0.99)).toBe('SR');
  });

  it('難易度5では高レアリティも出る', () => {
    expect(pickRarity(5, 0.99)).toBe('UR');
    expect(pickRarity(5, 0)).toBe('N');
  });
});

describe('タスク完了報酬', () => {
  it('星屑の端数を次回へ持ち越す', () => {
    const first = rollTaskReward({
      taskId: TASK.id,
      workSessionId: 'session-1',
      rewardRecordId: 'reward-1',
      task: TASK,
      actualMinutes: 25,
      coins: 100,
      completed: true,
      evaluation: EVALUATION,
      targetCharacterId: 'c-hinata',
      previousStardustCarry: 0,
      nowIso: '2026-11-09T01:00:00.000Z',
      random: () => 0,
    });
    expect(first.reward.stardust).toBe(2);
    expect(first.stardustCarry).toBe(5);
    expect(first.reward.crystals).toEqual([
      { itemId: 'thought_crystal_N', quantity: 1 },
    ]);
    expect(first.reward.materials).toEqual([{ itemId: 'sun_feather', quantity: 1 }]);

    const second = rollTaskReward({
      taskId: 'task-2',
      workSessionId: 'session-2',
      rewardRecordId: 'reward-2',
      task: TASK,
      actualMinutes: 6,
      coins: 0,
      completed: true,
      evaluation: EVALUATION,
      targetCharacterId: null,
      previousStardustCarry: first.stardustCarry,
      nowIso: '2026-11-09T02:00:00.000Z',
      random: () => 0.99,
    });
    expect(second.reward.stardust).toBe(1);
    expect(second.stardustCarry).toBeCloseTo(1);
    expect(second.reward.crystals).toEqual([]);
    expect(second.reward.materials).toEqual([]);
  });

  it('ストアで報酬を一度だけ反映する', () => {
    const initial = {
      ...initialAppState(),
      tasks: [TASK],
      activeSession: null,
    };
    const store = createAppStore({ initialState: initial });

    store.getState().startSession(TASK.id, 'd-hills', ['c-hinata']);
    store.setState((state) => ({
      activeSession:
        state.activeSession === null
          ? null
          : { ...state.activeSession, accumulatedSeconds: 25 * 60 },
    }));

    const rewardId = store.getState().finishSession('completed');
    const state = store.getState();
    expect(rewardId).not.toBeNull();
    expect(state.taskRewards).toHaveLength(1);
    expect(state.taskRewards[0].taskId).toBe(TASK.id);
    expect(state.stardustCarry).toBeGreaterThanOrEqual(0);
    expect(state.itemInventory['stardust']).toBe(state.taskRewards[0].stardust);
    expect(state.itemInventory['coin']).toBe(state.inventory.currency);
    expect(state.appliedRewardSessionIds).toHaveLength(1);
  });

  it('同じタスクの再挑戦ではドロップを再抽選せず、時間報酬だけ加算する', () => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(0);
    try {
      const initial = {
        ...initialAppState(),
        tasks: [TASK],
        activeSession: null,
      };
      const store = createAppStore({ initialState: initial });

      store.getState().startSession(TASK.id, 'd-hills', ['c-hinata']);
      store.setState((state) => ({
        activeSession:
          state.activeSession === null
            ? null
            : { ...state.activeSession, accumulatedSeconds: 25 * 60 },
      }));
      store.getState().finishSession('interrupted');
      const first = store.getState();
      const coinAfterFirst = first.itemInventory['coin'] ?? 0;
      expect(first.taskRewards[0].crystals).toHaveLength(1);
      expect(first.taskRewards[0].materials).toHaveLength(1);

      store.getState().startSession(TASK.id, 'd-hills', ['c-hinata']);
      store.setState((state) => ({
        activeSession:
          state.activeSession === null
            ? null
            : { ...state.activeSession, accumulatedSeconds: 25 * 60 },
      }));
      store.getState().finishSession('completed');
      const second = store.getState();

      expect(second.taskRewards).toHaveLength(2);
      expect(second.taskRewards[0].crystals).toEqual([]);
      expect(second.taskRewards[0].materials).toEqual([]);
      expect(second.taskRewards[0].stardust).toBe(3);
      expect(second.itemInventory['coin'] ?? 0).toBeGreaterThan(coinAfterFirst);
      expect(second.itemInventory['thought_crystal_N'] ?? 0).toBe(1);
      expect(second.itemInventory['sun_feather'] ?? 0).toBe(1);
    } finally {
      random.mockRestore();
    }
  });
});
